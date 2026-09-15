-- =====================================================================
-- 0005_customer_workspaces.sql
-- 客戶 Workspace：一位用戶可擁有 / 加入多個 workspace；
-- 第一版每次購買（每組代碼）建立 1 個網站專案，第二版依方案開放多網站。
-- Workspace 角色：owner / admin / editor / viewer（與森映後台 cms_admin_role 分離）。
-- =====================================================================
begin;

create table if not exists public.customer_workspaces(
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug::text) between 3 and 63),
  name text not null check (length(name) between 1 and 120),
  owner_user_id uuid not null references auth.users(id) on delete restrict,  -- 主要擁有者（帳務聯絡人）
  status text not null default 'active' check (status in ('active','suspended','archived')),
  source_access_code_id uuid references public.access_codes(id) on delete set null,
  source_entitlement_id uuid references public.user_entitlements(id) on delete set null,
  site_project_limit_override int check (site_project_limit_override is null or site_project_limit_override >= 0), -- 森映 admin 手動覆寫；null = 依權限額度
  timezone text not null default 'Asia/Taipei',
  default_locale text not null default 'zh-TW',
  suspended_at timestamptz,
  suspended_reason text,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'suspended' or suspended_at is not null)
);

create table if not exists public.customer_workspace_members(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_member_role not null default 'viewer',
  status text not null default 'active' check (status in ('active','suspended')),
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.customer_workspace_invitations(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  email citext not null check (email::text ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role public.workspace_member_role not null default 'editor' check (role <> 'owner'),  -- 邀請不可直接給 owner
  token_sha256 text not null unique,                 -- 只存雜湊；明文 token 僅寄送一次
  status public.invitation_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'accepted' or (accepted_by is not null and accepted_at is not null))
);
create unique index if not exists uq_workspace_invitations_pending_email
  on public.customer_workspace_invitations(workspace_id, email) where status = 'pending';

create table if not exists public.customer_workspace_settings(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.customer_workspaces(id) on delete cascade,
  brand_name text,
  contact_email citext,
  contact_phone text,
  billing_contact jsonb not null default '{}'::jsonb,
  notification_settings jsonb not null default '{"form_submission_email": true, "billing_email": true}'::jsonb,
  feature_flags jsonb not null default '{}'::jsonb,  -- 只允許森映 admin 修改（0012 trigger）
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not public.jsonb_has_secret_like_keys(notification_settings))
);

-- ---------------------------------------------------------------------
-- 補先前 migration 的 workspace 外鍵
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.commerce_checkout_sessions add constraint commerce_checkout_sessions_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.commerce_orders add constraint commerce_orders_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_subscriptions add constraint customer_subscriptions_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.access_codes add constraint access_codes_redeemed_workspace_id_fkey
    foreign key (redeemed_workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.access_code_redemptions add constraint access_code_redemptions_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.user_entitlements add constraint user_entitlements_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.entitlement_usage_events add constraint entitlement_usage_events_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.audit_logs add constraint audit_logs_workspace_id_fkey
    foreign key (workspace_id) references public.customer_workspaces(id) on delete set null;
exception when duplicate_object then null; end $$;

commit;
