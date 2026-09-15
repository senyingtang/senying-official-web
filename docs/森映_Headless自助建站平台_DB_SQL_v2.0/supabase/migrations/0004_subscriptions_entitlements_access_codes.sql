-- =====================================================================
-- 0004_subscriptions_entitlements_access_codes.sql
-- Entitlements（權限定義）→ Subscription（月繳 / 年繳 / 一次性）→ Access Codes（權限代碼）→
-- User Entitlements（已兌換權限）→ Usage Quotas / Events（額度與使用紀錄）。
--
-- 權限代碼格式：SYT-{PRODUCT_CODE}-{YYYY}-{6 碼}
--   * PRODUCT_CODE ∈ SEO / LP / ECOM / DM / AI / CUSTOM
--   * 6 碼字元集 32 字：A-Z 去除 I、L、O；數字 1-9（去除 0），避免 0/O、1/I/L 混淆
--   * 由 generate_access_code() / issue_access_code() 自動產生（0012）；
--     直接 insert 會被 trigger 拒絕（0011），確保「不得人工手動編碼」
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- Entitlement 定義
-- ---------------------------------------------------------------------
create table if not exists public.entitlement_features(
  id uuid primary key default gen_random_uuid(),
  feature_key citext not null unique check (feature_key::text ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'),
  name text not null,
  description text,
  value_type text not null default 'boolean' check (value_type in ('boolean','quota','limit')),
  unit text check (unit is null or unit in ('site','page','article','credit','member','domain','template')),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlement_products(
  id uuid primary key default gen_random_uuid(),
  entitlement_key citext not null unique check (entitlement_key::text ~ '^[a-z0-9_]+$'),
  product_code public.commerce_product_code not null,
  name text not null,
  description text,
  default_duration_days int check (default_duration_days is null or default_duration_days > 0), -- null = 永久（一次性買斷）
  code_valid_days int check (code_valid_days is null or code_valid_days > 0),                  -- 代碼發出後可兌換期限；null = 不限
  is_transferable_before_redeem boolean not null default true,
  max_workspace_members int check (max_workspace_members is null or max_workspace_members > 0),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entitlement_feature_rules(
  id uuid primary key default gen_random_uuid(),
  entitlement_product_id uuid not null references public.entitlement_products(id) on delete cascade,
  feature_id uuid not null references public.entitlement_features(id) on delete restrict,
  is_enabled boolean not null default true,
  limit_value int check (limit_value is null or limit_value >= 0),     -- 例：workspace 成員上限
  quota_amount int check (quota_amount is null or quota_amount >= 0),   -- 例：網站數 1、文章 30 篇
  quota_period text not null default 'lifetime' check (quota_period in ('lifetime','month','year')),
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entitlement_product_id, feature_id)
);

-- 補 0003 的跨檔外鍵
do $$ begin
  alter table public.commerce_products add constraint commerce_products_entitlement_product_id_fkey
    foreign key (entitlement_product_id) references public.entitlement_products(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.commerce_order_items add constraint commerce_order_items_entitlement_product_id_fkey
    foreign key (entitlement_product_id) references public.entitlement_products(id) on delete restrict;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Subscription 方案
-- ---------------------------------------------------------------------
create table if not exists public.subscription_plans(
  id uuid primary key default gen_random_uuid(),
  plan_key citext not null unique check (plan_key::text ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  product_code public.commerce_product_code not null,
  commerce_product_id uuid references public.commerce_products(id) on delete set null,
  entitlement_product_id uuid not null references public.entitlement_products(id) on delete restrict,
  site_type public.site_type,
  max_site_projects int not null default 1 check (max_site_projects >= 0),  -- v1 = 1；v2 依方案開放多網站
  is_public boolean not null default false,
  is_active boolean not null default false,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 方案價格：金額來源統一為 commerce_product_prices；此表保存續訂規則與綠界定期定額參數
create table if not exists public.subscription_plan_prices(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  commerce_product_price_id uuid not null unique references public.commerce_product_prices(id) on delete restrict,
  billing_interval public.billing_interval not null,
  interval_count int not null default 1 check (interval_count between 1 and 36),
  auto_renew_default boolean not null default true,
  grace_period_days int not null default 3 check (grace_period_days between 0 and 60),
  max_retry_count int not null default 3 check (max_retry_count between 0 and 10),
  ecpay_period_type text check (ecpay_period_type is null or ecpay_period_type in ('D','M','Y')),
  ecpay_frequency int check (ecpay_frequency is null or ecpay_frequency > 0),
  ecpay_exec_times int check (ecpay_exec_times is null or ecpay_exec_times between 2 and 999),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, billing_interval, interval_count),
  check (billing_interval <> 'month' or ecpay_period_type is null or ecpay_period_type = 'M'),
  check (billing_interval <> 'year' or ecpay_period_type is null or ecpay_period_type = 'Y'),
  check (billing_interval <> 'one_time' or (ecpay_period_type is null and ecpay_exec_times is null))
);

do $$ begin
  alter table public.commerce_order_items add constraint commerce_order_items_subscription_plan_price_id_fkey
    foreign key (subscription_plan_price_id) references public.subscription_plan_prices(id) on delete restrict;
exception when duplicate_object then null; end $$;

-- 方案比較表顯示用；實際發放以 entitlement_feature_rules 為準
create table if not exists public.subscription_plan_features(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans(id) on delete cascade,
  feature_id uuid not null references public.entitlement_features(id) on delete restrict,
  is_enabled boolean not null default true,
  limit_value int check (limit_value is null or limit_value >= 0),
  quota_amount int check (quota_amount is null or quota_amount >= 0),
  quota_period text not null default 'lifetime' check (quota_period in ('lifetime','month','year')),
  display_label text,
  display_value text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, feature_id)
);

create table if not exists public.customer_subscriptions(
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references auth.users(id) on delete restrict,  -- 付款 / 帳務擁有者
  workspace_id uuid,                                                           -- FK → customer_workspaces（0005）
  plan_id uuid not null references public.subscription_plans(id) on delete restrict,
  plan_price_id uuid not null references public.subscription_plan_prices(id) on delete restrict,
  initial_order_id uuid references public.commerce_orders(id) on delete set null,
  status public.subscription_status not null default 'incomplete',
  billing_interval public.billing_interval not null,
  interval_count int not null default 1 check (interval_count >= 1),
  current_period_start timestamptz,
  current_period_end timestamptz,                    -- 到期日；到期未續訂 → expired 並停用權限
  trial_ends_at timestamptz,
  auto_renew boolean not null default true,
  renewal_status text not null default 'auto'
    check (renewal_status in ('auto','manual','disabled','pending_retry','failed')),
  next_billing_at timestamptz,
  retry_count int not null default 0 check (retry_count >= 0),
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  ended_at timestamptz,
  provider public.payment_provider,
  provider_subscription_ref text,                    -- 綠界定期定額原始 MerchantTradeNo 等（非密鑰）
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end is null or current_period_start is null or current_period_end > current_period_start),
  check (status not in ('active','trialing','past_due','cancel_scheduled') or current_period_end is not null),
  check (status <> 'cancel_scheduled' or cancel_at_period_end)
);

do $$ begin
  alter table public.commerce_payments add constraint commerce_payments_customer_subscription_id_fkey
    foreign key (customer_subscription_id) references public.customer_subscriptions(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.subscription_periods(
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.customer_subscriptions(id) on delete cascade,
  period_index int not null check (period_index >= 1),
  period_start timestamptz not null,
  period_end timestamptz not null,
  status text not null default 'upcoming' check (status in ('upcoming','active','paid','unpaid','void')),
  order_id uuid references public.commerce_orders(id) on delete set null,
  payment_id uuid references public.commerce_payments(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subscription_id, period_index),
  check (period_end > period_start)
);

create sequence if not exists public.subscription_invoice_number_seq;

create table if not exists public.subscription_invoices(
  id uuid primary key default gen_random_uuid(),
  invoice_number citext not null unique
    default ('INV-' || to_char(now() at time zone 'Asia/Taipei', 'YYYYMM') || '-' || lpad(nextval('public.subscription_invoice_number_seq')::text, 6, '0')),
  subscription_id uuid not null references public.customer_subscriptions(id) on delete restrict,
  period_id uuid references public.subscription_periods(id) on delete set null,
  customer_user_id uuid not null references auth.users(id) on delete restrict,
  order_id uuid references public.commerce_orders(id) on delete set null,
  payment_id uuid references public.commerce_payments(id) on delete set null,
  status public.invoice_status not null default 'draft',
  currency char(3) not null default 'TWD',
  subtotal_cents bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  tax_cents bigint not null default 0 check (tax_cents >= 0),
  total_cents bigint not null default 0 check (total_cents >= 0),
  due_at timestamptz,
  paid_at timestamptz,
  voided_at timestamptz,
  e_invoice_number text check (e_invoice_number is null or e_invoice_number ~ '^[A-Z]{2}[0-9]{8}$'),
  e_invoice_status text check (e_invoice_status is null or e_invoice_status in ('pending','issued','voided','allowance')),
  buyer_name text,
  buyer_tax_id text check (buyer_tax_id is null or buyer_tax_id ~ '^[0-9]{8}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (total_cents = greatest(subtotal_cents - discount_cents, 0) + tax_cents),
  check (status <> 'paid' or paid_at is not null)
);

create table if not exists public.subscription_cancellations(
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.customer_subscriptions(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  cancel_type text not null default 'at_period_end' check (cancel_type in ('at_period_end','immediate')),
  reason_code text check (reason_code is null or reason_code in ('too_expensive','missing_feature','switched_service','not_using','temporary','other')),
  reason_text text check (reason_text is null or length(reason_text) <= 2000),
  status text not null default 'requested' check (status in ('requested','scheduled','completed','reverted','rejected')),
  effective_at timestamptz,
  refund_id uuid references public.commerce_refunds(id) on delete set null,
  processed_by uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Access Codes
-- ---------------------------------------------------------------------
create table if not exists public.access_codes(
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  product_code public.commerce_product_code not null,
  code_year smallint not null check (code_year between 2024 and 2999),
  entitlement_product_id uuid not null references public.entitlement_products(id) on delete restrict,
  status public.access_code_status not null default 'generated',
  source_type text not null default 'order' check (source_type in ('order','subscription','admin_grant','promotion','migration')),
  order_id uuid references public.commerce_orders(id) on delete restrict,
  order_item_id uuid references public.commerce_order_items(id) on delete restrict,
  customer_subscription_id uuid references public.customer_subscriptions(id) on delete set null,
  -- 持有者（未兌換前可轉讓，轉讓即變更此欄位）
  issued_to_user_id uuid references auth.users(id) on delete set null,
  issued_to_email citext,
  issued_at timestamptz,
  -- 兌換者（啟用後綁定第一位使用者，不可再變更）
  redeemed_by_user_id uuid references auth.users(id) on delete restrict,
  redeemed_at timestamptz,
  redeemed_workspace_id uuid,                        -- FK → customer_workspaces（0005）
  starts_at timestamptz,                             -- 可兌換起始時間
  expires_at timestamptz,                            -- 兌換期限（非權限到期日）
  entitlement_duration_days int check (entitlement_duration_days is null or entitlement_duration_days > 0), -- 覆寫預設權限天數
  transfer_count int not null default 0 check (transfer_count >= 0),
  last_transferred_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint access_codes_format check (code::text ~ '^SYT-(SEO|LP|ECOM|DM|AI|CUSTOM)-[0-9]{4}-[A-HJKMNP-Z1-9]{6}$'),
  constraint access_codes_product_code_match check (split_part(code::text, '-', 2) = product_code::text),
  constraint access_codes_year_match check (split_part(code::text, '-', 3)::int = code_year),
  constraint access_codes_redeemed_consistency check (
    (status = 'redeemed') = (redeemed_by_user_id is not null and redeemed_at is not null)
  ),
  constraint access_codes_revoked_consistency check (status <> 'revoked' or revoked_at is not null),
  constraint access_codes_issued_consistency check (status <> 'issued' or issued_at is not null),
  constraint access_codes_window check (expires_at is null or starts_at is null or expires_at > starts_at)
);

-- 轉讓紀錄（未兌換前）
create table if not exists public.access_code_transfers(
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid not null references public.access_codes(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  to_email citext,
  note text check (note is null or length(note) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.user_entitlements(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,                                 -- FK → customer_workspaces（0005）
  entitlement_product_id uuid not null references public.entitlement_products(id) on delete restrict,
  source_type text not null check (source_type in ('access_code','subscription','order','admin_grant','template_purchase','internal')),
  access_code_id uuid unique references public.access_codes(id) on delete restrict,  -- 一組代碼只會產生一筆權限
  order_id uuid references public.commerce_orders(id) on delete set null,
  customer_subscription_id uuid references public.customer_subscriptions(id) on delete set null,
  status public.entitlement_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,                            -- null = 永久；訂閱型 = current_period_end
  suspended_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  granted_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at),
  check (status <> 'revoked' or revoked_at is not null),
  check (source_type <> 'access_code' or access_code_id is not null)
);

-- 兌換紀錄（含失敗嘗試；成功紀錄每組代碼最多一筆）
create table if not exists public.access_code_redemptions(
  id uuid primary key default gen_random_uuid(),
  access_code_id uuid references public.access_codes(id) on delete restrict,   -- 查無代碼時為 null
  user_id uuid not null references auth.users(id) on delete cascade,
  attempted_code_sha256 text not null,               -- 只存輸入代碼雜湊，不存明文猜測值
  result text not null check (result in ('success','invalid_format','not_found','already_redeemed','revoked','expired','not_started','inactive_product','rate_limited')),
  user_entitlement_id uuid references public.user_entitlements(id) on delete set null,
  workspace_id uuid,                                 -- FK → customer_workspaces（0005）
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);
create unique index if not exists uq_access_code_redemptions_one_success
  on public.access_code_redemptions(access_code_id) where result = 'success';

-- ---------------------------------------------------------------------
-- 額度與使用紀錄
-- ---------------------------------------------------------------------
create table if not exists public.entitlement_usage_quotas(
  id uuid primary key default gen_random_uuid(),
  user_entitlement_id uuid not null references public.user_entitlements(id) on delete cascade,
  usage_key citext not null check (usage_key::text ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$'),  -- 對應 entitlement_features.feature_key
  quota_limit int check (quota_limit is null or quota_limit >= 0),                     -- null = 不限
  quota_used int not null default 0 check (quota_used >= 0),
  reset_period text not null default 'lifetime' check (reset_period in ('lifetime','month','year')),
  period_start timestamptz not null default now(),
  period_end timestamptz,                                                              -- lifetime = null
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_entitlement_id, usage_key, period_start),
  check (quota_limit is null or quota_used <= quota_limit),
  check (period_end is null or period_end > period_start),
  check ((reset_period = 'lifetime') = (period_end is null))
);

create table if not exists public.entitlement_usage_events(
  id uuid primary key default gen_random_uuid(),
  user_entitlement_id uuid not null references public.user_entitlements(id) on delete cascade,
  quota_id uuid references public.entitlement_usage_quotas(id) on delete set null,
  usage_key citext not null,
  amount int not null check (amount <> 0),           -- 正數 = 使用；負數 = 退回
  actor_user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid,                                 -- FK → customer_workspaces（0005）
  reference_type text,                               -- site_project / ai_article_generation / domain ...
  reference_id uuid,
  idempotency_key text unique,
  quota_used_after int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

commit;
