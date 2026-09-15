-- =====================================================================
-- 0008_domains_dns_deployments.sql
-- Domain / DNS / SSL / Deployment
--   v1：不公開發布，只有預覽（資料表與狀態流程完整，但不實際部署：site_deployments.is_dry_run = true）
--   v2：森映平台子網域（platform_subdomain）
--   v3：客戶自訂網域（custom_subdomain 例 www.client.com 優先建議；custom_apex 例 client.com）
-- 平台 CNAME 目標、A record、子網域後綴不寫死，讀取 cms_site_settings('platform.dns')。
-- SSL 私鑰不存資料庫（僅記錄狀態）。
-- =====================================================================
begin;

create table if not exists public.site_project_domains(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  domain citext not null check (
    length(domain::text) between 4 and 253
    and domain::text = lower(domain::text)
    and domain::text ~ '^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$'
  ),
  domain_type public.domain_type not null,
  apex_domain citext not null,                       -- 例：www.client.com.tw → client.com.tw
  subdomain_label text,                              -- 例：www；apex 為 null
  status public.domain_status not null default 'pending',
  is_primary boolean not null default false,
  redirect_to_primary boolean not null default true,
  www_redirect text not null default 'none' check (www_redirect in ('none','apex_to_www','www_to_apex')),
  verification_token text not null,                  -- TXT 驗證值（隨機、非密鑰）
  verified_at timestamptz,
  activated_at timestamptz,
  last_checked_at timestamptz,
  failure_reason text,
  removed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (verification_token ~ '^syt-verify=[a-z0-9]{32}$'),
  check (status not in ('verified','active') or verified_at is not null),
  check (status <> 'active' or activated_at is not null),
  check (status <> 'removed' or removed_at is not null),
  check ((domain_type = 'custom_apex') = (subdomain_label is null))
);
-- 網域全平台唯一（已移除者除外）
create unique index if not exists uq_site_project_domains_active_domain
  on public.site_project_domains(domain) where status <> 'removed';
-- 每個網站最多一個 primary domain
create unique index if not exists uq_site_project_domains_one_primary
  on public.site_project_domains(site_project_id) where is_primary and status <> 'removed';

create table if not exists public.site_domain_verifications(
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.site_project_domains(id) on delete cascade,
  method text not null default 'dns_txt' check (method in ('dns_txt','dns_cname','http_file')),
  record_type public.dns_record_type not null default 'TXT',
  record_name text not null,                         -- 例：_syt-verify.www.client.com
  expected_value text not null,
  observed_values text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','verified','failed','expired')),
  attempt_count int not null default 0 check (attempt_count >= 0),
  verified_at timestamptz,
  last_checked_at timestamptz,
  failure_reason text,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'verified' or verified_at is not null)
);

-- DNS 操作指示（由 generate_dns_instruction() 產生後保存，客戶後台教學頁顯示）
create table if not exists public.site_dns_instructions(
  id uuid primary key default gen_random_uuid(),
  domain_id uuid references public.site_project_domains(id) on delete cascade,
  site_project_id uuid references public.customer_site_projects(id) on delete cascade,
  domain citext not null,
  domain_type public.domain_type not null,
  provider_hint text not null default 'generic' check (provider_hint in ('generic','cloudflare','godaddy','gandi','namecheap','hinet','pchome','other')),
  recommended_domain citext,                         -- 建議優先使用 www 子網域
  records jsonb not null default '[]'::jsonb,        -- [{type, host, name, value, ttl, purpose, required}]
  steps jsonb not null default '[]'::jsonb,          -- 依序操作步驟文字
  warnings jsonb not null default '[]'::jsonb,
  instruction_version int not null default 1,
  is_current boolean not null default true,
  generated_by uuid references auth.users(id) on delete set null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(records) = 'array' and jsonb_typeof(steps) = 'array' and jsonb_typeof(warnings) = 'array')
);
create unique index if not exists uq_site_dns_instructions_current
  on public.site_dns_instructions(domain_id) where is_current and domain_id is not null;

-- DNS 串接教學頁內容（各網域商）
create table if not exists public.site_dns_provider_guides(
  id uuid primary key default gen_random_uuid(),
  provider_key text not null unique check (provider_key ~ '^[a-z0-9_]+$'),
  provider_name text not null,
  title text not null,
  summary text,
  body_markdown text not null default '',
  supports_cname_flattening boolean not null default false,
  supports_alias_record boolean not null default false,
  help_url text check (help_url is null or help_url ~ '^https://'),
  status public.cms_publish_status not null default 'draft',
  published_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.site_ssl_certificates(
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.site_project_domains(id) on delete cascade,
  provider text not null default 'platform_managed' check (provider in ('platform_managed','cloudflare','vercel','netlify','letsencrypt')),
  status public.ssl_status not null default 'not_requested',
  issuer text,
  common_name citext,
  subject_alt_names text[] not null default '{}',
  provider_certificate_ref text,                     -- 供應商憑證 ID（不存私鑰）
  issued_at timestamptz,
  expires_at timestamptz,
  auto_renew boolean not null default true,
  last_checked_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'active' or (issued_at is not null and expires_at is not null))
);

create table if not exists public.site_publish_targets(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  target_type text not null check (target_type in ('preview','platform_subdomain','custom_domain','static_export')),
  provider text not null default 'none' check (provider in ('none','cloudflare_pages','vercel','netlify','supabase_storage')),
  environment text not null default 'preview' check (environment in ('preview','production')),
  domain_id uuid references public.site_project_domains(id) on delete set null,
  base_url text check (base_url is null or base_url ~ '^https://'),
  provider_project_ref text,
  config jsonb not null default '{}'::jsonb,
  secret_refs jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_publish_targets_secret_refs_valid check (public.is_valid_secret_refs(secret_refs)),
  constraint site_publish_targets_config_no_secret check (not public.jsonb_has_secret_like_keys(config)),
  check (target_type <> 'custom_domain' or domain_id is not null)
);
create unique index if not exists uq_site_publish_targets_type_env
  on public.site_publish_targets(site_project_id, target_type, environment) where is_active;

-- 基礎設施部署紀錄（build / deploy job）
create table if not exists public.site_deployments(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  publish_target_id uuid references public.site_publish_targets(id) on delete set null,
  customer_site_deployment_id uuid references public.customer_site_deployments(id) on delete set null, -- 對應的內容版本
  status public.deployment_status not null default 'queued',
  trigger_type text not null default 'publish' check (trigger_type in ('manual','publish','schedule','template_update','rollback','domain_change')),
  is_dry_run boolean not null default true,          -- v1 不實際部署
  provider_deployment_id text,
  deployment_url text check (deployment_url is null or deployment_url ~ '^https://'),
  commit_ref text,
  build_log_url text check (build_log_url is null or build_log_url ~ '^https://'),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms int check (duration_ms is null or duration_ms >= 0),
  error_message text,
  triggered_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or started_at is null or finished_at >= started_at),
  check (status not in ('ready','failed','cancelled','skipped') or finished_at is not null)
);

-- 網域檢查紀錄：append-only
create table if not exists public.site_domain_check_logs(
  id uuid primary key default gen_random_uuid(),
  domain_id uuid not null references public.site_project_domains(id) on delete cascade,
  verification_id uuid references public.site_domain_verifications(id) on delete set null,
  check_type text not null check (check_type in ('txt','cname','a','aaaa','alias','ssl','http','redirect')),
  expected text,
  observed jsonb not null default '[]'::jsonb,
  result text not null check (result in ('pass','fail','error')),
  message text,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

commit;
