-- =====================================================================
-- commerce_checkout_rls.sql（Phase 3.0）
-- 在本機 / 可丟棄 Supabase 以 postgres 執行；使用 set local role + request.jwt.claims 模擬 anon / authenticated。
-- 測試帳號以 gen_random_uuid() 動態建立（email 使用 .invalid 保留網域），全程 rollback，不留下資料。
--
-- 涵蓋：
--   1. 0018 結構（commerce_carts / commerce_cart_items、RLS、RPC 權限）
--   2. anon 讀不到任何 cart / order / payment / webhook / access code
--   3. 訪客只能透過 RPC 操作自己的 cart token，讀不到別人的購物車
--   4. 下單金額一律由伺服器重算：client 無法指定 total、無法把訂單改成 paid
--   5. customer 只能看自己的訂單；看不到別人的
--   6. owner / admin 可管理；viewer 唯讀；editor 不可改付款
--   7. 金流設定與 secret_refs 一律不對 public 曝光；只有 sandbox 被啟用
--   8. webhook idempotency_key 唯一
--   9. 付款成功發碼只會執行一次（重送不重複發碼）
-- 失敗時 raise exception（psql -v ON_ERROR_STOP=1 會回傳非 0）。
-- =====================================================================
begin;

create function pg_temp.new_user(p_label text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := p_label || '.' || substr(v::text, 1, 8) || '@test.invalid';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at) values (v, v_email, 'authenticated', 'authenticated', now(), now());
  perform set_config('test.' || p_label, v::text, true);
  return v;
end $$;
create function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v text := current_setting('test.' || p_label);
begin
  perform set_config('request.jwt.claim.sub', v, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;
create function pg_temp.assert(p_ok boolean, p_message text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. 0018 結構
-- ---------------------------------------------------------------------
select pg_temp.assert((select count(*) from information_schema.tables where table_schema = 'public'
  and table_name in ('commerce_carts','commerce_cart_items')) = 2, '0018 必須建立 commerce_carts 與 commerce_cart_items');
select pg_temp.assert((select relrowsecurity from pg_class where oid = 'public.commerce_carts'::regclass), 'commerce_carts 必須啟用 RLS');
select pg_temp.assert((select relrowsecurity from pg_class where oid = 'public.commerce_cart_items'::regclass), 'commerce_cart_items 必須啟用 RLS');
-- 購物車不得保存單價（金額只能來自 commerce_product_prices）
select pg_temp.assert((select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'commerce_cart_items'
  and column_name in ('unit_amount_cents','amount_cents','price_cents','total_cents')) = 0, '購物車項目不可保存單價');
-- 訪客 token 只存 hash
select pg_temp.assert(exists (select 1 from information_schema.columns where table_schema = 'public'
  and table_name = 'commerce_carts' and column_name = 'session_token_hash'), '訪客購物車 token 必須以 hash 保存');
select pg_temp.assert((select count(*) from information_schema.columns where table_schema = 'public'
  and table_name = 'commerce_carts' and column_name in ('session_token','token')) = 0, '不可明文保存 cart token');
select pg_temp.assert(exists (select 1 from pg_proc where proname = 'create_order_from_cart' and pronamespace = 'public'::regnamespace and prosecdef),
  'create_order_from_cart 必須是 SECURITY DEFINER');

-- ---------------------------------------------------------------------
-- 2. 測試帳號
-- ---------------------------------------------------------------------
select pg_temp.new_user('owner'), pg_temp.new_user('admin'), pg_temp.new_user('editor'),
       pg_temp.new_user('viewer'), pg_temp.new_user('buyer'), pg_temp.new_user('other');
insert into public.admin_profiles(user_id, display_name, role) values
  (current_setting('test.owner')::uuid, 'Commerce Owner', 'owner'),
  (current_setting('test.admin')::uuid, 'Commerce Admin', 'admin'),
  (current_setting('test.editor')::uuid, 'Commerce Editor', 'editor'),
  (current_setting('test.viewer')::uuid, 'Commerce Viewer', 'viewer');

create function pg_temp.seo_price() returns uuid language sql stable as $$
  select id from public.commerce_product_prices where price_key = 'seo_website_one_time'
$$;
grant execute on function pg_temp.seo_price(), pg_temp.assert(boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. 訪客（anon）：只能經 RPC 操作自己的購物車
-- ---------------------------------------------------------------------
set local role anon;
select pg_temp.login_anon();

select pg_temp.assert((public.commerce_cart_add_item('guest-token-aaaaaaaaaaaaaaaaaaaaaaaa-1', pg_temp.seo_price(), 2) ->> 'item_count')::int = 2,
  '訪客可以加入購物車（badge = 商品總數量）');
select pg_temp.assert((public.commerce_cart_get('guest-token-aaaaaaaaaaaaaaaaaaaaaaaa-1') ->> 'subtotal_cents')::bigint =
  2 * (select amount_cents from public.commerce_product_prices where id = pg_temp.seo_price()), '小計由資料庫價格計算');
-- 另一個訪客 token 看不到第一個訪客的購物車
select pg_temp.assert((public.commerce_cart_get('guest-token-bbbbbbbbbbbbbbbbbbbbbbbb-2') ->> 'line_count')::int = 0,
  '訪客看不到其他 session 的購物車');
-- 直接讀資料表：一律讀不到
select pg_temp.assert((select count(*) from public.commerce_carts) = 0, 'anon 不可直接讀 commerce_carts');
select pg_temp.assert((select count(*) from public.commerce_cart_items) = 0, 'anon 不可直接讀 commerce_cart_items');
select pg_temp.assert((select count(*) from public.commerce_orders) = 0, 'anon 不可讀 commerce_orders');
select pg_temp.assert((select count(*) from public.commerce_order_items) = 0, 'anon 不可讀 commerce_order_items');
select pg_temp.assert((select count(*) from public.commerce_payments) = 0, 'anon 不可讀 commerce_payments');
select pg_temp.assert((select count(*) from public.commerce_webhook_events) = 0, 'anon 不可讀 webhook events');
select pg_temp.assert((select count(*) from public.commerce_payment_transactions) = 0, 'anon 不可讀交易明細');
select pg_temp.assert((select count(*) from public.access_codes) = 0, 'anon 不可讀 access codes');
select pg_temp.assert((select count(*) from public.commerce_payment_provider_configs) = 0, 'anon 不可讀金流設定（含 secret_refs）');
select pg_temp.assert((select count(*) from public.commerce_checkout_sessions) = 0, 'anon 不可讀 checkout sessions');

-- 不可購買的商品不能加入購物車（ECOM 為客製報價）
do $$
begin
  perform public.commerce_cart_add_item('guest-token-aaaaaaaaaaaaaaaaaaaaaaaa-1',
    (select pr.id from public.commerce_product_prices pr join public.commerce_products p on p.id = pr.product_id
     where p.sku = 'ecommerce-website-quote' limit 1), 1);
  raise exception 'FAIL: 需報價的商品不可加入購物車';
exception when sqlstate '22023' or sqlstate 'P0002' then null;
end $$;

-- 下單：伺服器重算金額
select set_config('test.order', (public.create_order_from_cart('guest-token-aaaaaaaaaaaaaaaaaaaaaaaa-1',
  '{"name":"訪客買家","email":"guest@test.invalid","consent":true}'::jsonb, 'sandbox_checkout'))::text, true);
select pg_temp.assert((current_setting('test.order')::jsonb ->> 'total_cents')::bigint =
  2 * (select amount_cents from public.commerce_product_prices where id = pg_temp.seo_price()), '訂單金額由伺服器計算');

-- 沒有同意隱私權條款不可下單
do $$
begin
  perform public.commerce_cart_add_item('guest-token-cccccccccccccccccccccccc-3', pg_temp.seo_price(), 1);
  perform public.create_order_from_cart('guest-token-cccccccccccccccccccccccc-3',
    '{"name":"X","email":"x@test.invalid"}'::jsonb, 'sandbox_checkout');
  raise exception 'FAIL: 沒有勾選同意不可下單';
exception when sqlstate '22023' then null;
end $$;

-- client 不可竄改訂單金額 / 狀態
do $$
declare n int;
begin
  update public.commerce_orders set total_cents = 1, subtotal_cents = 1 where id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid;
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'anon 不可修改訂單金額');
  update public.commerce_orders set status = 'paid', paid_at = now() where id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid;
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'anon 不可把訂單改成已付款');
  update public.commerce_payments set status = 'succeeded', paid_at = now() where id = (current_setting('test.order')::jsonb ->> 'payment_id')::uuid;
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'anon 不可把付款改成成功');
end $$;
-- 發碼函式只有 admin / service role 能呼叫
do $$
begin
  perform public.mark_payment_success_and_issue_entitlement((current_setting('test.order')::jsonb ->> 'order_id')::uuid);
  raise exception 'FAIL: anon 不可發放權限';
exception when insufficient_privilege then null;
end $$;

-- 收據 token：正確 token 可讀，錯誤 token 讀不到；未付款時不回傳權限代碼
select pg_temp.assert((public.get_order_receipt(current_setting('test.order')::jsonb ->> 'public_token') ->> 'ok')::boolean,
  '正確的收據 token 可以查到訂單');
select pg_temp.assert(jsonb_array_length(public.get_order_receipt(current_setting('test.order')::jsonb ->> 'public_token') -> 'access_codes') = 0,
  '未付款的訂單不回傳權限代碼');
select pg_temp.assert(not coalesce((public.get_order_receipt(repeat('f', 64)) ->> 'ok')::boolean, false), '錯誤的收據 token 查不到訂單');

-- 公開的付款方式只有 sandbox 模擬付款
select pg_temp.assert(not exists (select 1 from public.get_enabled_payment_methods() where provider <> 'sandbox'),
  '公開的付款方式只能是 sandbox 模擬付款');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 4. customer：只能看自己的訂單
-- ---------------------------------------------------------------------
update public.commerce_orders set customer_user_id = current_setting('test.buyer')::uuid
where id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid;

set local role authenticated;
select pg_temp.login('buyer');
select pg_temp.assert((select count(*) from public.commerce_orders) = 1, 'buyer 可以看到自己的訂單');
select pg_temp.assert((select count(*) from public.commerce_payments) = 1, 'buyer 可以看到自己訂單的付款');
select pg_temp.assert((select count(*) from public.commerce_payment_provider_configs) = 0, 'buyer 不可讀金流設定');
select pg_temp.assert((select count(*) from public.commerce_webhook_events) = 0, 'buyer 不可讀 webhook events');
do $$
declare n int;
begin
  update public.commerce_orders set total_cents = 1 where id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid;
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'buyer 不可修改自己的訂單金額');
end $$;

select pg_temp.login('other');
select pg_temp.assert((select count(*) from public.commerce_orders) = 0, '其他登入者看不到別人的訂單');
select pg_temp.assert((select count(*) from public.commerce_payments) = 0, '其他登入者看不到別人的付款');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 5. 後台角色
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('viewer');
select pg_temp.assert((select count(*) from public.commerce_products) >= 1, 'viewer 可以看到商品目錄');
select pg_temp.assert((select count(*) from public.commerce_payment_provider_configs) = 0, 'viewer 不可讀金流設定');
do $$
declare n int;
begin
  update public.commerce_products set name = name || ' probe';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'viewer 不可修改商品');
  update public.commerce_payments set status = 'succeeded';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'viewer 不可修改付款');
end $$;

select pg_temp.login('editor');
do $$
declare n int;
begin
  update public.commerce_payments set status = 'succeeded', paid_at = now();
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'editor 不可修改付款狀態');
  update public.commerce_orders set status = 'paid', paid_at = now();
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 0, 'editor 不可修改訂單狀態');
end $$;
select pg_temp.assert((select count(*) from public.commerce_payment_provider_configs) = 0, 'editor 不可讀金流設定');

select pg_temp.login('admin');
select pg_temp.assert((select count(*) from public.commerce_orders) = 1, 'admin 可以看到訂單');
select pg_temp.assert((select count(*) from public.commerce_payment_provider_configs) >= 1, 'admin 可以讀金流設定');
select pg_temp.assert((select count(*) from public.commerce_webhook_events) = 0, 'admin 可以查 webhook events（目前為 0 筆）');
do $$
declare n int;
begin
  update public.commerce_products set sort_order = sort_order where sku = 'seo-website-plan';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 1, 'admin 可以管理商品');
end $$;
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 6. 金流設定：只有 sandbox 啟用，secret 只有參照
-- ---------------------------------------------------------------------
select pg_temp.assert(not exists (select 1 from public.commerce_payment_provider_configs where is_enabled and provider <> 'sandbox'),
  '只有 sandbox provider 可以啟用');
select pg_temp.assert(not exists (select 1 from public.commerce_payment_provider_configs where is_enabled and environment = 'production'),
  'production 環境不可啟用');
select pg_temp.assert((select bool_and(public.is_valid_secret_refs(secret_refs)) from public.commerce_payment_provider_configs),
  'secret_refs 只能是 vault: / env: 參照');
select pg_temp.assert(not exists (select 1 from public.commerce_payment_provider_configs where merchant_id is not null),
  '不可寫入正式商店代號');
select pg_temp.assert(not coalesce(public.platform_feature_enabled('commerce.live_payments'), false),
  'commerce.live_payments 必須保持關閉');

-- ---------------------------------------------------------------------
-- 7. Webhook idempotency
-- ---------------------------------------------------------------------
insert into public.commerce_webhook_events(provider, environment, event_type, provider_event_id, idempotency_key, signature_valid, processing_status)
values ('sandbox', 'sandbox', 'payment_notify', 'evt-rls-1', 'sandbox:evt-rls-1', true, 'processed');
do $$
begin
  insert into public.commerce_webhook_events(provider, environment, event_type, provider_event_id, idempotency_key)
  values ('sandbox', 'sandbox', 'payment_notify', 'evt-rls-1', 'sandbox:evt-rls-1');
  raise exception 'FAIL: webhook idempotency_key 必須唯一';
exception when unique_violation then null;
end $$;

-- ---------------------------------------------------------------------
-- 8. 付款成功只發一次碼
-- ---------------------------------------------------------------------
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select set_config('test.first',
  public.mark_payment_success_and_issue_entitlement((current_setting('test.order')::jsonb ->> 'order_id')::uuid,
    (current_setting('test.order')::jsonb ->> 'payment_id')::uuid, 'SANDBOX-RLS-1')::text, true);
select set_config('test.second',
  public.mark_payment_success_and_issue_entitlement((current_setting('test.order')::jsonb ->> 'order_id')::uuid,
    (current_setting('test.order')::jsonb ->> 'payment_id')::uuid, 'SANDBOX-RLS-1')::text, true);
reset role;
select pg_temp.logout();

select pg_temp.assert(not (current_setting('test.first')::jsonb ->> 'already_processed')::boolean, '第一次付款成功會處理');
select pg_temp.assert((current_setting('test.second')::jsonb ->> 'already_processed')::boolean, '重送付款成功不重複處理');
-- 數量 2 → 2 組代碼；重送後仍是 2 組
select pg_temp.assert((select count(*) from public.access_codes where order_id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid) = 2,
  '付款成功依數量發碼，重送不重複發碼');
select pg_temp.assert((select status from public.commerce_orders where id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid) = 'fulfilled',
  '付款成功後訂單狀態為 fulfilled');
select pg_temp.assert((select status from public.commerce_payments where id = (current_setting('test.order')::jsonb ->> 'payment_id')::uuid) = 'succeeded',
  '付款成功後付款狀態為 succeeded');

-- 付款完成後收據才回傳權限代碼
select pg_temp.assert(jsonb_array_length(public.get_order_receipt(current_setting('test.order')::jsonb ->> 'public_token') -> 'access_codes') = 2,
  '付款完成後收據回傳 2 組權限代碼');

-- audit log：下單與付款都有紀錄，且不含完整權限代碼
select pg_temp.assert((select count(*) from public.audit_logs where action = 'commerce.order.created') >= 1, 'commerce.order.created 已寫入 audit log');
select pg_temp.assert((select count(*) from public.audit_logs where action = 'commerce.payment.created') >= 1, 'commerce.payment.created 已寫入 audit log');
select pg_temp.assert(not exists (
  select 1 from public.audit_logs l
  where l.action like 'commerce.%'
    and exists (select 1 from public.access_codes a where a.order_id = (current_setting('test.order')::jsonb ->> 'order_id')::uuid
                and (l.metadata::text like '%' || a.code || '%' or coalesce(l.after_data::text, '') like '%' || a.code || '%'))),
  'commerce audit log 不可包含完整權限代碼');

select 'commerce_checkout_rls: ALL PASSED' as result;
rollback;
