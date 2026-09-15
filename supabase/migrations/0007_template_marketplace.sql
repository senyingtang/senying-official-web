-- =====================================================================
-- 0007_template_marketplace.sql
-- Template Marketplace
--   pricing_type：
--     free             免費版型：任何 workspace 皆可套用
--     paid             付費版型：購買後建立 site_template_licenses 才可套用 / 發布
--     plan_restricted  方案限定：workspace 需有 required_feature 的有效權限（或授權）
--     private          私人客製版型：僅 owner_workspace_id 可見可用；未來可轉為公開付費版型
--   未購買者可預覽（site_template_preview_sites），不可套用發布（can_use_template，0012）。
-- =====================================================================
begin;

create table if not exists public.site_template_categories(
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_templates(
  id uuid primary key default gen_random_uuid(),
  template_key citext not null unique check (template_key::text ~ '^[a-z0-9_]+$'),
  slug citext not null unique check (slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  short_description text,
  description text,
  site_type public.site_type not null,
  pricing_type public.template_pricing_type not null default 'free',
  required_feature_id uuid references public.entitlement_features(id) on delete restrict,   -- plan_restricted 必填
  owner_workspace_id uuid references public.customer_workspaces(id) on delete restrict,      -- private 必填
  source_template_id uuid references public.site_templates(id) on delete set null,           -- 由客製版型轉公開時記錄來源
  converted_to_public_at timestamptz,
  latest_version_id uuid,                                                                     -- FK 於下方補
  status public.cms_publish_status not null default 'draft',
  published_at timestamptz,
  is_featured boolean not null default false,
  preview_image_asset_id uuid references public.cms_assets(id) on delete set null,
  author_name text,
  sort_order int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null),
  check ((pricing_type = 'private') = (owner_workspace_id is not null)),
  check (pricing_type <> 'plan_restricted' or required_feature_id is not null)
);

create table if not exists public.site_template_versions(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete cascade,
  version text not null check (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  status text not null default 'draft' check (status in ('draft','published','deprecated')),
  -- Astro 前台模板入口（repo 相對路徑，不可為絕對路徑或含 ..）
  astro_entry_path text not null check (astro_entry_path ~ '^[A-Za-z0-9_./-]+$' and astro_entry_path !~ '(^/|\.\.)'),
  schema_json jsonb not null default '{}'::jsonb,           -- 模板整體結構 / 欄位 JSON Schema
  default_content_json jsonb not null default '{}'::jsonb,  -- {"pages":{"home":{"hero":{"heading":"..."}}}}
  theme_defaults_json jsonb not null default '{}'::jsonb,
  changelog text,
  min_platform_version text,
  published_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, version),
  check (status <> 'published' or published_at is not null),
  check (jsonb_typeof(schema_json) = 'object' and jsonb_typeof(default_content_json) = 'object')
);

do $$ begin
  alter table public.site_templates add constraint site_templates_latest_version_id_fkey
    foreign key (latest_version_id) references public.site_template_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.site_template_pages(
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.site_template_versions(id) on delete cascade,
  page_key text not null check (page_key ~ '^[a-z0-9_]+$'),
  page_type text not null default 'standard' check (page_type in ('home','standard','landing','contact','legal','custom')),
  title text not null,
  path text not null check (path ~ '^/$|^(/[a-z0-9]+(-[a-z0-9]+)*)+$'),
  is_required boolean not null default true,
  default_seo jsonb not null default '{}'::jsonb,   -- {seo_title, meta_description, h1, schema_json}
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_version_id, page_key),
  unique (template_version_id, path)
);

create table if not exists public.site_template_sections(
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.site_template_versions(id) on delete cascade,
  template_page_id uuid not null references public.site_template_pages(id) on delete cascade,
  section_key text not null check (section_key ~ '^[a-z0-9_]+$'),
  section_type text not null check (section_type ~ '^[a-z0-9_]+$'),
  name text not null,
  description text,
  is_required boolean not null default false,
  is_enabled_by_default boolean not null default true,
  allowed_variants text[] not null default array['default'],
  default_settings jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_page_id, section_key)
);

-- 模板欄位：定義客戶後台會看到哪些欄位
create table if not exists public.site_template_fields(
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.site_template_versions(id) on delete cascade,
  template_section_id uuid not null references public.site_template_sections(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z0-9_]+$'),
  label text not null,
  field_type public.site_field_type not null,
  is_required boolean not null default false,
  is_customer_editable boolean not null default true,  -- false = 客戶後台不顯示（由模板固定）
  group_label text,
  help_text text,
  placeholder text,
  validation_schema jsonb not null default '{}'::jsonb,
  options jsonb not null default '{}'::jsonb,
  default_value jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_section_id, field_key)
);

create table if not exists public.site_template_assets(
  id uuid primary key default gen_random_uuid(),
  template_version_id uuid not null references public.site_template_versions(id) on delete cascade,
  asset_role text not null default 'screenshot' check (asset_role in ('thumbnail','screenshot','preview_video','default_image')),
  cms_asset_id uuid references public.cms_assets(id) on delete set null,
  storage_path text,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cms_asset_id is not null or storage_path is not null)
);

create table if not exists public.site_template_category_links(
  template_id uuid not null references public.site_templates(id) on delete cascade,
  category_id uuid not null references public.site_template_categories(id) on delete cascade,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (template_id, category_id)
);

-- 版型 ↔ 可販售商品（付費版型、方案內含版型）
create table if not exists public.site_template_products(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete cascade,
  commerce_product_id uuid not null references public.commerce_products(id) on delete cascade,
  relation_type text not null default 'sells_template' check (relation_type in ('sells_template','included_in_plan')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (template_id, commerce_product_id)
);

create table if not exists public.site_template_purchases(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete restrict,
  workspace_id uuid not null references public.customer_workspaces(id) on delete restrict,
  user_id uuid references auth.users(id) on delete set null,
  order_id uuid references public.commerce_orders(id) on delete restrict,
  order_item_id uuid references public.commerce_order_items(id) on delete restrict,
  amount_cents bigint not null default 0 check (amount_cents >= 0),
  currency char(3) not null default 'TWD',
  status text not null default 'pending' check (status in ('pending','paid','refunded','cancelled')),
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'paid' or paid_at is not null)
);
create unique index if not exists uq_template_purchases_order_item
  on public.site_template_purchases(order_item_id) where order_item_id is not null;

create table if not exists public.site_template_licenses(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete restrict,
  license_scope text not null default 'workspace' check (license_scope in ('workspace','site_project')),
  workspace_id uuid not null references public.customer_workspaces(id) on delete cascade,
  site_project_id uuid references public.customer_site_projects(id) on delete cascade,
  source_type text not null check (source_type in ('purchase','plan','private_owner','admin_grant')),
  purchase_id uuid references public.site_template_purchases(id) on delete set null,
  user_entitlement_id uuid references public.user_entitlements(id) on delete set null,
  status public.template_license_status not null default 'active',
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((license_scope = 'site_project') = (site_project_id is not null)),
  check (source_type <> 'purchase' or purchase_id is not null),
  check (status <> 'revoked' or revoked_at is not null),
  check (expires_at is null or expires_at > starts_at)
);
create unique index if not exists uq_template_licenses_active_workspace
  on public.site_template_licenses(template_id, workspace_id)
  where status = 'active' and license_scope = 'workspace';

create table if not exists public.site_template_preview_sites(
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.site_templates(id) on delete cascade,
  template_version_id uuid not null references public.site_template_versions(id) on delete cascade,
  preview_slug citext not null unique check (preview_slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  preview_url text check (preview_url is null or preview_url ~ '^https://'),
  screenshot_asset_id uuid references public.cms_assets(id) on delete set null,
  is_active boolean not null default true,
  last_built_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 補 0003 / 0006 的模板外鍵
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.commerce_order_items add constraint commerce_order_items_template_id_fkey
    foreign key (template_id) references public.site_templates(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_projects add constraint customer_site_projects_template_id_fkey
    foreign key (template_id) references public.site_templates(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_projects add constraint customer_site_projects_template_version_id_fkey
    foreign key (template_version_id) references public.site_template_versions(id) on delete restrict;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_pages add constraint customer_site_pages_template_page_id_fkey
    foreign key (template_page_id) references public.site_template_pages(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_sections add constraint customer_site_sections_template_section_id_fkey
    foreign key (template_section_id) references public.site_template_sections(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_section_fields add constraint customer_site_section_fields_template_field_id_fkey
    foreign key (template_field_id) references public.site_template_fields(id) on delete set null;
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.customer_site_deployments add constraint customer_site_deployments_template_version_id_fkey
    foreign key (template_version_id) references public.site_template_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

commit;
