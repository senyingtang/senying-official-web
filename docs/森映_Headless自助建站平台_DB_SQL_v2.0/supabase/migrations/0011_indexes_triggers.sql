-- =====================================================================
-- 0011_indexes_triggers.sql
-- 1. v1.0 索引沿用（名稱不變）
-- 2. v2.0 查詢用複合索引
-- 3. 自動補齊「所有外鍵欄位」索引（避免漏建；schema_smoke_test 會驗證）
-- 4. 所有含 updated_at 的 public table 自動掛 set_updated_at trigger
-- 5. 資料一致性 trigger：跨網站 / 跨 workspace 關聯防呆、訂單狀態轉換、方案價格週期一致、網域正規化
-- 權限相關 guard trigger（最後一位 owner、access code、audit log、模板結構）放在 0012。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. v1.0 索引
-- ---------------------------------------------------------------------
create index if not exists idx_admin_profiles_role_active on public.admin_profiles(role,is_active);
create index if not exists idx_assets_created_at on public.cms_assets(created_at desc);
create index if not exists idx_pages_publish on public.cms_pages(status,published_at desc);
create index if not exists idx_sections_page_sort on public.cms_page_sections(page_id,sort_order) where is_enabled;
create index if not exists idx_seo_entity on public.seo_metadata(entity_type,entity_id);
create index if not exists idx_posts_publish on public.blog_posts(status,published_at desc);
create index if not exists idx_posts_category on public.blog_posts(category_id);
create index if not exists idx_products_publish on public.products(status,published_at desc,sort_order);
create index if not exists idx_services_publish on public.services(status,published_at desc,sort_order);
create index if not exists idx_cases_publish on public.case_studies(status,published_at desc,sort_order);
create index if not exists idx_faq_entity on public.faqs(entity_type,entity_id,sort_order) where is_published;
create index if not exists idx_nav_items_menu_sort on public.cms_navigation_items(menu_id,parent_id,sort_order) where is_active;
create index if not exists idx_inquiries_status_created on public.contact_inquiries(status,created_at desc);
create index if not exists idx_events_name_created on public.conversion_events(event_name,created_at desc);
create index if not exists idx_audit_entity_created on public.audit_logs(entity_type,entity_id,created_at desc);

-- ---------------------------------------------------------------------
-- 2. v2.0 複合索引
-- ---------------------------------------------------------------------
create index if not exists idx_audit_workspace_created on public.audit_logs(workspace_id, created_at desc) where workspace_id is not null;
create index if not exists idx_audit_actor_created on public.audit_logs(actor_id, created_at desc);

-- Commerce
create index if not exists idx_commerce_products_publish on public.commerce_products(status, published_at desc, sort_order) where is_visible;
create index if not exists idx_commerce_products_code on public.commerce_products(product_code);
create index if not exists idx_commerce_prices_product_active on public.commerce_product_prices(product_id, is_active, billing_interval);
create index if not exists idx_commerce_payment_methods_enabled on public.commerce_payment_methods(is_enabled, sort_order);
create index if not exists idx_checkout_sessions_status_expires on public.commerce_checkout_sessions(status, expires_at);
create index if not exists idx_orders_customer_created on public.commerce_orders(customer_user_id, created_at desc);
create index if not exists idx_orders_status_created on public.commerce_orders(status, created_at desc);
create index if not exists idx_orders_buyer_email on public.commerce_orders(buyer_email);
create index if not exists idx_payments_order_status on public.commerce_payments(order_id, status);
create index if not exists idx_payments_provider_trade_no on public.commerce_payments(provider, provider_trade_no) where provider_trade_no is not null;
create index if not exists idx_payments_status_deadline on public.commerce_payments(status, payment_deadline_at) where status in ('pending','awaiting_transfer');
create index if not exists idx_payment_tx_payment_occurred on public.commerce_payment_transactions(payment_id, occurred_at desc);
create index if not exists idx_webhook_events_processing on public.commerce_webhook_events(processing_status, received_at);
create index if not exists idx_webhook_events_provider_type on public.commerce_webhook_events(provider, event_type, received_at desc);
create index if not exists idx_coupons_active_window on public.commerce_coupons(is_active, starts_at, expires_at);
create index if not exists idx_refunds_status_created on public.commerce_refunds(status, created_at desc);

-- Subscription / Entitlement / Access Code
create index if not exists idx_subscriptions_customer_status on public.customer_subscriptions(customer_user_id, status);
create index if not exists idx_subscriptions_status_period_end on public.customer_subscriptions(status, current_period_end);
create index if not exists idx_subscription_periods_sub_start on public.subscription_periods(subscription_id, period_start desc);
create index if not exists idx_subscription_invoices_customer on public.subscription_invoices(customer_user_id, created_at desc);
create index if not exists idx_access_codes_status_expires on public.access_codes(status, expires_at);
create index if not exists idx_access_codes_holder on public.access_codes(issued_to_user_id, status);
create index if not exists idx_access_codes_holder_email on public.access_codes(issued_to_email) where issued_to_email is not null;
create index if not exists idx_access_code_redemptions_user_created on public.access_code_redemptions(user_id, created_at desc);
create index if not exists idx_user_entitlements_user_status on public.user_entitlements(user_id, status, expires_at);
create index if not exists idx_user_entitlements_workspace_status on public.user_entitlements(workspace_id, status) where workspace_id is not null;
create index if not exists idx_user_entitlements_status_expires on public.user_entitlements(status, expires_at) where expires_at is not null;
create index if not exists idx_usage_quotas_lookup on public.entitlement_usage_quotas(user_entitlement_id, usage_key, period_start desc);
create index if not exists idx_usage_events_entitlement_created on public.entitlement_usage_events(user_entitlement_id, created_at desc);

-- Workspace
create index if not exists idx_workspace_members_user_status on public.customer_workspace_members(user_id, status);
create index if not exists idx_workspace_members_ws_role on public.customer_workspace_members(workspace_id, role) where status = 'active';
create index if not exists idx_workspace_invitations_email_status on public.customer_workspace_invitations(email, status);
create index if not exists idx_workspaces_owner on public.customer_workspaces(owner_user_id, status);

-- Site builder
create index if not exists idx_site_projects_ws_status on public.customer_site_projects(workspace_id, status);
create index if not exists idx_site_pages_project_status on public.customer_site_pages(site_project_id, status, sort_order);
create index if not exists idx_site_sections_page_sort on public.customer_site_sections(page_id, sort_order) where is_enabled;
create index if not exists idx_site_fields_section_sort on public.customer_site_section_fields(section_id, sort_order);
create index if not exists idx_site_values_project_state on public.customer_site_content_values(site_project_id, content_state);
create index if not exists idx_site_values_section_state on public.customer_site_content_values(section_id, content_state);
create index if not exists idx_site_nav_items_menu_sort on public.customer_site_navigation_items(menu_id, parent_id, sort_order) where is_active;
create index if not exists idx_site_form_submissions_project_status on public.customer_site_form_submissions(site_project_id, status, created_at desc);
create index if not exists idx_site_assets_project_created on public.customer_site_assets(site_project_id, created_at desc);

-- Template
create index if not exists idx_site_templates_listing on public.site_templates(status, site_type, pricing_type, sort_order);
create index if not exists idx_site_template_versions_status on public.site_template_versions(template_id, status, published_at desc);
create index if not exists idx_site_template_sections_page_sort on public.site_template_sections(template_page_id, sort_order);
create index if not exists idx_site_template_fields_section_sort on public.site_template_fields(template_section_id, sort_order);
create index if not exists idx_site_template_licenses_ws_status on public.site_template_licenses(workspace_id, status);

-- Domain / Deployment
create index if not exists idx_site_domains_status_checked on public.site_project_domains(status, last_checked_at);
create index if not exists idx_site_domain_verifications_status on public.site_domain_verifications(status, last_checked_at);
create index if not exists idx_site_ssl_expires on public.site_ssl_certificates(status, expires_at);
create index if not exists idx_site_deployments_project_created on public.site_deployments(site_project_id, created_at desc);
create index if not exists idx_site_domain_check_logs_domain_checked on public.site_domain_check_logs(domain_id, checked_at desc);

-- AI
create index if not exists idx_ai_projects_ws_status on public.ai_article_projects(workspace_id, status);
create index if not exists idx_ai_keywords_project_status on public.ai_article_keywords(project_id, status, priority);
create index if not exists idx_ai_generations_project_status on public.ai_article_generations(project_id, status, created_at desc);
create index if not exists idx_ai_generations_ws_created on public.ai_article_generations(workspace_id, created_at desc);
create index if not exists idx_ai_outputs_project_status on public.ai_article_generation_outputs(project_id, status);
create index if not exists idx_ai_credits_ws_status on public.ai_article_usage_credits(workspace_id, status);

-- External
create index if not exists idx_external_connections_status on public.external_project_connections(status, audit_status);
create index if not exists idx_external_sync_logs_connection_started on public.external_project_sync_logs(connection_id, started_at desc);

-- ---------------------------------------------------------------------
-- 3. 自動補齊外鍵索引：任何外鍵欄位組合若不是既有索引的前綴欄位，就建立索引
-- ---------------------------------------------------------------------
do $$
declare
  fk record;
  idx_name text;
begin
  for fk in
    select c.conrelid, rel.relname as table_name, c.conname, c.conkey,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as column_list,
           (select string_agg(a.attname, '_' order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as column_names
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where c.contype = 'f' and n.nspname = 'public'
  loop
    if not exists (
      select 1 from pg_index i
      where i.indrelid = fk.conrelid
        and (i.indkey::int2[])[0:array_length(fk.conkey, 1) - 1] = fk.conkey
    ) then
      idx_name := 'idx_fk_' || fk.table_name || '_' || fk.column_names;
      if length(idx_name) > 63 then
        idx_name := left(idx_name, 50) || '_' || substr(md5(idx_name), 1, 12);
      end if;
      execute format('create index if not exists %I on public.%I (%s)', idx_name, fk.table_name, fk.column_list);
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. updated_at trigger：所有含 updated_at 欄位的 public table
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  for t in
    select c.table_name from information_schema.columns c
    join information_schema.tables tb on tb.table_schema = c.table_schema and tb.table_name = c.table_name and tb.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'updated_at'
    order by c.table_name
  loop
    execute format('drop trigger if exists trg_%I_updated_at on public.%I', t, t);
    execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5-1. 跨網站 / 跨 workspace 關聯一致性
-- enforce_parent_match(child_fk_column, parent_table, child_match_column, parent_match_column)
-- 例：customer_site_sections.page_id 指向的 page，其 site_project_id 必須等於 section.site_project_id。
-- 沒有此檢查時，A 網站的 editor 可能把資料掛到 B 網站的頁面（RLS 只檢查 site_project_id 欄位）。
-- security definer：查詢 parent 時不受 RLS 影響，只回傳通過 / 拒絕。
-- ---------------------------------------------------------------------
create or replace function public.enforce_parent_match() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_child jsonb := to_jsonb(new);
  v_fk_col text := tg_argv[0];
  v_parent_table text := tg_argv[1];
  v_child_match_col text := tg_argv[2];
  v_parent_match_col text := tg_argv[3];
  v_fk_value text := v_child ->> v_fk_col;
  v_parent_value text;
  v_found boolean;
begin
  if v_fk_value is null then
    return new;
  end if;
  execute format('select true, to_jsonb(p) ->> %L from public.%I p where p.id = $1::uuid', v_parent_match_col, v_parent_table)
    into v_found, v_parent_value using v_fk_value;
  if v_found is null then
    return new; -- 外鍵本身會處理不存在的情況
  end if;
  if (v_child ->> v_child_match_col) is distinct from v_parent_value then
    raise exception 'relation mismatch: %.% must belong to the same % as %',
      tg_table_name, v_fk_col, v_child_match_col, v_parent_table
      using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.enforce_parent_match() from public;

do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select * from (values
      -- (child_table, fk_column, parent_table, child_match_column, parent_match_column)
      ('customer_site_assets',            'site_project_id',   'customer_site_projects',          'workspace_id',     'workspace_id'),
      ('customer_site_project_settings',  'logo_asset_id',     'customer_site_assets',            'site_project_id',  'site_project_id'),
      ('customer_site_project_settings',  'favicon_asset_id',  'customer_site_assets',            'site_project_id',  'site_project_id'),
      ('customer_site_project_settings',  'default_og_image_asset_id', 'customer_site_assets',    'site_project_id',  'site_project_id'),
      ('customer_site_pages',             'og_image_asset_id', 'customer_site_assets',            'site_project_id',  'site_project_id'),
      ('customer_site_sections',          'page_id',           'customer_site_pages',             'site_project_id',  'site_project_id'),
      ('customer_site_section_fields',    'section_id',        'customer_site_sections',          'site_project_id',  'site_project_id'),
      ('customer_site_content_values',    'field_id',          'customer_site_section_fields',    'site_project_id',  'site_project_id'),
      ('customer_site_content_values',    'field_id',          'customer_site_section_fields',    'section_id',       'section_id'),
      ('customer_site_content_values',    'field_id',          'customer_site_section_fields',    'field_key',        'field_key'),
      ('customer_site_content_values',    'asset_id',          'customer_site_assets',            'site_project_id',  'site_project_id'),
      ('customer_site_navigation_items',  'menu_id',           'customer_site_navigation_menus',  'site_project_id',  'site_project_id'),
      ('customer_site_navigation_items',  'parent_id',         'customer_site_navigation_items',  'menu_id',          'menu_id'),
      ('customer_site_navigation_items',  'page_id',           'customer_site_pages',             'site_project_id',  'site_project_id'),
      ('customer_site_forms',             'page_id',           'customer_site_pages',             'site_project_id',  'site_project_id'),
      ('customer_site_form_fields',       'form_id',           'customer_site_forms',             'site_project_id',  'site_project_id'),
      ('customer_site_form_submissions',  'form_id',           'customer_site_forms',             'site_project_id',  'site_project_id'),
      ('customer_site_form_submissions',  'site_project_id',   'customer_site_projects',          'workspace_id',     'workspace_id'),
      ('customer_site_projects',          'entitlement_id',    'user_entitlements',               'workspace_id',     'workspace_id'),
      ('site_project_domains',            'site_project_id',   'customer_site_projects',          'workspace_id',     'workspace_id'),
      ('site_dns_instructions',           'domain_id',         'site_project_domains',            'site_project_id',  'site_project_id'),
      ('site_publish_targets',            'domain_id',         'site_project_domains',            'site_project_id',  'site_project_id'),
      ('site_deployments',                'publish_target_id', 'site_publish_targets',            'site_project_id',  'site_project_id'),
      ('site_deployments',                'customer_site_deployment_id', 'customer_site_deployments', 'site_project_id', 'site_project_id'),
      ('site_template_licenses',          'site_project_id',   'customer_site_projects',          'workspace_id',     'workspace_id'),
      ('site_template_sections',          'template_page_id',  'site_template_pages',             'template_version_id', 'template_version_id'),
      ('site_template_fields',            'template_section_id','site_template_sections',         'template_version_id', 'template_version_id'),
      ('site_template_preview_sites',     'template_version_id','site_template_versions',         'template_id',      'template_id'),
      ('ai_article_projects',             'site_project_id',   'customer_site_projects',          'workspace_id',     'workspace_id'),
      ('ai_article_projects',             'brand_profile_id',  'ai_article_brand_profiles',       'workspace_id',     'workspace_id'),
      ('ai_article_generations',          'project_id',        'ai_article_projects',             'workspace_id',     'workspace_id'),
      ('ai_article_generations',          'keyword_id',        'ai_article_keywords',             'project_id',       'project_id'),
      ('ai_article_generation_outputs',   'generation_id',     'ai_article_generations',          'workspace_id',     'workspace_id'),
      ('ai_article_generation_outputs',   'generation_id',     'ai_article_generations',          'project_id',       'project_id'),
      ('ai_article_exports',              'output_id',         'ai_article_generation_outputs',   'workspace_id',     'workspace_id'),
      ('ai_article_review_logs',          'output_id',         'ai_article_generation_outputs',   'workspace_id',     'workspace_id'),
      ('ai_article_usage_credits',        'user_entitlement_id','user_entitlements',              'workspace_id',     'workspace_id'),
      ('ai_article_usage_events',         'credit_id',         'ai_article_usage_credits',        'workspace_id',     'workspace_id')
    ) v(child_table, fk_column, parent_table, child_match_column, parent_match_column)
  loop
    n := n + 1;
    execute format('drop trigger if exists %I on public.%I', 'trg_match_' || lpad(n::text, 2, '0') || '_' || left(r.child_table || '_' || r.fk_column, 45), r.child_table);
    execute format(
      'create trigger %I before insert or update on public.%I for each row execute function public.enforce_parent_match(%L, %L, %L, %L)',
      'trg_match_' || lpad(n::text, 2, '0') || '_' || left(r.child_table || '_' || r.fk_column, 45),
      r.child_table, r.fk_column, r.parent_table, r.child_match_column, r.parent_match_column
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 5-2. 網域正規化（小寫、去除結尾 .、去除 http(s):// 與路徑）
-- ---------------------------------------------------------------------
create or replace function public.normalize_domain_name(input text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select nullif(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(coalesce(input, ''))), '^[a-z]+://', ''),
      '[/?#:].*$', ''),
    '\.$', ''),
  '')
$$;

create or replace function public.trg_normalize_site_domain() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  new.domain := public.normalize_domain_name(new.domain::text);
  return new;
end $$;
drop trigger if exists trg_site_project_domains_normalize on public.site_project_domains;
create trigger trg_site_project_domains_normalize before insert or update of domain on public.site_project_domains
  for each row execute function public.trg_normalize_site_domain();

-- ---------------------------------------------------------------------
-- 5-3. 訂單狀態轉換
-- ---------------------------------------------------------------------
create or replace function public.guard_order_status_transition() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (
    (old.status = 'pending'            and new.status in ('awaiting_payment','paid','cancelled','failed'))
    or (old.status = 'awaiting_payment' and new.status in ('pending','paid','cancelled','failed'))
    or (old.status = 'failed'           and new.status in ('pending','awaiting_payment','cancelled'))
    or (old.status = 'paid'             and new.status in ('fulfilled','refunded','partially_refunded'))
    or (old.status = 'fulfilled'        and new.status in ('refunded','partially_refunded'))
    or (old.status = 'partially_refunded' and new.status in ('refunded'))
  ) then
    raise exception 'invalid order status transition: % -> %', old.status, new.status using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists trg_commerce_orders_status_transition on public.commerce_orders;
create trigger trg_commerce_orders_status_transition before update of status on public.commerce_orders
  for each row execute function public.guard_order_status_transition();

-- ---------------------------------------------------------------------
-- 5-4. 訂閱方案價格週期必須與 commerce_product_prices 一致
-- ---------------------------------------------------------------------
create or replace function public.validate_subscription_plan_price() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_price record;
begin
  select billing_interval, interval_count into v_price
  from public.commerce_product_prices where id = new.commerce_product_price_id;
  if v_price.billing_interval is distinct from new.billing_interval
     or v_price.interval_count is distinct from new.interval_count then
    raise exception 'subscription_plan_prices interval must match commerce_product_prices' using errcode = '23514';
  end if;
  return new;
end $$;
revoke all on function public.validate_subscription_plan_price() from public;
drop trigger if exists trg_subscription_plan_prices_validate on public.subscription_plan_prices;
create trigger trg_subscription_plan_prices_validate before insert or update on public.subscription_plan_prices
  for each row execute function public.validate_subscription_plan_price();

-- ---------------------------------------------------------------------
-- 5-5. 內容值版本號遞增
-- ---------------------------------------------------------------------
create or replace function public.bump_site_content_version() returns trigger
language plpgsql set search_path = public, pg_temp as $$
begin
  if new.value is distinct from old.value or new.asset_id is distinct from old.asset_id then
    new.version := old.version + 1;
  end if;
  return new;
end $$;
drop trigger if exists trg_customer_site_content_values_version on public.customer_site_content_values;
create trigger trg_customer_site_content_values_version before update on public.customer_site_content_values
  for each row execute function public.bump_site_content_version();

commit;
