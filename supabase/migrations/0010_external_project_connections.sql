-- =====================================================================
-- 0010_external_project_connections.sql
-- 既有網站 / 工具接入森映 CMS 後台的紀錄（Hungjui、hero-booking、landlord-showcase、Mori 電商、SEO 文章生產器）。
-- 只記錄盤點與串接狀態；不存任何 .env 內容、API key 或 Supabase service role key（僅 secret_refs 參照）。
-- 本機路徑僅作為內部盤點提示（local_path_hint），前台與客戶不可讀取（0013 RLS：owner / admin）。
-- =====================================================================
begin;

create table if not exists public.external_project_connections(
  id uuid primary key default gen_random_uuid(),
  connection_key citext not null unique check (connection_key::text ~ '^[a-z0-9_]+$'),
  name text not null,
  project_kind text not null check (project_kind in ('brand_website','ecommerce_website','seo_tool','booking_app','showcase_app','customer_site','other')),
  framework text not null default 'unknown' check (framework in ('astro','nextjs','nextjs_monorepo','other','unknown')),
  local_path_hint text,
  repository_url text check (repository_url is null or repository_url ~ '^https://'),
  production_url text check (production_url is null or production_url ~ '^https://'),
  has_git boolean,
  has_env boolean,
  has_supabase boolean,
  supabase_project_ref text check (supabase_project_ref is null or supabase_project_ref ~ '^[a-z0-9]{20}$'),
  status public.external_connection_status not null default 'pending_audit',
  audit_status text not null default 'pending_audit' check (audit_status in ('pending_audit','partially_audited','audited','needs_review')),
  cms_integration_mode text not null default 'none' check (cms_integration_mode in ('none','read_only','sync_pull','sync_push','headless_api')),
  workspace_id uuid references public.customer_workspaces(id) on delete set null,
  site_project_id uuid references public.customer_site_projects(id) on delete set null,
  secret_refs jsonb not null default '{}'::jsonb,
  audit_notes text,
  last_audited_at timestamptz,
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_connections_secret_refs_valid check (public.is_valid_secret_refs(secret_refs)),
  constraint external_connections_metadata_no_secret check (not public.jsonb_has_secret_like_keys(metadata))
);

create table if not exists public.external_project_sync_logs(
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.external_project_connections(id) on delete cascade,
  sync_direction text not null check (sync_direction in ('audit','pull','push')),
  status text not null default 'started' check (status in ('started','succeeded','failed','partial')),
  entity_type text,
  records_processed int not null default 0 check (records_processed >= 0),
  records_failed int not null default 0 check (records_failed >= 0),
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  triggered_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (finished_at is null or finished_at >= started_at),
  check (not public.jsonb_has_secret_like_keys(summary))
);

create table if not exists public.external_project_cms_mappings(
  id uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.external_project_connections(id) on delete cascade,
  source_entity text not null check (source_entity in ('page','section','product','article','faq','setting','navigation','asset')),
  source_identifier text not null,                   -- 例：src/pages/about.astro、src/data/products.ts#items
  target_table text not null check (target_table in (
    'cms_pages','cms_page_sections','blog_posts','products','faqs','cms_site_settings','cms_navigation_items','cms_assets',
    'customer_site_pages','customer_site_sections','customer_site_content_values','customer_site_navigation_items','customer_site_assets'
  )),
  target_entity_id uuid,
  field_mappings jsonb not null default '{}'::jsonb, -- {"title":"frontmatter.title","body":"content"}
  sync_mode text not null default 'manual' check (sync_mode in ('manual','pull','push','bidirectional')),
  is_active boolean not null default true,
  last_synced_at timestamptz,
  last_sync_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (connection_id, source_entity, source_identifier)
);

do $$ begin
  alter table public.ai_article_projects add constraint ai_article_projects_external_connection_id_fkey
    foreign key (external_connection_id) references public.external_project_connections(id) on delete set null;
exception when duplicate_object then null; end $$;

commit;
