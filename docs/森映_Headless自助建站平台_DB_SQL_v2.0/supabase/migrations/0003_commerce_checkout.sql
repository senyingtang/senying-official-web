-- =====================================================================
-- 0003_commerce_checkout.sql
-- Commerce / Checkout：商品方案、價格、結帳、訂單、付款、金流設定、優惠碼、退款、Webhook。
-- 第一版不串正式金流，但保留綠界（信用卡 / 定期定額 / ATM 虛擬帳號 / WebATM）、銀行轉帳、LINE Pay 所需欄位。
-- 安全原則：
--   * migration 不含任何正式 MerchantID / HashKey / HashIV / Channel Secret。
--   * 金流密鑰只以「reference」形式存在（vault:<name> 或 env:<NAME>），實際值放 Supabase Vault / Edge Function Secrets。
--   * public_config 以 CHECK 禁止出現疑似密鑰欄位名稱。
-- 跨 migration 外鍵（entitlement_products、customer_workspaces、site_templates）於 0004 / 0005 / 0007 以 alter table 補上。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 共用驗證函式（immutable，供 CHECK constraint 使用）
-- ---------------------------------------------------------------------
-- secret_refs 必須是 {"hash_key":"vault:ecpay_sandbox_hash_key"} 形式，value 只能是 reference 字串
create or replace function public.is_valid_secret_refs(refs jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare r record;
begin
  if refs is null then return true; end if;
  if jsonb_typeof(refs) <> 'object' then return false; end if;
  for r in select key, value from jsonb_each(refs) loop
    if r.key !~ '^[a-z0-9_]{1,64}$' then return false; end if;
    if jsonb_typeof(r.value) <> 'string' then return false; end if;
    if (r.value #>> '{}') !~ '^(vault|env):[A-Za-z0-9_./-]{1,128}$' then return false; end if;
  end loop;
  return true;
end $$;

-- 遞迴檢查 jsonb 是否含疑似密鑰 key（用於 public_config / public_settings / config）
create or replace function public.jsonb_has_secret_like_keys(doc jsonb) returns boolean
language plpgsql immutable set search_path = public, pg_temp as $$
declare r record; e jsonb;
begin
  if doc is null then return false; end if;
  if jsonb_typeof(doc) = 'object' then
    for r in select key, value from jsonb_each(doc) loop
      if r.key ~* '(secret|password|passwd|hash_?key|hash_?iv|private_?key|api_?key|access_?token|refresh_?token|client_?secret|channel_?secret|credential|check_?mac)' then
        return true;
      end if;
      if public.jsonb_has_secret_like_keys(r.value) then return true; end if;
    end loop;
  elsif jsonb_typeof(doc) = 'array' then
    for e in select value from jsonb_array_elements(doc) loop
      if public.jsonb_has_secret_like_keys(e) then return true; end if;
    end loop;
  end if;
  return false;
end $$;

-- ---------------------------------------------------------------------
-- 商品方案
-- ---------------------------------------------------------------------
create table if not exists public.commerce_products(
  id uuid primary key default gen_random_uuid(),
  product_code public.commerce_product_code not null,
  sku citext not null unique check (sku::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_description text,
  description text,
  product_kind text not null default 'site_plan'
    check (product_kind in ('site_plan','template','ai_tool','service','addon','custom_quote')),
  site_type public.site_type,
  is_self_serve boolean not null default false,       -- v1：SEO / LP 可自助；ECOM 為 false
  requires_quote boolean not null default false,      -- v1：ECOM / CUSTOM 走客製報價
  entitlement_product_id uuid,                        -- FK → entitlement_products（0004）；付款成功後發放的權限
  cover_asset_id uuid references public.cms_assets(id) on delete set null,
  status public.cms_publish_status not null default 'draft',
  published_at timestamptz,
  is_visible boolean not null default true,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null),
  check (not (is_self_serve and requires_quote))
);

create table if not exists public.commerce_product_prices(
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.commerce_products(id) on delete cascade,
  price_key citext not null unique check (price_key::text ~ '^[a-z0-9]+(?:[-_][a-z0-9]+)*$'),
  name text,
  billing_interval public.billing_interval not null default 'one_time',
  interval_count int not null default 1 check (interval_count between 1 and 36),
  currency char(3) not null default 'TWD' check (currency ~ '^[A-Z]{3}$'),
  amount_cents bigint not null check (amount_cents >= 0),
  compare_at_amount_cents bigint check (compare_at_amount_cents is null or compare_at_amount_cents >= 0),
  trial_days int not null default 0 check (trial_days between 0 and 365),
  is_default boolean not null default false,
  is_active boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 綠界 TotalAmount 為整數新台幣：TWD 金額必須為整數元
  check (currency <> 'TWD' or amount_cents % 100 = 0),
  check (ends_at is null or starts_at is null or ends_at > starts_at),
  check (billing_interval <> 'one_time' or trial_days = 0)
);

-- ---------------------------------------------------------------------
-- 金流 Provider 設定（owner / admin 管理；後台勾選啟用）
-- ---------------------------------------------------------------------
create table if not exists public.commerce_payment_provider_configs(
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  environment public.provider_environment not null default 'sandbox',
  is_enabled boolean not null default false,
  display_name text not null,
  merchant_id text,                                   -- 商店代號屬識別碼（非密鑰），仍只允許 owner/admin 讀取
  api_base_url text check (api_base_url is null or api_base_url ~ '^https://'),
  public_config jsonb not null default '{}'::jsonb,   -- ReturnURL、ClientBackURL、語系等非敏感設定
  secret_refs jsonb not null default '{}'::jsonb,     -- {"hash_key":"vault:ecpay_sandbox_hash_key","hash_iv":"vault:ecpay_sandbox_hash_iv"}
  config_schema jsonb not null default '[]'::jsonb,   -- 後台勾選啟用後才顯示的欄位定義
  last_verified_at timestamptz,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, environment),
  constraint provider_configs_secret_refs_valid check (public.is_valid_secret_refs(secret_refs)),
  constraint provider_configs_public_config_no_secret check (not public.jsonb_has_secret_like_keys(public_config)),
  constraint provider_configs_schema_is_array check (jsonb_typeof(config_schema) = 'array')
);
-- 同一 provider 同時只能啟用一個環境（sandbox 或 production）
create unique index if not exists uq_provider_configs_one_enabled_env
  on public.commerce_payment_provider_configs(provider) where is_enabled;

create table if not exists public.commerce_payment_methods(
  id uuid primary key default gen_random_uuid(),
  method_key citext not null unique check (method_key::text ~ '^[a-z0-9_]+$'),
  provider public.payment_provider not null,
  method_type public.payment_method_type not null,
  provider_config_id uuid references public.commerce_payment_provider_configs(id) on delete set null,
  display_name text not null,
  description text,
  is_enabled boolean not null default false,
  supports_one_time boolean not null default true,
  supports_recurring boolean not null default false,
  supported_intervals public.billing_interval[] not null default array['one_time']::public.billing_interval[],
  min_amount_cents bigint check (min_amount_cents is null or min_amount_cents >= 0),
  max_amount_cents bigint check (max_amount_cents is null or max_amount_cents >= 0),
  fee_fixed_cents bigint not null default 0 check (fee_fixed_cents >= 0),
  fee_percent numeric(5,2) not null default 0 check (fee_percent between 0 and 100),
  payment_deadline_minutes int check (payment_deadline_minutes is null or payment_deadline_minutes between 1 and 86400),
  provider_method_code text,                          -- 例：綠界 ChoosePayment = Credit / ATM / WebATM；LINE Pay = linepay
  config_schema jsonb not null default '[]'::jsonb,   -- 啟用後才顯示的欄位定義
  public_settings jsonb not null default '{}'::jsonb, -- 欄位值（非敏感）
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (max_amount_cents is null or min_amount_cents is null or max_amount_cents >= min_amount_cents),
  check (supports_one_time or supports_recurring),
  check (not supports_recurring or method_type in ('credit_card_recurring','linepay')),
  constraint payment_methods_public_settings_no_secret check (not public.jsonb_has_secret_like_keys(public_settings)),
  constraint payment_methods_schema_is_array check (jsonb_typeof(config_schema) = 'array')
);

create table if not exists public.commerce_bank_transfer_accounts(
  id uuid primary key default gen_random_uuid(),
  payment_method_id uuid references public.commerce_payment_methods(id) on delete set null,
  bank_code char(3) not null check (bank_code ~ '^[0-9]{3}$'),
  bank_name text not null,
  branch_code text check (branch_code is null or branch_code ~ '^[0-9]{3,4}$'),
  branch_name text,
  account_name text not null,
  account_number text not null check (account_number ~ '^[0-9-]{6,20}$'),
  is_enabled boolean not null default false,
  transfer_deadline_hours int not null default 72 check (transfer_deadline_hours between 1 and 720),
  instructions text,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 優惠碼
-- ---------------------------------------------------------------------
create table if not exists public.commerce_coupons(
  id uuid primary key default gen_random_uuid(),
  code citext not null unique check (code::text ~ '^[A-Za-z0-9_-]{3,40}$'),
  name text not null,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed_amount')),
  percent_off numeric(5,2) check (percent_off is null or (percent_off > 0 and percent_off <= 100)),
  amount_off_cents bigint check (amount_off_cents is null or amount_off_cents > 0),
  currency char(3) not null default 'TWD',
  applicable_product_codes public.commerce_product_code[],   -- null = 全部
  applicable_product_ids uuid[],                              -- null = 全部
  applicable_intervals public.billing_interval[],             -- null = 全部
  subscription_duration text not null default 'once' check (subscription_duration in ('once','repeating','forever')),
  duration_in_periods int check (duration_in_periods is null or duration_in_periods > 0),
  min_order_amount_cents bigint not null default 0 check (min_order_amount_cents >= 0),
  max_redemptions int check (max_redemptions is null or max_redemptions > 0),
  max_redemptions_per_user int check (max_redemptions_per_user is null or max_redemptions_per_user > 0),
  redeemed_count int not null default 0 check (redeemed_count >= 0),
  first_order_only boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((discount_type = 'percent' and percent_off is not null and amount_off_cents is null)
      or (discount_type = 'fixed_amount' and amount_off_cents is not null and percent_off is null)),
  check (subscription_duration <> 'repeating' or duration_in_periods is not null),
  check (max_redemptions is null or redeemed_count <= max_redemptions),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

-- ---------------------------------------------------------------------
-- 結帳 / 訂單
-- ---------------------------------------------------------------------
create table if not exists public.commerce_checkout_sessions(
  id uuid primary key default gen_random_uuid(),
  public_token_hash text not null unique,             -- 只存 sha256，前台以明文 token 查詢
  customer_user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,                                  -- FK → customer_workspaces（0005）
  status public.checkout_session_status not null default 'open',
  customer_email citext,
  customer_name text,
  customer_phone text,
  company_name text,
  tax_id text check (tax_id is null or tax_id ~ '^[0-9]{8}$'),
  line_items jsonb not null default '[]'::jsonb,      -- [{price_id, quantity}] 下單前快照；正式金額以 order 為準
  coupon_id uuid references public.commerce_coupons(id) on delete set null,
  selected_payment_method_id uuid references public.commerce_payment_methods(id) on delete set null,
  currency char(3) not null default 'TWD',
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  success_path text check (success_path is null or success_path ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  cancel_path text check (cancel_path is null or cancel_path ~ '^/[A-Za-z0-9/_?=&.%-]*$'),
  source_path text,
  utm_source text, utm_medium text, utm_campaign text,
  ip_hash text,
  user_agent text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(line_items) = 'array'),
  check (customer_user_id is not null or customer_email is not null),
  check (status <> 'completed' or completed_at is not null)
);

create sequence if not exists public.commerce_order_number_seq;

create table if not exists public.commerce_orders(
  id uuid primary key default gen_random_uuid(),
  order_number citext not null unique
    default ('ORD-' || to_char(now() at time zone 'Asia/Taipei', 'YYYYMMDD') || '-' || lpad(nextval('public.commerce_order_number_seq')::text, 6, '0')),
  checkout_session_id uuid references public.commerce_checkout_sessions(id) on delete set null,
  customer_user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,                                  -- FK → customer_workspaces（0005）
  source text not null default 'checkout' check (source in ('checkout','admin_manual','renewal','quote')),
  status public.order_status not null default 'pending',
  currency char(3) not null default 'TWD',
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  coupon_id uuid references public.commerce_coupons(id) on delete set null,
  payment_method_id uuid references public.commerce_payment_methods(id) on delete set null,
  buyer_name text,
  buyer_email citext not null,
  buyer_phone text,
  buyer_company text,
  buyer_tax_id text check (buyer_tax_id is null or buyer_tax_id ~ '^[0-9]{8}$'),
  -- 電子發票（台灣）：保留欄位，第一版不串加值中心
  invoice_type text check (invoice_type is null or invoice_type in ('b2c_member','b2c_mobile_carrier','b2c_citizen_carrier','b2c_donation','b2b')),
  invoice_carrier_number text,
  invoice_love_code text check (invoice_love_code is null or invoice_love_code ~ '^[0-9]{3,7}$'),
  paid_at timestamptz,
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  entitlements_issued_at timestamptz,                 -- mark_payment_success_and_issue_entitlement 冪等標記
  admin_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = greatest(subtotal_cents - discount_cents, 0) + tax_cents),
  check (status not in ('paid','fulfilled') or paid_at is not null),
  check (status <> 'fulfilled' or fulfilled_at is not null)
);

alter table public.commerce_checkout_sessions add column if not exists order_id uuid references public.commerce_orders(id) on delete set null;

create table if not exists public.commerce_order_items(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  product_id uuid not null references public.commerce_products(id) on delete restrict,
  product_price_id uuid references public.commerce_product_prices(id) on delete restrict,
  -- 下單當下快照（商品後續改名、改價不影響歷史訂單）
  product_code public.commerce_product_code not null,
  sku citext not null,
  product_name text not null,
  billing_interval public.billing_interval not null default 'one_time',
  interval_count int not null default 1 check (interval_count >= 1),
  quantity int not null default 1 check (quantity between 1 and 100),
  unit_amount_cents bigint not null check (unit_amount_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  total_cents bigint not null check (total_cents >= 0),
  entitlement_product_id uuid,                        -- FK → entitlement_products（0004）
  subscription_plan_price_id uuid,                    -- FK → subscription_plan_prices（0004）
  template_id uuid,                                   -- FK → site_templates（0007）
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = greatest(unit_amount_cents * quantity - discount_cents, 0))
);

-- ---------------------------------------------------------------------
-- 付款 / 交易紀錄
-- ---------------------------------------------------------------------
create table if not exists public.commerce_payments(
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  payment_method_id uuid references public.commerce_payment_methods(id) on delete set null,
  provider public.payment_provider not null,
  method_type public.payment_method_type not null,
  environment public.provider_environment not null default 'sandbox',
  status public.payment_status not null default 'pending',
  amount_cents bigint not null check (amount_cents >= 0),
  currency char(3) not null default 'TWD',
  -- 綠界 MerchantTradeNo：英數 20 字內、不可重複
  merchant_trade_no text unique check (merchant_trade_no is null or merchant_trade_no ~ '^[A-Za-z0-9]{1,20}$'),
  provider_trade_no text,                             -- 綠界 TradeNo / LINE Pay transactionId
  provider_payment_type text,                         -- 綠界 PaymentType 回傳值
  -- ATM 虛擬帳號（付款資訊，需顯示給買家）
  atm_bank_code text check (atm_bank_code is null or atm_bank_code ~ '^[0-9]{3}$'),
  atm_virtual_account text check (atm_virtual_account is null or atm_virtual_account ~ '^[0-9]{6,20}$'),
  -- 銀行轉帳
  bank_transfer_account_id uuid references public.commerce_bank_transfer_accounts(id) on delete set null,
  transfer_account_last5 text check (transfer_account_last5 is null or transfer_account_last5 ~ '^[0-9]{5}$'),
  transfer_reported_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  -- 信用卡（僅保留末四碼與授權碼，不存卡號）
  card_last4 text check (card_last4 is null or card_last4 ~ '^[0-9]{4}$'),
  auth_code text,
  -- 定期定額
  is_recurring boolean not null default false,
  recurring_period_type text check (recurring_period_type is null or recurring_period_type in ('D','M','Y')),
  recurring_frequency int check (recurring_frequency is null or recurring_frequency > 0),
  recurring_exec_times int check (recurring_exec_times is null or recurring_exec_times > 0),
  customer_subscription_id uuid,                      -- FK → customer_subscriptions（0004）
  payment_deadline_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  failure_code text,
  failure_message text,
  is_manual_mark boolean not null default false,      -- 後台人工標記付款成功（第一版未串金流）
  idempotency_key text unique,
  request_payload_sanitized jsonb not null default '{}'::jsonb,
  response_summary jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'succeeded' or paid_at is not null),
  check (not public.jsonb_has_secret_like_keys(request_payload_sanitized)),
  check (not public.jsonb_has_secret_like_keys(response_summary))
);

create table if not exists public.commerce_webhook_events(
  id uuid primary key default gen_random_uuid(),
  provider public.payment_provider not null,
  environment public.provider_environment not null default 'sandbox',
  event_type text not null,                           -- payment_notify / atm_info / periodic_notify / linepay_confirm / refund_notify
  provider_event_id text,
  idempotency_key text not null unique,               -- provider + event 唯一鍵，重送不重複處理
  http_method text not null default 'POST',
  request_path text,
  headers_sanitized jsonb not null default '{}'::jsonb,
  raw_payload jsonb,                                  -- 原始 payload：只允許 owner/admin 讀取（見 0013）
  raw_body text,
  payload_sha256 text,
  signature_valid boolean,
  signature_checked_at timestamptz,
  processing_status public.webhook_processing_status not null default 'received',
  processing_attempts int not null default 0 check (processing_attempts >= 0),
  processed_at timestamptz,
  error_message text,
  related_order_id uuid references public.commerce_orders(id) on delete set null,
  related_payment_id uuid references public.commerce_payments(id) on delete set null,
  received_at timestamptz not null default now(),
  payload_purged_at timestamptz,                      -- 保存期限後清除 raw_payload / raw_body
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 交易明細：append-only ledger（只有 created_at）
create table if not exists public.commerce_payment_transactions(
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.commerce_payments(id) on delete restrict,
  transaction_type text not null
    check (transaction_type in ('create','authorize','capture','charge','atm_issue','transfer_report','manual_mark','notify','query','recurring_charge','refund','void')),
  status text not null check (status in ('pending','succeeded','failed')),
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  provider_transaction_id text,
  provider_rtn_code text,
  provider_rtn_msg text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  webhook_event_id uuid references public.commerce_webhook_events(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (not public.jsonb_has_secret_like_keys(request_payload)),
  check (not public.jsonb_has_secret_like_keys(response_payload))
);

create table if not exists public.commerce_coupon_redemptions(
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.commerce_coupons(id) on delete restrict,
  order_id uuid not null references public.commerce_orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  discount_cents bigint not null check (discount_cents >= 0),
  status text not null default 'reserved' check (status in ('reserved','applied','released')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (coupon_id, order_id)
);

create sequence if not exists public.commerce_refund_number_seq;

create table if not exists public.commerce_refunds(
  id uuid primary key default gen_random_uuid(),
  refund_number citext not null unique
    default ('RFD-' || to_char(now() at time zone 'Asia/Taipei', 'YYYYMMDD') || '-' || lpad(nextval('public.commerce_refund_number_seq')::text, 6, '0')),
  order_id uuid not null references public.commerce_orders(id) on delete restrict,
  payment_id uuid references public.commerce_payments(id) on delete restrict,
  amount_cents bigint not null check (amount_cents > 0),
  currency char(3) not null default 'TWD',
  status public.refund_status not null default 'requested',
  reason_code text check (reason_code is null or reason_code in ('customer_request','duplicate','fraudulent','service_issue','subscription_cancel','other')),
  reason_text text,
  revoke_entitlements boolean not null default true,  -- 退款成功時是否撤銷未兌換代碼 / 權限
  provider_refund_ref text,
  requested_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  processed_at timestamptz,
  failure_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'succeeded' or processed_at is not null)
);

commit;
