-- =====================================================================
-- schema_smoke_test.sql
-- 執行環境：本機 / 可丟棄的 Supabase（supabase start 後），以 postgres 身分執行。
--   psql "$LOCAL_DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/schema_smoke_test.sql
-- 驗證：資料表存在、RLS 全開、created_at / updated_at、外鍵索引、trigger、必要函式、權限、密鑰防呆。
-- 全程包在交易中並 rollback，不留下資料。任何 FAIL 會 raise exception 中止。
-- =====================================================================
begin;

-- 1. 必要資料表
do $$
declare
  v_expected text[] := array[
    -- v1.0 CMS baseline
    'admin_profiles','cms_site_settings','cms_assets','cms_pages','cms_page_sections','seo_metadata','seo_redirects',
    'blog_categories','blog_tags','blog_posts','blog_post_tags','products','product_features','services','service_features',
    'case_studies','case_metrics','case_assets','case_services','case_products','faqs','cta_blocks',
    'cms_navigation_menus','cms_navigation_items','contact_inquiries','conversion_events','audit_logs','customer_profiles',
    -- Commerce
    'commerce_products','commerce_product_prices','commerce_checkout_sessions','commerce_orders','commerce_order_items',
    'commerce_payments','commerce_payment_transactions','commerce_payment_provider_configs','commerce_payment_methods',
    'commerce_bank_transfer_accounts','commerce_coupons','commerce_coupon_redemptions','commerce_refunds','commerce_webhook_events',
    -- Subscription
    'subscription_plans','subscription_plan_prices','subscription_plan_features','customer_subscriptions',
    'subscription_invoices','subscription_periods','subscription_cancellations',
    -- Entitlements / Access codes
    'entitlement_products','entitlement_features','entitlement_feature_rules','access_codes','access_code_redemptions',
    'access_code_transfers','user_entitlements','entitlement_usage_events','entitlement_usage_quotas',
    -- Workspaces
    'customer_workspaces','customer_workspace_members','customer_workspace_invitations','customer_workspace_settings',
    -- Site builder
    'customer_site_projects','customer_site_project_settings','customer_site_pages','customer_site_sections',
    'customer_site_section_fields','customer_site_content_values','customer_site_theme_settings','customer_site_navigation_menus',
    'customer_site_navigation_items','customer_site_footer_settings','customer_site_assets','customer_site_forms',
    'customer_site_form_fields','customer_site_form_submissions','customer_site_publish_settings','customer_site_deployments',
    -- Template marketplace
    'site_templates','site_template_versions','site_template_pages','site_template_sections','site_template_fields',
    'site_template_assets','site_template_categories','site_template_category_links','site_template_products',
    'site_template_licenses','site_template_purchases','site_template_preview_sites',
    -- Domain / DNS / Deployment
    'site_project_domains','site_domain_verifications','site_dns_instructions','site_dns_provider_guides',
    'site_ssl_certificates','site_publish_targets','site_deployments','site_domain_check_logs',
    -- SEO article generator
    'ai_article_projects','ai_article_keywords','ai_article_generations','ai_article_generation_outputs','ai_article_exports',
    'ai_article_brand_profiles','ai_article_usage_credits','ai_article_usage_events','ai_article_review_logs',
    -- External projects
    'external_project_connections','external_project_sync_logs','external_project_cms_mappings'
  ];
  v_missing text[];
begin
  select array_agg(t) into v_missing from unnest(v_expected) t
  where to_regclass('public.' || t) is null;
  if v_missing is not null then
    raise exception 'FAIL missing tables: %', v_missing;
  end if;
  raise notice 'PASS % expected tables exist', array_length(v_expected, 1);
end $$;

-- 2. 所有 public table 啟用 RLS
do $$
declare v_bad text[];
begin
  select array_agg(tablename order by tablename) into v_bad from pg_tables where schemaname = 'public' and not rowsecurity;
  if v_bad is not null then
    raise exception 'FAIL RLS disabled on: %', v_bad;
  end if;
  raise notice 'PASS RLS enabled on all public tables';
end $$;

-- 3. 所有表都有 created_at；非 append-only 表都有 updated_at 且掛上 trigger
do $$
declare
  v_append_only text[] := array['audit_logs','conversion_events','commerce_payment_transactions','access_code_transfers',
    'access_code_redemptions','entitlement_usage_events','site_domain_check_logs','ai_article_usage_events','ai_article_review_logs',
    'blog_post_tags','case_assets','case_services','case_products','site_template_category_links'];
  v_no_created text[];
  v_no_updated text[];
  v_no_trigger text[];
begin
  select array_agg(t.tablename order by t.tablename) into v_no_created
  from pg_tables t where t.schemaname = 'public'
    and not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = 'created_at');
  if v_no_created is not null then
    raise exception 'FAIL tables without created_at: %', v_no_created;
  end if;

  select array_agg(t.tablename order by t.tablename) into v_no_updated
  from pg_tables t where t.schemaname = 'public' and t.tablename <> all(v_append_only)
    and not exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = 'updated_at');
  if v_no_updated is not null then
    raise exception 'FAIL non append-only tables without updated_at: %', v_no_updated;
  end if;

  select array_agg(c.table_name order by c.table_name) into v_no_trigger
  from information_schema.columns c
  join pg_tables t on t.schemaname = c.table_schema and t.tablename = c.table_name
  where c.table_schema = 'public' and c.column_name = 'updated_at'
    and not exists (select 1 from pg_trigger tg where tg.tgrelid = ('public.' || quote_ident(c.table_name))::regclass
                    and tg.tgname = 'trg_' || c.table_name || '_updated_at');
  if v_no_trigger is not null then
    raise exception 'FAIL updated_at trigger missing: %', v_no_trigger;
  end if;
  raise notice 'PASS created_at / updated_at / updated_at trigger coverage';
end $$;

-- 4. 外鍵欄位都有索引（外鍵欄位為某索引的前綴）
do $$
declare v_bad text[];
begin
  select array_agg(rel.relname || '(' || c.conname || ')' order by rel.relname) into v_bad
  from pg_constraint c
  join pg_class rel on rel.oid = c.conrelid
  join pg_namespace n on n.oid = rel.relnamespace
  where c.contype = 'f' and n.nspname = 'public'
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey
    );
  if v_bad is not null then
    raise exception 'FAIL foreign keys without index: %', v_bad;
  end if;
  raise notice 'PASS every foreign key is indexed';
end $$;

-- 5. 必要函式（可用規格簽章呼叫）
do $$
declare
  r record;
  v_missing text[] := '{}';
begin
  for r in select * from (values
    ('generate_access_code', array['text']),
    ('redeem_access_code', array['text']),
    ('current_admin_role', array[]::text[]),
    ('is_admin', array[]::text[]),
    ('is_owner', array[]::text[]),
    ('is_workspace_member', array['uuid']),
    ('has_workspace_role', array['uuid','text[]']),
    ('has_active_entitlement', array['uuid','text']),
    ('can_create_site_project', array['uuid']),
    ('can_use_template', array['uuid','uuid']),
    ('consume_usage_quota', array['uuid','text','integer']),
    ('create_workspace_from_access_code', array['text']),
    ('create_site_project_from_template', array['uuid','uuid']),
    ('generate_dns_instruction', array['text']),
    ('mark_payment_success_and_issue_entitlement', array['uuid'])
  ) v(fname, argtypes)
  loop
    if not exists (
      select 1 from pg_proc p
      where p.pronamespace = 'public'::regnamespace and p.proname = r.fname
        and p.pronargs - p.pronargdefaults <= coalesce(array_length(r.argtypes, 1), 0)
        and p.pronargs >= coalesce(array_length(r.argtypes, 1), 0)
        and (coalesce(array_length(r.argtypes, 1), 0) = 0
             or (select array_agg(format_type(t, null) order by ord) from unnest(p.proargtypes::oid[]) with ordinality u(t, ord)
                 where ord <= array_length(r.argtypes, 1)) = r.argtypes)
    ) then
      v_missing := v_missing || (r.fname || '(' || array_to_string(r.argtypes, ',') || ')');
    end if;
  end loop;
  if array_length(v_missing, 1) > 0 then
    raise exception 'FAIL missing functions: %', v_missing;
  end if;
  raise notice 'PASS required functions exist with spec-compatible signatures';
end $$;

-- 6. SECURITY DEFINER 函式都固定 search_path；敏感函式不可由 anon / authenticated 任意呼叫
do $$
declare v_bad text[];
begin
  select array_agg(p.proname) into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%');
  if v_bad is not null then
    raise exception 'FAIL security definer without search_path: %', v_bad;
  end if;

  select array_agg(distinct p.proname) into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('mark_payment_success_and_issue_entitlement','issue_access_code','generate_access_code','redeem_access_code',
                      'write_audit_log','_redeem_access_code_internal','consume_usage_quota','run_entitlement_expiry_job',
                      'create_site_project_from_template','create_workspace_from_access_code','record_subscription_renewal')
    and has_function_privilege('anon', p.oid, 'execute');
  if v_bad is not null then
    raise exception 'FAIL anon can execute: %', v_bad;
  end if;

  select array_agg(distinct p.proname) into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace
    and p.proname in ('write_audit_log','_redeem_access_code_internal','_site_create_entitlement','enforce_parent_match')
    and has_function_privilege('authenticated', p.oid, 'execute');
  if v_bad is not null then
    raise exception 'FAIL authenticated can execute internal functions: %', v_bad;
  end if;
  raise notice 'PASS function search_path and execute privileges';
end $$;

-- 7. 金流設定：預設全部停用、無商店代號、secret_refs 只有參照；public_config 放密鑰會被 CHECK 擋下
do $$
begin
  if exists (select 1 from public.commerce_payment_provider_configs where is_enabled) then
    raise exception 'FAIL seeded payment provider is enabled';
  end if;
  if exists (select 1 from public.commerce_payment_methods where is_enabled) then
    raise exception 'FAIL seeded payment method is enabled';
  end if;
  if exists (select 1 from public.commerce_payment_provider_configs where merchant_id is not null) then
    raise exception 'FAIL seeded merchant_id found';
  end if;
  if exists (select 1 from public.commerce_payment_provider_configs where not public.is_valid_secret_refs(secret_refs)) then
    raise exception 'FAIL invalid secret_refs';
  end if;
  begin
    insert into public.commerce_payment_provider_configs(provider, environment, display_name, public_config)
    values ('manual', 'sandbox', 'secret leak test', '{"HashKey":"should-not-be-here"}');
    raise exception 'FAIL public_config accepted secret-like key';
  exception when check_violation then
    null;
  end;
  begin
    insert into public.commerce_payment_provider_configs(provider, environment, display_name, secret_refs)
    values ('manual', 'production', 'secret value test', '{"hash_key":"plain-secret-value"}');
    raise exception 'FAIL secret_refs accepted a plain value';
  exception when check_violation then
    null;
  end;
  raise notice 'PASS payment provider secret guards';
end $$;

-- 8. 資料模型關鍵欄位：金流啟停、訂閱月 / 年、版型四種定價、AI 額度、外部專案盤點、DNS 教學
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='commerce_payment_methods' and column_name='is_enabled')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='commerce_payment_provider_configs' and column_name='is_enabled') then
    raise exception 'FAIL payment enable flags missing';
  end if;
  if enum_range(null::public.billing_interval)::text[] <> array['one_time','month','year'] then
    raise exception 'FAIL billing_interval enum mismatch';
  end if;
  if enum_range(null::public.template_pricing_type)::text[] <> array['free','paid','plan_restricted','private'] then
    raise exception 'FAIL template_pricing_type enum mismatch';
  end if;
  if enum_range(null::public.access_code_status)::text[] <> array['generated','issued','redeemed','expired','revoked'] then
    raise exception 'FAIL access_code_status enum mismatch';
  end if;
  if enum_range(null::public.workspace_member_role)::text[] <> array['owner','admin','editor','viewer'] then
    raise exception 'FAIL workspace_member_role enum mismatch';
  end if;
  if enum_range(null::public.cms_admin_role)::text[] <> array['owner','admin','editor','author','viewer'] then
    raise exception 'FAIL cms_admin_role enum mismatch (v1 roles must be kept)';
  end if;
  if (select count(*) from public.subscription_plan_prices where billing_interval in ('month','year')) < 2 then
    raise exception 'FAIL subscription month/year prices not seeded';
  end if;
  if not exists (select 1 from public.entitlement_feature_rules r join public.entitlement_features f on f.id = r.feature_id
                 where f.feature_key = 'ai.article.generate' and r.quota_amount is not null) then
    raise exception 'FAIL AI article quota rule missing';
  end if;
  if (select count(*) from public.external_project_connections where connection_key in
      ('hungjui_site','hero_booking','hero_booking_web','landlord_showcase','mori_ecommerce_site','seo_content_os')) <> 6 then
    raise exception 'FAIL external project connections not seeded';
  end if;
  if (select status from public.external_project_connections where connection_key = 'mori_ecommerce_site') <> 'pending_audit'
     or (select status from public.external_project_connections where connection_key = 'seo_content_os') <> 'pending_audit' then
    raise exception 'FAIL Mori / SEO tool must stay pending_audit';
  end if;
  if not exists (select 1 from public.site_dns_provider_guides) then
    raise exception 'FAIL DNS guides missing';
  end if;
  raise notice 'PASS key data model coverage';
end $$;

-- 9. Storage buckets
do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'SKIP storage schema not available';
    return;
  end if;
  if (select count(*) from storage.buckets where id in ('public-assets','private-admin-uploads','customer-site-assets','template-assets','ai-article-exports')) <> 5 then
    raise exception 'FAIL storage buckets missing';
  end if;
  raise notice 'PASS storage buckets';
end $$;

rollback;
