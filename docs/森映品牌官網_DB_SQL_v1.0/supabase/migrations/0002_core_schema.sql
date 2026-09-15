begin;
create or replace function public.set_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$
begin new.updated_at=now(); return new; end $$;

create table if not exists public.admin_profiles(
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role public.cms_admin_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_site_settings(
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique check(setting_key ~ '^[a-z0-9_.-]+$'),
  setting_value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cms_assets(
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'public-assets', storage_path text not null,
  public_url text, filename text not null, alt_text text, caption text,
  mime_type text not null, size_bytes bigint check(size_bytes is null or size_bytes>=0),
  width int check(width is null or width>0), height int check(height is null or height>0),
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(bucket,storage_path)
);

create table if not exists public.cms_pages(
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique, title text not null, page_type text not null default 'standard',
  excerpt text, content text, status public.cms_publish_status not null default 'draft',
  published_at timestamptz, scheduled_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(slug::text ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  check(status<>'published' or published_at is not null)
);

create table if not exists public.cms_page_sections(
  id uuid primary key default gen_random_uuid(), page_id uuid not null references public.cms_pages(id) on delete cascade,
  section_key text not null, section_type text not null, title text, subtitle text,
  content jsonb not null default '{}'::jsonb, asset_id uuid references public.cms_assets(id) on delete set null,
  cta_primary jsonb, cta_secondary jsonb, sort_order int not null default 0,
  is_enabled boolean not null default true, visibility public.cms_visibility not null default 'all',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(page_id,section_key)
);

create table if not exists public.seo_metadata(
  id uuid primary key default gen_random_uuid(), entity_type text not null, entity_id uuid not null,
  seo_title text, meta_description text, canonical_url text, robots text not null default 'index,follow',
  og_title text, og_description text, og_image_id uuid references public.cms_assets(id) on delete set null,
  twitter_card text not null default 'summary_large_image', primary_keyword text,
  schema_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(entity_type,entity_id)
);

create table if not exists public.seo_redirects(
 id uuid primary key default gen_random_uuid(), from_path text not null unique, to_path text not null,
 status_code smallint not null default 301 check(status_code in(301,302,307,308)), is_active boolean not null default true,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(from_path like '/%'), check(to_path like '/%' or to_path ~ '^https?://')
);

create table if not exists public.blog_categories(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, name text not null, description text,
 sort_order int not null default 0, is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.blog_tags(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.blog_posts(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, title text not null, excerpt text,
 content text not null default '', cover_asset_id uuid references public.cms_assets(id) on delete set null,
 category_id uuid references public.blog_categories(id) on delete set null, author_id uuid references auth.users(id) on delete set null,
 status public.cms_publish_status not null default 'draft', published_at timestamptz, scheduled_at timestamptz,
 is_featured boolean not null default false, reading_minutes int check(reading_minutes is null or reading_minutes>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or published_at is not null)
);
create table if not exists public.blog_post_tags(
 post_id uuid not null references public.blog_posts(id) on delete cascade, tag_id uuid not null references public.blog_tags(id) on delete cascade,
 primary key(post_id,tag_id)
);

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, name text not null, short_description text, description text,
 product_type text not null default 'web', cover_asset_id uuid references public.cms_assets(id) on delete set null,
 icon_asset_id uuid references public.cms_assets(id) on delete set null, external_url text, app_store_url text, play_store_url text,
 status public.cms_publish_status not null default 'draft', published_at timestamptz, is_featured boolean not null default false,
 sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or published_at is not null)
);
create table if not exists public.product_features(
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 title text not null, description text, icon text, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.services(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, name text not null, short_description text, description text,
 starting_price_cents bigint check(starting_price_cents is null or starting_price_cents>=0), currency char(3) not null default 'TWD',
 price_label text, cover_asset_id uuid references public.cms_assets(id) on delete set null,
 status public.cms_publish_status not null default 'draft', published_at timestamptz, is_featured boolean not null default false,
 sort_order int not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or published_at is not null)
);
create table if not exists public.service_features(
 id uuid primary key default gen_random_uuid(), service_id uuid not null references public.services(id) on delete cascade,
 title text not null, description text, icon text, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.case_studies(
 id uuid primary key default gen_random_uuid(), slug citext not null unique, title text not null, client_name text,
 summary text, challenge text, solution text, result text, cover_asset_id uuid references public.cms_assets(id) on delete set null,
 project_url text, status public.cms_publish_status not null default 'draft', published_at timestamptz,
 is_featured boolean not null default false, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(status<>'published' or published_at is not null)
);
create table if not exists public.case_metrics(
 id uuid primary key default gen_random_uuid(), case_id uuid not null references public.case_studies(id) on delete cascade,
 label text not null, value text not null, description text, sort_order int not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.case_assets(
 case_id uuid not null references public.case_studies(id) on delete cascade, asset_id uuid not null references public.cms_assets(id) on delete cascade,
 asset_role text not null default 'gallery', sort_order int not null default 0, primary key(case_id,asset_id)
);
create table if not exists public.case_services(
 case_id uuid not null references public.case_studies(id) on delete cascade, service_id uuid not null references public.services(id) on delete cascade,
 primary key(case_id,service_id)
);
create table if not exists public.case_products(
 case_id uuid not null references public.case_studies(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
 primary key(case_id,product_id)
);

create table if not exists public.faqs(
 id uuid primary key default gen_random_uuid(), question text not null, answer text not null,
 entity_type text, entity_id uuid, category text, sort_order int not null default 0,
 is_published boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cta_blocks(
 id uuid primary key default gen_random_uuid(), cta_key text not null unique, title text not null, description text,
 primary_label text, primary_url text, secondary_label text, secondary_url text,
 asset_id uuid references public.cms_assets(id) on delete set null, theme text not null default 'dark',
 is_active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.cms_navigation_menus(
 id uuid primary key default gen_random_uuid(), menu_key text not null unique, name text not null, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.cms_navigation_items(
 id uuid primary key default gen_random_uuid(), menu_id uuid not null references public.cms_navigation_menus(id) on delete cascade,
 parent_id uuid references public.cms_navigation_items(id) on delete cascade, label text not null, url text not null,
 target text not null default '_self' check(target in('_self','_blank')), sort_order int not null default 0, is_active boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.contact_inquiries(
 id uuid primary key default gen_random_uuid(), name text not null, email citext not null, phone text, company text,
 service_interest text, budget_range text, message text not null, source_path text, utm_source text, utm_medium text, utm_campaign text,
 status public.inquiry_status not null default 'new', assigned_to uuid references auth.users(id) on delete set null,
 internal_notes text, consent_at timestamptz not null, ip_hash text, user_agent text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.conversion_events(
 id bigint generated always as identity primary key, event_name text not null, source_path text,
 session_id text, anonymous_id text, user_id uuid references auth.users(id) on delete set null,
 properties jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table if not exists public.audit_logs(
 id bigint generated always as identity primary key, actor_id uuid references auth.users(id) on delete set null,
 action text not null, entity_type text not null, entity_id uuid, before_data jsonb, after_data jsonb,
 request_id text, ip_hash text, created_at timestamptz not null default now()
);
commit;
