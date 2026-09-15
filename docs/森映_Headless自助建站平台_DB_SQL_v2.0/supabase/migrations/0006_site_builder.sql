-- =====================================================================
-- 0006_site_builder.sql
-- Customer Site Builder（模板制，不做自由拖拉）
--   * 第一版自助支援：seo_website（SEO 形象官網）、landing_page（一頁式網頁）
--   * 結構（page / section / field 定義）由模板實例化，客戶只能編輯內容、排序、啟用 / 停用
--   * 內容值以 content_state = draft / published 兩列保存：
--       編輯寫入 draft 列；publish_site_project() 複製為 published 列；前台只讀 published
--   * 前台（Astro）以 site_project_id 查詢；頁面 SEO 以 published_snapshot 為準
-- 模板外鍵（template_id / template_version_id / template_*_id）於 0007 補上。
-- =====================================================================
begin;

create table if not exists public.customer_site_projects(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.customer_workspaces(id) on delete restrict,
  name text not null check (length(name) between 1 and 120),
  slug citext not null check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug::text) between 3 and 63),
  site_type public.site_type not null,
  template_id uuid,                                  -- FK → site_templates（0007）
  template_version_id uuid,                          -- FK → site_template_versions（0007）
  entitlement_id uuid references public.user_entitlements(id) on delete set null,  -- 建立網站所消耗的權限
  status public.site_project_status not null default 'draft',
  default_locale text not null default 'zh-TW',
  published_version int not null default 0 check (published_version >= 0),
  published_at timestamptz,
  suspended_at timestamptz,
  suspended_reason text,
  archived_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.customer_site_assets(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  bucket text not null default 'customer-site-assets',
  storage_path text not null,                        -- {workspace_id}/{site_project_id}/{uuid}.{ext}
  public_url text,
  filename text not null,
  mime_type text not null,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  width int check (width is null or width > 0),
  height int check (height is null or height > 0),
  alt_text text,
  caption text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bucket, storage_path),
  check (storage_path like workspace_id::text || '/' || site_project_id::text || '/%')
);

create table if not exists public.customer_site_project_settings(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null unique references public.customer_site_projects(id) on delete cascade,
  site_name text,
  tagline text,
  logo_asset_id uuid references public.customer_site_assets(id) on delete set null,
  favicon_asset_id uuid references public.customer_site_assets(id) on delete set null,
  default_og_image_asset_id uuid references public.customer_site_assets(id) on delete set null,
  default_seo_title text check (default_seo_title is null or length(default_seo_title) <= 120),
  default_meta_description text check (default_meta_description is null or length(default_meta_description) <= 320),
  robots_default text not null default 'index,follow',
  contact_email citext,
  contact_phone text,
  contact_line_id text,
  address text,
  business_hours jsonb not null default '[]'::jsonb,
  social_links jsonb not null default '{}'::jsonb,
  organization_schema_json jsonb not null default '{}'::jsonb,  -- LocalBusiness / Organization JSON-LD
  ga4_measurement_id text check (ga4_measurement_id is null or ga4_measurement_id ~ '^G-[A-Z0-9]{4,16}$'),
  gtm_container_id text check (gtm_container_id is null or gtm_container_id ~ '^GTM-[A-Z0-9]{4,12}$'),
  google_site_verification text check (google_site_verification is null or google_site_verification ~ '^[A-Za-z0-9_-]{10,100}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_site_theme_settings(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null unique references public.customer_site_projects(id) on delete cascade,
  theme_variant text not null default 'default' check (theme_variant ~ '^[a-z0-9_-]{1,40}$'),  -- 模板允許的變體
  color_tokens jsonb not null default '{}'::jsonb,   -- {"primary":"#0F172A","secondary":"#14B8A6",...}
  typography jsonb not null default '{}'::jsonb,     -- {"heading":"Noto Sans TC","body":"Noto Sans TC"}
  radius text not null default 'md' check (radius in ('none','sm','md','lg','xl')),
  spacing_scale text not null default 'normal' check (spacing_scale in ('compact','normal','relaxed')),
  button_style text not null default 'solid' check (button_style in ('solid','outline','pill')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_site_pages(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  template_page_id uuid,                             -- FK → site_template_pages（0007）
  page_key text not null check (page_key ~ '^[a-z0-9_]+$'),
  page_type text not null default 'standard' check (page_type in ('home','standard','landing','contact','legal','custom')),
  title text not null,
  path text not null check (path ~ '^/$|^(/[a-z0-9]+(-[a-z0-9]+)*)+$'),
  h1 text,
  status public.cms_publish_status not null default 'draft',
  is_indexable boolean not null default true,
  -- SEO（每頁必備）
  seo_title text check (seo_title is null or length(seo_title) <= 120),
  meta_description text check (meta_description is null or length(meta_description) <= 320),
  canonical_url text check (canonical_url is null or canonical_url ~ '^(https://|/)'),
  og_title text,
  og_description text,
  og_image_asset_id uuid references public.customer_site_assets(id) on delete set null,
  robots text not null default 'index,follow',
  schema_json jsonb not null default '[]'::jsonb,
  -- 發布快照（前台讀取；草稿修改不影響已發布內容）
  published_snapshot jsonb,
  published_at timestamptz,
  scheduled_at timestamptz,
  show_in_navigation boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_project_id, page_key),
  unique (site_project_id, path),
  check (status <> 'published' or published_at is not null),
  check (jsonb_typeof(schema_json) in ('array','object'))
);

create table if not exists public.customer_site_sections(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  page_id uuid not null references public.customer_site_pages(id) on delete cascade,
  template_section_id uuid,                          -- FK → site_template_sections（0007）
  section_key text not null check (section_key ~ '^[a-z0-9_]+$'),
  section_type text not null check (section_type ~ '^[a-z0-9_]+$'),
  title text,
  settings jsonb not null default '{}'::jsonb,       -- 模板允許的 variant / layout 選項
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  visibility public.cms_visibility not null default 'all',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (page_id, section_key)
);

-- 欄位定義：由 site_template_fields 實例化，決定客戶後台看到哪些欄位
create table if not exists public.customer_site_section_fields(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  section_id uuid not null references public.customer_site_sections(id) on delete cascade,
  template_field_id uuid,                            -- FK → site_template_fields（0007）
  field_key text not null check (field_key ~ '^[a-z0-9_]+$'),
  label text not null,
  field_type public.site_field_type not null,
  is_required boolean not null default false,
  is_customer_editable boolean not null default true,
  validation_schema jsonb not null default '{}'::jsonb,  -- JSON Schema；應用層以 Zod 同步驗證
  options jsonb not null default '{}'::jsonb,
  default_value jsonb,
  help_text text,
  group_label text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, field_key)
);

create table if not exists public.customer_site_content_values(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  section_id uuid not null references public.customer_site_sections(id) on delete cascade,
  field_id uuid not null references public.customer_site_section_fields(id) on delete cascade,
  field_key text not null,
  locale text not null default 'zh-TW' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  content_state public.site_content_state not null default 'draft',
  value jsonb,
  asset_id uuid references public.customer_site_assets(id) on delete set null,
  version int not null default 1 check (version >= 1),
  published_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_id, locale, content_state),
  check (content_state <> 'published' or published_at is not null)
);

create table if not exists public.customer_site_navigation_menus(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  menu_key text not null check (menu_key ~ '^[a-z0-9_]+$'),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_project_id, menu_key)
);

create table if not exists public.customer_site_navigation_items(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  menu_id uuid not null references public.customer_site_navigation_menus(id) on delete cascade,
  parent_id uuid references public.customer_site_navigation_items(id) on delete cascade,
  label text not null check (length(label) between 1 and 60),
  link_type text not null default 'page' check (link_type in ('page','anchor','external')),
  page_id uuid references public.customer_site_pages(id) on delete cascade,
  anchor text check (anchor is null or anchor ~ '^#[A-Za-z0-9_-]+$'),
  url text check (url is null or url ~ '^(https://|mailto:|tel:)'),
  target text not null default '_self' check (target in ('_self','_blank')),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((link_type = 'page' and page_id is not null)
      or (link_type = 'anchor' and anchor is not null)
      or (link_type = 'external' and url is not null))
);

create table if not exists public.customer_site_footer_settings(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null unique references public.customer_site_projects(id) on delete cascade,
  copyright_text text,
  description text,
  columns jsonb not null default '[]'::jsonb,        -- [{title, links:[{label, page_id|url}]}]
  legal_links jsonb not null default '[]'::jsonb,
  show_social_links boolean not null default true,
  show_contact_info boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(columns) = 'array' and jsonb_typeof(legal_links) = 'array')
);

create table if not exists public.customer_site_forms(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  page_id uuid references public.customer_site_pages(id) on delete set null,
  form_key text not null check (form_key ~ '^[a-z0-9_]+$'),
  name text not null,
  is_active boolean not null default true,
  success_message text not null default '已收到您的訊息，我們會盡快與您聯繫。',
  redirect_path text check (redirect_path is null or redirect_path ~ '^/'),
  notification_emails citext[] not null default '{}',
  enable_honeypot boolean not null default true,
  enable_turnstile boolean not null default false,
  submission_retention_days int not null default 365 check (submission_retention_days between 30 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_project_id, form_key)
);

create table if not exists public.customer_site_form_fields(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  form_id uuid not null references public.customer_site_forms(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z0-9_]+$'),
  label text not null,
  field_type text not null check (field_type in ('text','email','tel','textarea','select','checkbox','radio','date','consent','hidden')),
  is_required boolean not null default false,
  placeholder text,
  options jsonb not null default '[]'::jsonb,
  max_length int not null default 2000 check (max_length between 1 and 10000),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, field_key)
);

create table if not exists public.customer_site_form_submissions(
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.customer_site_forms(id) on delete cascade,
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  payload jsonb not null,
  status text not null default 'new' check (status in ('new','read','replied','archived','spam')),
  source_path text,
  utm_source text, utm_medium text, utm_campaign text,
  consent_at timestamptz,
  ip_hash text,
  user_agent text,
  spam_score numeric(5,2),
  handled_by uuid references auth.users(id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

create table if not exists public.customer_site_publish_settings(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null unique references public.customer_site_projects(id) on delete cascade,
  -- v1：preview_only（不公開發布）；v2：platform_subdomain；v3：custom_domain
  publish_mode text not null default 'preview_only' check (publish_mode in ('preview_only','platform_subdomain','custom_domain')),
  is_public boolean not null default false,
  preview_enabled boolean not null default true,
  preview_token_sha256 text,
  preview_token_expires_at timestamptz,
  preview_noindex boolean not null default true,
  sitemap_enabled boolean not null default true,
  auto_deploy_on_publish boolean not null default false,
  last_published_at timestamptz,
  last_published_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (publish_mode <> 'preview_only' or not is_public)
);

-- 內容發布版本（content release）；基礎設施部署紀錄見 0008 site_deployments
create table if not exists public.customer_site_deployments(
  id uuid primary key default gen_random_uuid(),
  site_project_id uuid not null references public.customer_site_projects(id) on delete cascade,
  version_number int not null check (version_number >= 1),
  status text not null default 'published' check (status in ('published','superseded','rolled_back','failed')),
  content_snapshot jsonb not null default '{}'::jsonb,
  template_version_id uuid,                          -- FK → site_template_versions（0007）
  pages_count int not null default 0 check (pages_count >= 0),
  notes text,
  published_by uuid references auth.users(id) on delete set null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_project_id, version_number)
);

commit;
