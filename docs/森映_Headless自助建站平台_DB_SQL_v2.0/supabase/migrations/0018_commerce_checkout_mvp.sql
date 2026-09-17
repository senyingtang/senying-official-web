-- =====================================================================
-- 0018_commerce_checkout_mvp.sql（Phase 3.0）
--
-- 目的：補齊「加入購物車 → 結帳 → 建立訂單 → Sandbox 付款 → 發放權限」所需的最小資料與伺服器端邏輯。
-- 沿用 0003 既有的 commerce_products / prices / orders / order_items / payments / webhook_events /
-- checkout_sessions，以及 0012 的 mark_payment_success_and_issue_entitlement（冪等發碼）。
--
--   1. payment_provider / payment_method_type 新增 'sandbox'（本機模擬付款，絕不是真實金流）
--   2. commerce_carts / commerce_cart_items（0003 沒有購物車；checkout_sessions 需要 email，無法承載訪客購物車）
--   3. 購物車與下單一律走 SECURITY DEFINER RPC：瀏覽器拿不到 cart / order 資料表的直接寫入權限，
--      價格、小計、總計全部由資料庫重新計算，client 傳來的金額一律忽略
--   4. get_enabled_payment_methods 擴充 sandbox provider
--   5. seed：sandbox provider / payment method、SEO 與 LP 的「測試價格（非正式售價）」、購物車捷徑開啟
--
-- 安全：
--   * 訪客購物車 token 只存 sha256（瀏覽器持有明文）
--   * 付款成功只能由 service role 經 mark_payment_success_and_issue_entitlement 完成
--   * commerce.live_payments 維持 false；本檔不含任何正式金流密鑰
-- =====================================================================

-- enum 新增值必須在自己的 transaction 完成後才能使用，因此放在 begin 之前
alter type public.payment_provider add value if not exists 'sandbox';
alter type public.payment_method_type add value if not exists 'sandbox';

begin;

-- ---------------------------------------------------------------------
-- 1. 購物車
-- ---------------------------------------------------------------------
create table if not exists public.commerce_carts(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  -- 訪客購物車：瀏覽器持有明文 token，資料庫只存 sha256
  session_token_hash text check (session_token_hash is null or session_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'open' check (status in ('open','converted','abandoned','expired')),
  currency char(3) not null default 'TWD' check (currency ~ '^[A-Z]{3}$'),
  converted_order_id uuid references public.commerce_orders(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_token_hash is not null),
  check (status <> 'converted' or converted_order_id is not null)
);
create unique index if not exists uq_commerce_carts_open_session on public.commerce_carts(session_token_hash)
  where status = 'open' and session_token_hash is not null;
create unique index if not exists uq_commerce_carts_open_user on public.commerce_carts(user_id)
  where status = 'open' and user_id is not null;
create index if not exists idx_commerce_carts_user on public.commerce_carts(user_id);
create index if not exists idx_commerce_carts_converted_order on public.commerce_carts(converted_order_id);
create index if not exists idx_commerce_carts_expires on public.commerce_carts(expires_at);

create table if not exists public.commerce_cart_items(
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.commerce_carts(id) on delete cascade,
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  -- 購物車不保存單價：結帳時一律重新從 commerce_product_prices 取得，client 無法竄改金額
  price_id uuid not null references public.commerce_product_prices(id) on delete cascade,
  quantity int not null default 1 check (quantity between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cart_id, price_id)
);
create index if not exists idx_commerce_cart_items_cart on public.commerce_cart_items(cart_id);
create index if not exists idx_commerce_cart_items_product on public.commerce_cart_items(product_id);
create index if not exists idx_commerce_cart_items_price on public.commerce_cart_items(price_id);

drop trigger if exists trg_commerce_carts_updated_at on public.commerce_carts;
create trigger trg_commerce_carts_updated_at before update on public.commerce_carts
  for each row execute function public.set_updated_at();
drop trigger if exists trg_commerce_cart_items_updated_at on public.commerce_cart_items;
create trigger trg_commerce_cart_items_updated_at before update on public.commerce_cart_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. RLS：購物車只能經 RPC 操作
--    anon 沒有任何 policy（deny by default）；登入使用者只能讀自己的購物車；owner / admin 可管理
-- ---------------------------------------------------------------------
alter table public.commerce_carts enable row level security;
alter table public.commerce_cart_items enable row level security;

drop policy if exists carts_own_read on public.commerce_carts;
create policy carts_own_read on public.commerce_carts for select to authenticated using (user_id = auth.uid());
drop policy if exists carts_admin_manage on public.commerce_carts;
create policy carts_admin_manage on public.commerce_carts for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists cart_items_own_read on public.commerce_cart_items;
create policy cart_items_own_read on public.commerce_cart_items for select to authenticated
  using (exists (select 1 from public.commerce_carts c where c.id = cart_id and c.user_id = auth.uid()));
drop policy if exists cart_items_admin_manage on public.commerce_cart_items;
create policy cart_items_admin_manage on public.commerce_cart_items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. 共用小工具
-- ---------------------------------------------------------------------
create or replace function public.commerce_cart_token_hash(p_token text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select case when p_token is null or length(btrim(p_token)) < 20 then null
              else encode(sha256(convert_to(btrim(p_token), 'UTF8')), 'hex') end
$$;

/** 商品是否可自助購買（前台加入購物車的唯一判準） */
create or replace function public.commerce_product_is_purchasable(p_product public.commerce_products) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select p_product.is_visible
     and p_product.is_self_serve
     and not p_product.requires_quote
     and public.is_publicly_visible(p_product.status, p_product.published_at, null)
$$;

/** 價格是否可用於結帳（目前只開放一次性付款；訂閱待 recurring provider 上線） */
create or replace function public.commerce_price_is_purchasable(p_price public.commerce_product_prices) returns boolean
language sql stable set search_path = public, pg_temp as $$
  select p_price.is_active
     and p_price.amount_cents > 0
     and p_price.billing_interval = 'one_time'
     and (p_price.starts_at is null or p_price.starts_at <= now())
     and (p_price.ends_at is null or p_price.ends_at > now())
$$;

-- ---------------------------------------------------------------------
-- 4. 購物車 RPC
-- ---------------------------------------------------------------------

/** 解析（必要時建立）目前購物車。登入者優先使用自己的購物車；已登入時會認領訪客購物車。 */
create or replace function public._commerce_resolve_cart(p_cart_token text, p_create boolean default false) returns public.commerce_carts
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_hash text := public.commerce_cart_token_hash(p_cart_token);
  v_cart public.commerce_carts;
  v_guest public.commerce_carts;
begin
  if v_uid is null and v_hash is null then
    raise exception 'cart token is required' using errcode = '22023';
  end if;

  if v_uid is not null then
    select * into v_cart from public.commerce_carts c
    where c.user_id = v_uid and c.status = 'open' and c.expires_at > now() for update;
  end if;

  if v_cart.id is null and v_hash is not null then
    select * into v_guest from public.commerce_carts c
    where c.session_token_hash = v_hash and c.status = 'open' and c.expires_at > now() for update;
    if found then
      -- 登入後認領訪客購物車（Phase 3.0 不做複雜合併：登入者沒有購物車時直接接手）
      if v_uid is not null then
        update public.commerce_carts set user_id = v_uid where id = v_guest.id returning * into v_guest;
      end if;
      v_cart := v_guest;
    end if;
  end if;

  if v_cart.id is null and p_create then
    insert into public.commerce_carts(user_id, session_token_hash)
    values (v_uid, case when v_uid is null then v_hash else v_hash end)
    returning * into v_cart;
  end if;

  return v_cart;
end $$;

/** 購物車內容（單價一律即時從 commerce_product_prices 讀取） */
create or replace function public._commerce_cart_state(p_cart public.commerce_carts) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with items as (
    select ci.id, ci.quantity, ci.created_at,
           p.id as product_id, p.sku::text as sku, p.slug::text as product_slug, p.name as product_name,
           p.product_code::text as product_code,
           pr.id as price_id, pr.price_key::text as price_key, pr.name as price_name,
           pr.currency, pr.amount_cents, pr.billing_interval::text as billing_interval,
           (pr.metadata ->> 'test_price')::boolean as is_test_price,
           public.commerce_product_is_purchasable(p) and public.commerce_price_is_purchasable(pr) as is_available
    from public.commerce_cart_items ci
    join public.commerce_products p on p.id = ci.product_id
    join public.commerce_product_prices pr on pr.id = ci.price_id
    where ci.cart_id = p_cart.id
  )
  select jsonb_build_object(
    'cart_id', p_cart.id,
    'status', p_cart.status,
    'currency', p_cart.currency,
    'item_count', coalesce((select sum(quantity) from items where is_available), 0),
    'line_count', coalesce((select count(*) from items), 0),
    'subtotal_cents', coalesce((select sum(amount_cents * quantity) from items where is_available), 0),
    'has_test_price', coalesce((select bool_or(coalesce(is_test_price, false)) from items), false),
    'has_unavailable_item', coalesce((select bool_or(not is_available) from items), false),
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'item_id', id, 'product_id', product_id, 'product_slug', product_slug, 'product_name', product_name,
        'product_code', product_code, 'sku', sku,
        'price_id', price_id, 'price_key', price_key, 'price_name', price_name,
        'billing_interval', billing_interval, 'currency', currency,
        'unit_amount_cents', amount_cents, 'quantity', quantity,
        'line_total_cents', amount_cents * quantity,
        'is_test_price', coalesce(is_test_price, false), 'is_available', is_available
      ) order by created_at, product_name) from items), '[]'::jsonb)
  )
$$;

create or replace function public.commerce_cart_get(p_cart_token text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_cart public.commerce_carts;
begin
  v_cart := public._commerce_resolve_cart(p_cart_token, false);
  if v_cart.id is null then
    return jsonb_build_object('cart_id', null, 'status', 'open', 'currency', 'TWD', 'item_count', 0, 'line_count', 0,
      'subtotal_cents', 0, 'has_test_price', false, 'has_unavailable_item', false, 'items', '[]'::jsonb);
  end if;
  return public._commerce_cart_state(v_cart);
end $$;

create or replace function public.commerce_cart_add_item(p_cart_token text, p_price_id uuid, p_quantity int default 1) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_cart public.commerce_carts;
  v_price public.commerce_product_prices;
  v_product public.commerce_products;
  v_qty int := coalesce(p_quantity, 1);
  v_existing public.commerce_cart_items;
begin
  if v_qty < 1 or v_qty > 100 then
    raise exception 'quantity must be between 1 and 100' using errcode = '22023';
  end if;

  select * into v_price from public.commerce_product_prices where id = p_price_id;
  if not found then
    raise exception 'price not found' using errcode = 'P0002';
  end if;
  select * into v_product from public.commerce_products where id = v_price.product_id;
  if not public.commerce_product_is_purchasable(v_product) then
    raise exception 'product is not available for self-service purchase' using errcode = '22023';
  end if;
  if not public.commerce_price_is_purchasable(v_price) then
    raise exception 'price is not available' using errcode = '22023';
  end if;

  v_cart := public._commerce_resolve_cart(p_cart_token, true);
  if v_cart.currency <> v_price.currency then
    raise exception 'cart currency % does not match price currency %', v_cart.currency, v_price.currency using errcode = '22023';
  end if;
  if (select count(*) from public.commerce_cart_items where cart_id = v_cart.id) >= 20 then
    raise exception 'cart line limit reached' using errcode = '22023';
  end if;

  select * into v_existing from public.commerce_cart_items where cart_id = v_cart.id and price_id = v_price.id for update;
  if found then
    update public.commerce_cart_items set quantity = least(v_existing.quantity + v_qty, 100) where id = v_existing.id;
  else
    insert into public.commerce_cart_items(cart_id, product_id, price_id, quantity)
    values (v_cart.id, v_product.id, v_price.id, v_qty);
  end if;

  update public.commerce_carts set updated_at = now() where id = v_cart.id returning * into v_cart;
  return public._commerce_cart_state(v_cart);
end $$;

/** 設定數量；0 代表移除。 */
create or replace function public.commerce_cart_set_quantity(p_cart_token text, p_item_id uuid, p_quantity int) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_cart public.commerce_carts; v_qty int := coalesce(p_quantity, 0);
begin
  if v_qty < 0 or v_qty > 100 then
    raise exception 'quantity must be between 0 and 100' using errcode = '22023';
  end if;
  v_cart := public._commerce_resolve_cart(p_cart_token, false);
  if v_cart.id is null then
    raise exception 'cart not found' using errcode = 'P0002';
  end if;
  if v_qty = 0 then
    delete from public.commerce_cart_items where id = p_item_id and cart_id = v_cart.id;
  else
    update public.commerce_cart_items set quantity = v_qty where id = p_item_id and cart_id = v_cart.id;
  end if;
  update public.commerce_carts set updated_at = now() where id = v_cart.id returning * into v_cart;
  return public._commerce_cart_state(v_cart);
end $$;

create or replace function public.commerce_cart_clear(p_cart_token text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_cart public.commerce_carts;
begin
  v_cart := public._commerce_resolve_cart(p_cart_token, false);
  if v_cart.id is null then
    return public.commerce_cart_get(p_cart_token);
  end if;
  delete from public.commerce_cart_items where cart_id = v_cart.id;
  update public.commerce_carts set updated_at = now() where id = v_cart.id returning * into v_cart;
  return public._commerce_cart_state(v_cart);
end $$;

-- ---------------------------------------------------------------------
-- 5. 建立訂單（伺服器端重算金額）
-- ---------------------------------------------------------------------
create or replace function public.create_order_from_cart(
  p_cart_token text,
  p_buyer jsonb,
  p_payment_method_key text
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_cart public.commerce_carts;
  v_item record;
  v_method public.commerce_payment_methods;
  v_config public.commerce_payment_provider_configs;
  v_order public.commerce_orders;
  v_order_item public.commerce_order_items;
  v_payment public.commerce_payments;
  v_subtotal bigint := 0;
  v_line_count int := 0;
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_email text := lower(btrim(coalesce(p_buyer ->> 'email', '')));
  v_name text := btrim(coalesce(p_buyer ->> 'name', ''));
  v_phone text := nullif(btrim(coalesce(p_buyer ->> 'phone', '')), '');
  v_company text := nullif(btrim(coalesce(p_buyer ->> 'company', '')), '');
  v_tax_id text := nullif(btrim(coalesce(p_buyer ->> 'tax_id', '')), '');
  v_note text := nullif(btrim(coalesce(p_buyer ->> 'note', '')), '');
  v_session_id uuid;
  v_trade_no text;
begin
  -- 買家資料驗證（client 傳來的金額一律忽略，只接受聯絡資料）
  if coalesce((p_buyer ->> 'consent')::boolean, false) is not true then
    raise exception 'privacy consent is required' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 254 then
    raise exception 'a valid email is required' using errcode = '22023';
  end if;
  if length(v_name) < 1 or length(v_name) > 120 then
    raise exception 'buyer name is required' using errcode = '22023';
  end if;
  if v_tax_id is not null and v_tax_id !~ '^[0-9]{8}$' then
    raise exception 'tax id must be 8 digits' using errcode = '22023';
  end if;
  if v_phone is not null and length(v_phone) > 40 then
    raise exception 'phone is too long' using errcode = '22023';
  end if;
  if v_note is not null and length(v_note) > 1000 then
    raise exception 'note is too long' using errcode = '22023';
  end if;

  v_cart := public._commerce_resolve_cart(p_cart_token, false);
  if v_cart.id is null then
    raise exception 'cart not found' using errcode = 'P0002';
  end if;
  if v_cart.status <> 'open' then
    raise exception 'cart is no longer open' using errcode = '22023';
  end if;

  -- 付款方式：必須是啟用中的方式，且對應 provider 設定已啟用
  select * into v_method from public.commerce_payment_methods m where m.method_key = p_payment_method_key::citext and m.is_enabled;
  if not found then
    raise exception 'payment method is not available' using errcode = '22023';
  end if;
  if not v_method.supports_one_time then
    raise exception 'payment method does not support one-time payments' using errcode = '22023';
  end if;
  select * into v_config from public.commerce_payment_provider_configs c
  where c.provider = v_method.provider and c.is_enabled
    and (v_method.provider_config_id is null or c.id = v_method.provider_config_id);
  if not found then
    raise exception 'payment provider is not configured' using errcode = '22023';
  end if;
  -- 正式付款未開啟時只允許 sandbox 環境
  if v_config.environment = 'production' and not public.platform_feature_enabled('commerce.live_payments') then
    raise exception 'live payments are disabled' using errcode = '22023';
  end if;

  -- 建立訂單（金額稍後以伺服器端計算結果更新）
  insert into public.commerce_orders(
    customer_user_id, source, status, currency, subtotal_cents, discount_cents, tax_cents, total_cents,
    payment_method_id, buyer_name, buyer_email, buyer_phone, buyer_company, buyer_tax_id, admin_note, created_by, metadata)
  values (v_uid, 'checkout', 'pending', v_cart.currency, 0, 0, 0, 0,
    v_method.id, v_name, v_email, v_phone, v_company, v_tax_id, v_note, v_uid,
    jsonb_build_object('cart_id', v_cart.id))
  returning * into v_order;

  -- 逐項重新讀取商品與價格：購物車沒有保存單價，client 也無法影響金額
  for v_item in
    select ci.quantity, p.*, pr.id as price_id, pr.price_key, pr.name as price_name, pr.currency as price_currency,
           pr.amount_cents, pr.billing_interval, pr.interval_count, pr.metadata as price_metadata,
           public.commerce_product_is_purchasable(p) as product_ok, public.commerce_price_is_purchasable(pr) as price_ok
    from public.commerce_cart_items ci
    join public.commerce_products p on p.id = ci.product_id
    join public.commerce_product_prices pr on pr.id = ci.price_id
    where ci.cart_id = v_cart.id
    order by ci.created_at, ci.id
  loop
    if not v_item.product_ok or not v_item.price_ok then
      raise exception 'cart contains an item that is no longer available (%)', v_item.sku using errcode = '22023';
    end if;
    if v_item.price_currency <> v_order.currency then
      raise exception 'cart contains mixed currencies' using errcode = '22023';
    end if;

    insert into public.commerce_order_items(
      order_id, product_id, product_price_id, product_code, sku, product_name,
      billing_interval, interval_count, quantity, unit_amount_cents, discount_cents, total_cents,
      entitlement_product_id, metadata)
    values (v_order.id, v_item.id, v_item.price_id, v_item.product_code, v_item.sku, v_item.name,
      v_item.billing_interval, v_item.interval_count, v_item.quantity, v_item.amount_cents, 0,
      v_item.amount_cents * v_item.quantity, v_item.entitlement_product_id,
      jsonb_build_object('price_key', v_item.price_key, 'price_name', v_item.price_name,
                         'test_price', coalesce((v_item.price_metadata ->> 'test_price')::boolean, false)))
    returning * into v_order_item;

    v_subtotal := v_subtotal + v_order_item.total_cents;
    v_line_count := v_line_count + 1;
  end loop;

  if v_line_count = 0 then
    raise exception 'cart is empty' using errcode = '22023';
  end if;

  update public.commerce_orders o
  set subtotal_cents = v_subtotal, discount_cents = 0, tax_cents = 0, total_cents = v_subtotal,
      status = 'awaiting_payment', expires_at = now() + interval '1 day'
  where o.id = v_order.id
  returning * into v_order;

  -- 收據 token：只存 sha256，明文只在本次回傳給下單的瀏覽器
  insert into public.commerce_checkout_sessions(
    public_token_hash, customer_user_id, status, customer_email, customer_name, customer_phone, company_name, tax_id,
    line_items, selected_payment_method_id, currency, subtotal_cents, discount_cents, total_cents,
    success_path, cancel_path, order_id, expires_at)
  values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_uid, 'open', v_email, v_name, v_phone, v_company, v_tax_id,
    (select coalesce(jsonb_agg(jsonb_build_object('price_id', oi.product_price_id, 'quantity', oi.quantity)), '[]'::jsonb)
       from public.commerce_order_items oi where oi.order_id = v_order.id),
    v_method.id, v_order.currency, v_subtotal, 0, v_subtotal,
    '/checkout/success', '/checkout/failed', v_order.id, now() + interval '30 days')
  returning id into v_session_id;

  -- 付款單（pending）：真正的成功只能由 service role 經 mark_payment_success_and_issue_entitlement 完成
  v_trade_no := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 17));
  insert into public.commerce_payments(
    order_id, payment_method_id, provider, method_type, environment, status, amount_cents, currency,
    merchant_trade_no, payment_deadline_at, created_by, request_payload_sanitized)
  values (v_order.id, v_method.id, v_method.provider, v_method.method_type, v_config.environment, 'pending',
    v_order.total_cents, v_order.currency, 'SB' || v_trade_no,
    now() + make_interval(mins => coalesce(v_method.payment_deadline_minutes, 60)), v_uid,
    jsonb_build_object('method_key', v_method.method_key, 'order_number', v_order.order_number))
  returning * into v_payment;

  update public.commerce_carts set status = 'converted', converted_order_id = v_order.id where id = v_cart.id;

  perform public.write_audit_log('commerce.order.created', 'commerce_orders', v_order.id, null,
    jsonb_build_object('order_number', v_order.order_number, 'line_count', v_line_count,
                       'amount_cents', v_order.total_cents, 'currency', v_order.currency),
    null, case when v_uid is null then 'system' else 'customer' end);
  perform public.write_audit_log('commerce.payment.created', 'commerce_payments', v_payment.id, null,
    jsonb_build_object('order_id', v_order.id, 'provider', v_payment.provider, 'amount_cents', v_payment.amount_cents,
                       'currency', v_payment.currency, 'environment', v_payment.environment),
    null, case when v_uid is null then 'system' else 'customer' end);

  return jsonb_build_object(
    'ok', true,
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'public_token', v_token,
    'checkout_session_id', v_session_id,
    'currency', v_order.currency,
    'subtotal_cents', v_order.subtotal_cents,
    'total_cents', v_order.total_cents,
    'payment_id', v_payment.id,
    'payment_provider', v_payment.provider,
    'payment_environment', v_payment.environment,
    'merchant_trade_no', v_payment.merchant_trade_no
  );
end $$;

-- ---------------------------------------------------------------------
-- 6. 收據（成功 / 失敗頁）：以 unguessable token 查詢，不用流水號
-- ---------------------------------------------------------------------
create or replace function public.get_order_receipt(p_public_token text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_session public.commerce_checkout_sessions;
  v_order public.commerce_orders;
  v_payment public.commerce_payments;
begin
  if p_public_token is null or length(btrim(p_public_token)) < 32 then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;
  select * into v_session from public.commerce_checkout_sessions s
  where s.public_token_hash = encode(sha256(convert_to(btrim(p_public_token), 'UTF8')), 'hex');
  if not found or v_session.order_id is null or v_session.expires_at <= now() then
    return jsonb_build_object('ok', false, 'result', 'not_found');
  end if;
  select * into v_order from public.commerce_orders where id = v_session.order_id;
  select * into v_payment from public.commerce_payments p where p.order_id = v_order.id order by p.created_at desc limit 1;

  return jsonb_build_object(
    'ok', true,
    'order_number', v_order.order_number,
    'status', v_order.status,
    'currency', v_order.currency,
    'subtotal_cents', v_order.subtotal_cents,
    'total_cents', v_order.total_cents,
    'buyer_name', v_order.buyer_name,
    'buyer_email', v_order.buyer_email,
    'created_at', v_order.created_at,
    'paid_at', v_order.paid_at,
    'payment', case when v_payment.id is null then null else jsonb_build_object(
      'status', v_payment.status, 'provider', v_payment.provider, 'environment', v_payment.environment,
      'failure_message', v_payment.failure_message, 'payment_id', v_payment.id) end,
    'items', coalesce((select jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name, 'sku', oi.sku, 'quantity', oi.quantity,
        'unit_amount_cents', oi.unit_amount_cents, 'line_total_cents', oi.total_cents,
        'test_price', coalesce((oi.metadata ->> 'test_price')::boolean, false)) order by oi.created_at)
      from public.commerce_order_items oi where oi.order_id = v_order.id), '[]'::jsonb),
    -- 權限代碼只在付款完成後回傳；代碼不會出現在網址上
    'access_codes', case when v_order.status in ('paid','fulfilled') then
        coalesce((select jsonb_agg(jsonb_build_object('code', a.code, 'product_code', a.product_code, 'status', a.status,
                                                      'expires_at', a.expires_at) order by a.created_at)
                  from public.access_codes a where a.order_id = v_order.id), '[]'::jsonb)
      else '[]'::jsonb end
  );
end $$;

-- ---------------------------------------------------------------------
-- 7. 擴充既有的公開付款方式查詢（加入 sandbox provider）
-- ---------------------------------------------------------------------
create or replace function public.get_enabled_payment_methods() returns table(
  method_key text, provider public.payment_provider, method_type public.payment_method_type, display_name text, description text,
  supports_one_time boolean, supports_recurring boolean, supported_intervals public.billing_interval[],
  min_amount_cents bigint, max_amount_cents bigint, public_settings jsonb, sort_order int
)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.method_key::text, m.provider, m.method_type, m.display_name, m.description,
         m.supports_one_time, m.supports_recurring, m.supported_intervals,
         m.min_amount_cents, m.max_amount_cents, m.public_settings, m.sort_order
  from public.commerce_payment_methods m
  where m.is_enabled
    and (
      (m.provider = 'bank_transfer' and exists (select 1 from public.commerce_bank_transfer_accounts b where b.is_enabled))
      or (m.provider in ('ecpay','linepay','sandbox') and exists (
            select 1 from public.commerce_payment_provider_configs c
            where c.provider = m.provider and c.is_enabled and (m.provider_config_id is null or c.id = m.provider_config_id)))
    )
  order by m.sort_order, m.method_key
$$;

/** 前台商品目錄（含可購買價格）；未發布或需報價的商品不會出現 */
create or replace function public.get_purchasable_products() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(item order by sort_order, name), '[]'::jsonb) from (
    select p.sort_order, p.name,
      jsonb_build_object(
        'product_id', p.id, 'sku', p.sku::text, 'slug', p.slug::text, 'name', p.name,
        'product_code', p.product_code::text, 'short_description', p.short_description,
        'prices', coalesce((select jsonb_agg(jsonb_build_object(
              'price_id', pr.id, 'price_key', pr.price_key::text, 'name', pr.name,
              'currency', pr.currency, 'amount_cents', pr.amount_cents,
              'billing_interval', pr.billing_interval::text, 'is_default', pr.is_default,
              'test_price', coalesce((pr.metadata ->> 'test_price')::boolean, false)) order by pr.is_default desc, pr.amount_cents)
            from public.commerce_product_prices pr
            where pr.product_id = p.id and public.commerce_price_is_purchasable(pr)), '[]'::jsonb)
      ) as item
    from public.commerce_products p
    where public.commerce_product_is_purchasable(p)
      and exists (select 1 from public.commerce_product_prices pr where pr.product_id = p.id and public.commerce_price_is_purchasable(pr))
  ) s
$$;

-- ---------------------------------------------------------------------
-- 8. 權限：deny by default（0012 的政策），只開放必要的 RPC
-- ---------------------------------------------------------------------
do $$
declare f record;
  v_public text[] := array['commerce_cart_token_hash','commerce_product_is_purchasable','commerce_price_is_purchasable',
    'commerce_cart_get','commerce_cart_add_item','commerce_cart_set_quantity','commerce_cart_clear',
    'create_order_from_cart','get_order_receipt','get_purchasable_products','get_enabled_payment_methods'];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and p.proname in (
        'commerce_cart_token_hash','commerce_product_is_purchasable','commerce_price_is_purchasable',
        '_commerce_resolve_cart','_commerce_cart_state','commerce_cart_get','commerce_cart_add_item',
        'commerce_cart_set_quantity','commerce_cart_clear','create_order_from_cart','get_order_receipt',
        'get_purchasable_products','get_enabled_payment_methods')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if f.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9. Seed：Sandbox 付款（本機模擬，不是真實金流）
-- ---------------------------------------------------------------------
insert into public.commerce_payment_provider_configs(provider, environment, is_enabled, display_name, api_base_url, public_config, secret_refs, config_schema)
values ('sandbox', 'sandbox', true, '本機 Sandbox 付款（模擬）', null,
  '{"simulate_path":"/api/payments/sandbox","notify_path":"/api/payments/webhook/sandbox","success_path":"/checkout/success","failed_path":"/checkout/failed"}',
  '{"callback_secret":"env:PAYMENT_SANDBOX_SECRET"}',
  '[{"key":"simulate_path","label":"模擬付款頁路徑","type":"path","required":true,"is_sensitive":false},
    {"key":"notify_path","label":"付款結果通知路徑","type":"path","required":true,"is_sensitive":false},
    {"key":"callback_secret","label":"Callback 簽章密鑰（env 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true}]')
on conflict (provider, environment) do update
  set is_enabled = excluded.is_enabled, display_name = excluded.display_name,
      public_config = excluded.public_config, secret_refs = excluded.secret_refs, config_schema = excluded.config_schema;

insert into public.commerce_payment_methods(method_key, provider, method_type, provider_config_id, display_name, description, is_enabled,
  supports_one_time, supports_recurring, supported_intervals, payment_deadline_minutes, provider_method_code, config_schema, public_settings, sort_order)
select 'sandbox_checkout', 'sandbox', 'sandbox', c.id, '本機 Sandbox 付款（模擬）',
  '本機驗收用的模擬付款：不會向任何金流機構請款，也不會真的扣款。', true, true, false,
  array['one_time']::public.billing_interval[], 60, 'sandbox', '[]'::jsonb,
  '{"is_simulation":true,"notice":"本機 Sandbox 付款，不是真實交易"}'::jsonb, 5
from public.commerce_payment_provider_configs c
where c.provider = 'sandbox' and c.environment = 'sandbox'
on conflict (method_key) do update
  set is_enabled = excluded.is_enabled, display_name = excluded.display_name, description = excluded.description,
      public_settings = excluded.public_settings, provider_config_id = excluded.provider_config_id;

-- ---------------------------------------------------------------------
-- 10. Seed：測試價格（非正式售價）
--     正式售價尚未確認 —— 這裡只開兩個自助商品的「測試價格」供 sandbox 驗收使用，
--     price name 與 metadata 都明確標示，前台必須一併顯示「測試價格 · 非正式售價」。
--     commerce.live_payments 維持 false，正式付款不會因此開啟。
-- ---------------------------------------------------------------------
update public.commerce_products p
set status = 'published', published_at = coalesce(p.published_at, now()), is_visible = true,
    metadata = p.metadata || jsonb_build_object('price_tbd', true, 'sandbox_test_pricing', true)
where p.sku in ('seo-website-plan', 'landing-page-plan');

update public.commerce_product_prices pr
set amount_cents = x.amount_cents, is_active = true, name = '測試價格（非正式售價）',
    metadata = pr.metadata || jsonb_build_object('test_price', true, 'official_pricing_confirmed', false,
                                                 'note', 'Phase 3.0 sandbox 驗收用測試價格，非正式售價')
from (values ('seo_website_one_time', 100000::bigint), ('landing_page_one_time', 50000::bigint)) as x(price_key, amount_cents)
where pr.price_key = x.price_key::citext;

-- 購物車捷徑：已有可自助購買的商品，前台浮動快捷列顯示購物車
update public.cms_site_settings
set setting_value = jsonb_set(jsonb_set(setting_value, '{cart,enabled}', 'true'::jsonb, true), '{cart,href}', '"/cart"'::jsonb, true)
where setting_key = 'site.floating_actions';

-- Feature flags：結帳流程開放（只到本機 sandbox 模擬付款），正式付款 commerce.live_payments 維持 false。
-- 這兩個旗標必須分開：checkout_enabled 只代表「可以建立訂單」，不代表「可以真的收款」。
update public.cms_site_settings
set setting_value = jsonb_set(setting_value, '{commerce.checkout_enabled}', 'true'::jsonb, true)
where setting_key = 'platform.feature_flags'
  and coalesce((setting_value ->> 'commerce.live_payments')::boolean, false) = false;

commit;
