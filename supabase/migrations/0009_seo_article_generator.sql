-- =====================================================================
-- 0009_seo_article_generator.sql
-- SEO 文章生產器
--   v1：森映內部使用（workspace_id is null，由 admin_profiles 角色操作）
--   v2：開放客戶（workspace_id 不為 null；需 platform flag + ai.article.generate 權限 + workspace 角色）
-- 支援：品牌資料、目標關鍵字、地區、語氣、禁止詞、SEO title / meta description / H1-H3 / FAQ / FAQ schema / HTML
-- 匯出：Markdown、HTML、WordPress HTML、JSON-LD
-- 狀態：draft → in_review → approved → published（rejected / archived）
-- AI provider API key 不存資料庫；Edge Function 以環境變數讀取。
-- =====================================================================
begin;

create table if not exists public.ai_article_brand_profiles(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,  -- null = 森映內部
  name text not null,
  brand_name text not null,
  industry text,
  target_audience text,
  default_region text,                               -- 例：台北市、台中市、全台
  default_locale text not null default 'zh-TW',
  tone text not null default 'natural' check (tone in ('natural','professional','friendly','authoritative','playful','custom')),
  tone_notes text,
  banned_terms text[] not null default '{}',         -- 禁止詞（例：專注於、致力於、賦能、一站式）
  preferred_terms text[] not null default '{}',
  brand_facts jsonb not null default '{}'::jsonb,    -- 可驗證事實（服務項目、年資、地址），避免 AI 捏造
  cta_defaults jsonb not null default '[]'::jsonb,
  internal_links jsonb not null default '[]'::jsonb, -- [{anchor, url}]
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_article_projects(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,  -- null = 森映內部
  access_scope text not null default 'internal' check (access_scope in ('internal','customer')),
  brand_profile_id uuid references public.ai_article_brand_profiles(id) on delete set null,
  site_project_id uuid references public.customer_site_projects(id) on delete set null,  -- 發布目標（客戶網站）
  external_connection_id uuid,                       -- FK → external_project_connections（0010）
  name text not null,
  description text,
  default_locale text not null default 'zh-TW',
  default_region text,
  default_tone text,
  banned_terms text[] not null default '{}',
  target_word_count int not null default 2000 check (target_word_count between 300 and 10000),
  status text not null default 'active' check (status in ('active','paused','archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((access_scope = 'internal') = (workspace_id is null))
);

create table if not exists public.ai_article_keywords(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ai_article_projects(id) on delete cascade,
  keyword text not null check (length(keyword) between 1 and 200),
  secondary_keywords text[] not null default '{}',
  search_intent text check (search_intent is null or search_intent in ('informational','commercial','transactional','navigational','local')),
  region text,
  locale text not null default 'zh-TW',
  search_volume int check (search_volume is null or search_volume >= 0),
  keyword_difficulty int check (keyword_difficulty is null or keyword_difficulty between 0 and 100),
  priority int not null default 3 check (priority between 1 and 5),
  cluster text,
  target_url text,
  status text not null default 'backlog' check (status in ('backlog','planned','generating','drafted','published','skipped')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_ai_article_keywords_project_keyword_region
  on public.ai_article_keywords(project_id, lower(keyword), coalesce(region, ''));

create table if not exists public.ai_article_usage_credits(
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,  -- null = 森映內部額度
  user_entitlement_id uuid references public.user_entitlements(id) on delete cascade,
  entitlement_usage_quota_id uuid references public.entitlement_usage_quotas(id) on delete set null,  -- 權限額度來源時，以 quota 為準
  source_type text not null check (source_type in ('entitlement','subscription','admin_grant','purchase','internal')),
  credits_total int not null check (credits_total >= 0),
  credits_used int not null default 0 check (credits_used >= 0),
  period_start timestamptz not null default now(),
  period_end timestamptz,
  status text not null default 'active' check (status in ('active','exhausted','expired','revoked')),
  granted_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credits_used <= credits_total),
  check (period_end is null or period_end > period_start),
  check (source_type not in ('entitlement','subscription') or user_entitlement_id is not null)
);

create table if not exists public.ai_article_generations(
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.ai_article_projects(id) on delete cascade,
  keyword_id uuid references public.ai_article_keywords(id) on delete set null,
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,
  brand_profile_id uuid references public.ai_article_brand_profiles(id) on delete set null,
  requested_by uuid references auth.users(id) on delete set null,
  status public.ai_generation_status not null default 'queued',
  target_keyword text not null,
  secondary_keywords text[] not null default '{}',
  region text,
  locale text not null default 'zh-TW',
  tone text,
  banned_terms text[] not null default '{}',
  word_count_target int check (word_count_target is null or word_count_target between 300 and 10000),
  include_faq boolean not null default true,
  faq_count int not null default 5 check (faq_count between 0 and 20),
  outline_json jsonb,
  input_params jsonb not null default '{}'::jsonb,
  prompt_version text,
  model_provider text,                               -- 例：anthropic
  model_name text,                                   -- 例：claude-sonnet-5（不存 API key）
  credits_charged int not null default 0 check (credits_charged >= 0),
  tokens_input int check (tokens_input is null or tokens_input >= 0),
  tokens_output int check (tokens_output is null or tokens_output >= 0),
  idempotency_key text unique,
  error_message text,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (not public.jsonb_has_secret_like_keys(input_params)),
  check (status not in ('succeeded','failed','cancelled') or completed_at is not null)
);

create table if not exists public.ai_article_generation_outputs(
  id uuid primary key default gen_random_uuid(),
  generation_id uuid not null references public.ai_article_generations(id) on delete cascade,
  project_id uuid not null references public.ai_article_projects(id) on delete cascade,
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,
  version int not null default 1 check (version >= 1),
  status public.ai_content_status not null default 'draft',
  seo_title text check (seo_title is null or length(seo_title) <= 120),
  meta_description text check (meta_description is null or length(meta_description) <= 320),
  slug text check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  h1 text,
  headings jsonb not null default '[]'::jsonb,       -- [{level:2|3, text, anchor}]
  body_markdown text,
  body_html text,                                    -- 輸出前需 sanitize
  faq jsonb not null default '[]'::jsonb,            -- [{question, answer}]
  faq_schema_json jsonb,                             -- FAQPage JSON-LD
  article_schema_json jsonb,                         -- Article JSON-LD
  internal_links jsonb not null default '[]'::jsonb,
  word_count int check (word_count is null or word_count >= 0),
  banned_terms_found text[] not null default '{}',
  quality_checks jsonb not null default '{}'::jsonb, -- {h1_count, title_length, description_length, keyword_density ...}
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  approved_at timestamptz,
  published_at timestamptz,
  published_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (generation_id, version),
  check (jsonb_typeof(headings) = 'array' and jsonb_typeof(faq) = 'array'),
  check (status <> 'approved' or approved_at is not null),
  check (status <> 'published' or published_at is not null)
);

create table if not exists public.ai_article_exports(
  id uuid primary key default gen_random_uuid(),
  output_id uuid not null references public.ai_article_generation_outputs(id) on delete cascade,
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,
  format public.ai_export_format not null,
  target text not null default 'download' check (target in ('download','customer_site','cms_blog','wordpress','external_project')),
  target_ref text,
  content text,
  storage_path text,                                 -- ai-article-exports bucket
  file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0),
  status text not null default 'completed' check (status in ('pending','completed','failed')),
  error_message text,
  exported_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_article_usage_events(
  id uuid primary key default gen_random_uuid(),
  credit_id uuid references public.ai_article_usage_credits(id) on delete set null,
  generation_id uuid references public.ai_article_generations(id) on delete set null,
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,
  entitlement_usage_event_id uuid references public.entitlement_usage_events(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('consume','refund','grant','expire','adjust')),
  credits int not null,
  balance_after int,
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 審核紀錄：append-only
create table if not exists public.ai_article_review_logs(
  id uuid primary key default gen_random_uuid(),
  output_id uuid not null references public.ai_article_generation_outputs(id) on delete cascade,
  generation_id uuid references public.ai_article_generations(id) on delete set null,
  workspace_id uuid references public.customer_workspaces(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('submit','approve','reject','request_changes','publish','unpublish','archive','comment')),
  from_status public.ai_content_status,
  to_status public.ai_content_status,
  comment text,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

commit;
