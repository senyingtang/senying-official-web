-- =====================================================================
-- 0013_rls.sql
-- Row Level Security（第二道防線；第一道為 Next.js Server Actions / Route Handlers 的角色與 Zod 驗證）
--
-- 原則：
--   * public schema 所有資料表一律 enable RLS（迴圈自動套用，新增表不會漏）
--   * 本檔開頭先移除 public schema 既有 policy 後重建，v1.0 環境升級可重複執行
--   * 公開前台：只讀已發布內容（森映官網 + 已公開發布的客戶網站 + 公開版型 / 方案）
--   * 森映官方 CMS：admin_profiles 角色（owner / admin / editor / author / viewer）
--   * 客戶：只能讀寫自己 workspace / site project；結構與敏感欄位另由 0012 guard trigger 限制
--   * 金流設定、Webhook 原始 payload、外部專案接入：owner / admin
--   * audit_logs：owner / admin 讀取；後台帳號只能新增自己的紀錄；不可修改（trigger）
--   * access_codes：只有持有者 / 兌換者可讀自己的代碼；兌換一律經 redeem_access_code()
--   * 沒有 policy 的操作 = 拒絕（service_role 繞過 RLS，僅限伺服器端）
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 0. 重置 public schema policy、啟用 RLS
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- =====================================================================
-- 1. 森映官方 CMS（v1.0 沿用，audit_logs 收緊）
-- =====================================================================
-- 1-1 Public read
create policy pages_public_read on public.cms_pages for select using (public.is_publicly_visible(status, published_at, scheduled_at));
create policy sections_public_read on public.cms_page_sections for select using (
  is_enabled and exists (select 1 from public.cms_pages p where p.id = page_id and public.is_publicly_visible(p.status, p.published_at, p.scheduled_at)));
create policy site_public_read on public.cms_site_settings for select using (is_public);
create policy assets_public_read on public.cms_assets for select using (bucket = 'public-assets');
create policy seo_public_read on public.seo_metadata for select using (true);
create policy redirects_public_read on public.seo_redirects for select using (is_active);
create policy categories_public_read on public.blog_categories for select using (is_active);
create policy tags_public_read on public.blog_tags for select using (true);
create policy posts_public_read on public.blog_posts for select using (public.is_publicly_visible(status, published_at, scheduled_at));
create policy post_tags_public_read on public.blog_post_tags for select using (
  exists (select 1 from public.blog_posts p where p.id = post_id and public.is_publicly_visible(p.status, p.published_at, p.scheduled_at)));
create policy products_public_read on public.products for select using (public.is_publicly_visible(status, published_at, null));
create policy product_features_public_read on public.product_features for select using (
  exists (select 1 from public.products p where p.id = product_id and public.is_publicly_visible(p.status, p.published_at, null)));
create policy services_public_read on public.services for select using (public.is_publicly_visible(status, published_at, null));
create policy service_features_public_read on public.service_features for select using (
  exists (select 1 from public.services s where s.id = service_id and public.is_publicly_visible(s.status, s.published_at, null)));
create policy cases_public_read on public.case_studies for select using (public.is_publicly_visible(status, published_at, null));
create policy case_metrics_public_read on public.case_metrics for select using (
  exists (select 1 from public.case_studies c where c.id = case_id and public.is_publicly_visible(c.status, c.published_at, null)));
create policy case_assets_public_read on public.case_assets for select using (
  exists (select 1 from public.case_studies c where c.id = case_id and public.is_publicly_visible(c.status, c.published_at, null)));
create policy case_services_public_read on public.case_services for select using (
  exists (select 1 from public.case_studies c where c.id = case_id and public.is_publicly_visible(c.status, c.published_at, null)));
create policy case_products_public_read on public.case_products for select using (
  exists (select 1 from public.case_studies c where c.id = case_id and public.is_publicly_visible(c.status, c.published_at, null)));
create policy faqs_public_read on public.faqs for select using (is_published);
create policy ctas_public_read on public.cta_blocks for select using (is_active);
create policy menus_public_read on public.cms_navigation_menus for select using (is_active);
create policy nav_items_public_read on public.cms_navigation_items for select using (
  is_active and exists (select 1 from public.cms_navigation_menus m where m.id = menu_id and m.is_active));

-- 1-2 後台角色讀取（所有 CMS 表）
create policy admin_profiles_staff_read on public.admin_profiles for select to authenticated using (public.is_cms_staff() or user_id = auth.uid());
do $$
declare t text;
begin
  foreach t in array array['cms_site_settings','cms_assets','cms_pages','cms_page_sections','seo_metadata','seo_redirects','blog_categories','blog_tags',
    'blog_posts','blog_post_tags','products','product_features','services','service_features','case_studies','case_metrics','case_assets',
    'case_services','case_products','faqs','cta_blocks','cms_navigation_menus','cms_navigation_items','contact_inquiries','conversion_events'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_cms_staff())', t || '_staff_read', t);
  end loop;
end $$;

-- 1-3 owner 管理後台帳號（最後一位 owner 由 trigger 保護）
create policy admin_profiles_owner_insert on public.admin_profiles for insert to authenticated with check (public.is_owner());
create policy admin_profiles_owner_update on public.admin_profiles for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy admin_profiles_owner_delete on public.admin_profiles for delete to authenticated using (public.is_owner());

-- 1-4 owner / admin：系統設定、轉址、選單
do $$
declare t text;
begin
  foreach t in array array['cms_site_settings','seo_redirects','cms_navigation_menus','cms_navigation_items'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
end $$;

-- 1-5 owner / admin / editor：內容
do $$
declare t text;
begin
  foreach t in array array['cms_assets','cms_pages','cms_page_sections','seo_metadata','blog_categories','blog_tags','blog_post_tags','products',
    'product_features','services','service_features','case_studies','case_metrics','case_assets','case_services','case_products','faqs','cta_blocks'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.can_publish_content()) with check (public.can_publish_content())', t || '_editor_manage', t);
  end loop;
end $$;

-- 1-6 文章：author 只能管理自己的 draft / review
create policy posts_editor_manage on public.blog_posts for all to authenticated using (public.can_publish_content()) with check (public.can_publish_content());
create policy posts_author_insert on public.blog_posts for insert to authenticated with check (public.current_admin_role() = 'author' and author_id = auth.uid() and status in ('draft','review'));
create policy posts_author_update on public.blog_posts for update to authenticated using (public.current_admin_role() = 'author' and author_id = auth.uid())
  with check (public.current_admin_role() = 'author' and author_id = auth.uid() and status in ('draft','review'));
create policy posts_author_delete on public.blog_posts for delete to authenticated using (public.current_admin_role() = 'author' and author_id = auth.uid() and status <> 'published');

-- 1-7 詢問 / 事件 / 稽核
create policy inquiries_public_insert on public.contact_inquiries for insert to anon, authenticated
  with check (consent_at is not null and length(name) between 1 and 120 and length(message) between 10 and 5000 and status = 'new' and assigned_to is null and internal_notes is null);
create policy inquiries_manage on public.contact_inquiries for update to authenticated using (public.can_publish_content()) with check (public.can_publish_content());
create policy inquiries_admin_delete on public.contact_inquiries for delete to authenticated using (public.is_admin());
create policy events_public_insert on public.conversion_events for insert to anon, authenticated
  with check (length(event_name) between 1 and 100 and (user_id is null or user_id = auth.uid()));
create policy events_admin_delete on public.conversion_events for delete to authenticated using (public.is_admin());
create policy audit_admin_read on public.audit_logs for select to authenticated using (public.is_admin());
create policy audit_staff_insert on public.audit_logs for insert to authenticated
  with check (public.is_cms_staff() and actor_id = auth.uid() and actor_type = 'admin');

-- 1-8 客戶基本資料
create policy customer_profiles_own_read on public.customer_profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy customer_profiles_own_insert on public.customer_profiles for insert to authenticated with check (user_id = auth.uid());
create policy customer_profiles_own_update on public.customer_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy customer_profiles_admin_manage on public.customer_profiles for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 2. Commerce / Checkout
-- =====================================================================
create policy commerce_products_public_read on public.commerce_products for select
  using (is_visible and public.is_publicly_visible(status, published_at, null));
create policy commerce_prices_public_read on public.commerce_product_prices for select
  using (is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
         and exists (select 1 from public.commerce_products p where p.id = product_id and p.is_visible and public.is_publicly_visible(p.status, p.published_at, null)));

-- 顧客：自己的結帳、訂單與付款；workspace owner / admin 可看 workspace 訂單
create policy checkout_sessions_own_read on public.commerce_checkout_sessions for select to authenticated using (customer_user_id = auth.uid());
create policy orders_customer_read on public.commerce_orders for select to authenticated
  using (customer_user_id = auth.uid() or (workspace_id is not null and public.current_workspace_role(workspace_id) in ('owner','admin')));
create policy order_items_customer_read on public.commerce_order_items for select to authenticated
  using (exists (select 1 from public.commerce_orders o where o.id = order_id));
create policy payments_customer_read on public.commerce_payments for select to authenticated
  using (exists (select 1 from public.commerce_orders o where o.id = order_id));
create policy refunds_customer_read on public.commerce_refunds for select to authenticated
  using (exists (select 1 from public.commerce_orders o where o.id = order_id));
create policy coupon_redemptions_own_read on public.commerce_coupon_redemptions for select to authenticated using (user_id = auth.uid());

-- owner / admin 全權管理（含金流設定、銀行帳戶、優惠碼）
do $$
declare t text;
begin
  foreach t in array array['commerce_products','commerce_product_prices','commerce_payment_provider_configs','commerce_payment_methods',
    'commerce_bank_transfer_accounts','commerce_coupons','commerce_checkout_sessions','commerce_orders','commerce_order_items',
    'commerce_payments','commerce_coupon_redemptions','commerce_refunds'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
end $$;
-- 其他後台角色可看商品目錄
create policy commerce_products_staff_read on public.commerce_products for select to authenticated using (public.is_cms_staff());
create policy commerce_prices_staff_read on public.commerce_product_prices for select to authenticated using (public.is_cms_staff());

-- ledger / webhook：owner / admin 只讀（寫入僅 service role 或 SECURITY DEFINER 函式）
create policy payment_transactions_admin_read on public.commerce_payment_transactions for select to authenticated using (public.is_admin());
create policy webhook_events_admin_read on public.commerce_webhook_events for select to authenticated using (public.is_admin());
create policy webhook_events_admin_update on public.commerce_webhook_events for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- 3. Subscription / Entitlement / Access Code
-- =====================================================================
create policy subscription_plans_public_read on public.subscription_plans for select using (is_active and is_public);
create policy subscription_plan_prices_public_read on public.subscription_plan_prices for select
  using (is_active and exists (select 1 from public.subscription_plans p where p.id = plan_id and p.is_active and p.is_public));
create policy subscription_plan_features_public_read on public.subscription_plan_features for select
  using (exists (select 1 from public.subscription_plans p where p.id = plan_id and p.is_active and p.is_public));
create policy entitlement_features_public_read on public.entitlement_features for select using (is_active);
create policy entitlement_products_public_read on public.entitlement_products for select using (is_active);
create policy entitlement_rules_public_read on public.entitlement_feature_rules for select
  using (exists (select 1 from public.entitlement_products p where p.id = entitlement_product_id and p.is_active));

create policy customer_subscriptions_customer_read on public.customer_subscriptions for select to authenticated
  using (customer_user_id = auth.uid() or (workspace_id is not null and public.current_workspace_role(workspace_id) in ('owner','admin')));
create policy subscription_periods_customer_read on public.subscription_periods for select to authenticated
  using (exists (select 1 from public.customer_subscriptions s where s.id = subscription_id));
create policy subscription_invoices_customer_read on public.subscription_invoices for select to authenticated
  using (customer_user_id = auth.uid() or exists (select 1 from public.customer_subscriptions s where s.id = subscription_id));
create policy subscription_cancellations_customer_read on public.subscription_cancellations for select to authenticated
  using (exists (select 1 from public.customer_subscriptions s where s.id = subscription_id));

-- 代碼：只有持有者或兌換者看得到完整資料（其他客戶查不到）
create policy access_codes_holder_read on public.access_codes for select to authenticated
  using (issued_to_user_id = auth.uid() or redeemed_by_user_id = auth.uid());
create policy access_codes_admin_read on public.access_codes for select to authenticated using (public.is_admin());
create policy access_codes_admin_update on public.access_codes for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy access_code_transfers_party_read on public.access_code_transfers for select to authenticated
  using (from_user_id = auth.uid() or to_user_id = auth.uid() or public.is_admin());
create policy access_code_redemptions_own_read on public.access_code_redemptions for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy user_entitlements_customer_read on public.user_entitlements for select to authenticated
  using (user_id = auth.uid() or (workspace_id is not null and public.current_workspace_role(workspace_id) in ('owner','admin')));
create policy usage_quotas_customer_read on public.entitlement_usage_quotas for select to authenticated
  using (exists (select 1 from public.user_entitlements ue where ue.id = user_entitlement_id));
create policy usage_events_customer_read on public.entitlement_usage_events for select to authenticated
  using (exists (select 1 from public.user_entitlements ue where ue.id = user_entitlement_id));

do $$
declare t text;
begin
  foreach t in array array['subscription_plans','subscription_plan_prices','subscription_plan_features','customer_subscriptions',
    'subscription_periods','subscription_invoices','subscription_cancellations','entitlement_features','entitlement_products',
    'entitlement_feature_rules','user_entitlements','entitlement_usage_quotas'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
  foreach t in array array['entitlement_usage_events'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_admin_read', t);
  end loop;
end $$;

-- =====================================================================
-- 4. Customer Workspaces
-- =====================================================================
create policy workspaces_member_read on public.customer_workspaces for select to authenticated
  using (public.is_workspace_member(id) or public.is_admin());
create policy workspaces_owner_admin_update on public.customer_workspaces for update to authenticated
  using (public.has_workspace_role(id, array['owner','admin'])) with check (public.has_workspace_role(id, array['owner','admin']));
create policy workspaces_admin_manage on public.customer_workspaces for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy workspace_members_member_read on public.customer_workspace_members for select to authenticated
  using (public.is_workspace_member(workspace_id) or public.is_admin());
create policy workspace_members_manage_insert on public.customer_workspace_members for insert to authenticated
  with check (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());
create policy workspace_members_manage_update on public.customer_workspace_members for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin())
  with check (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());
create policy workspace_members_manage_delete on public.customer_workspace_members for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or user_id = auth.uid() or public.is_admin());

create policy workspace_invitations_manage_read on public.customer_workspace_invitations for select to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());
create policy workspace_invitations_manage_update on public.customer_workspace_invitations for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin())
  with check (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());
create policy workspace_invitations_manage_delete on public.customer_workspace_invitations for delete to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());

create policy workspace_settings_member_read on public.customer_workspace_settings for select to authenticated
  using (public.is_workspace_member(workspace_id) or public.is_admin());
create policy workspace_settings_manage_update on public.customer_workspace_settings for update to authenticated
  using (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin())
  with check (public.has_workspace_role(workspace_id, array['owner','admin']) or public.is_admin());

-- =====================================================================
-- 5. Customer Site Builder
-- =====================================================================
create policy site_projects_member_read on public.customer_site_projects for select to authenticated using (public.can_read_site_project(id));
create policy site_projects_manage_update on public.customer_site_projects for update to authenticated
  using (public.can_manage_site_project(id)) with check (public.can_manage_site_project(id));
create policy site_projects_admin_manage on public.customer_site_projects for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy site_projects_public_read on public.customer_site_projects for select using (public.is_site_publicly_visible(id));

-- 成員讀取、editor 以上寫入（結構限制見 guard_customer_site_structure）
do $$
declare t text;
begin
  foreach t in array array['customer_site_project_settings','customer_site_theme_settings','customer_site_pages','customer_site_sections',
    'customer_site_section_fields','customer_site_content_values','customer_site_navigation_menus','customer_site_navigation_items',
    'customer_site_footer_settings','customer_site_assets','customer_site_forms','customer_site_form_fields'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.can_read_site_project(site_project_id))', t || '_member_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_site_project(site_project_id))', t || '_editor_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_site_project(site_project_id)) with check (public.can_edit_site_project(site_project_id))', t || '_editor_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_site_project(site_project_id))', t || '_editor_delete', t);
  end loop;
end $$;

-- 發布設定：owner / admin；內容版本：成員唯讀
create policy site_publish_settings_member_read on public.customer_site_publish_settings for select to authenticated using (public.can_read_site_project(site_project_id));
create policy site_publish_settings_manage_update on public.customer_site_publish_settings for update to authenticated
  using (public.can_manage_site_project(site_project_id)) with check (public.can_manage_site_project(site_project_id));
create policy site_releases_member_read on public.customer_site_deployments for select to authenticated using (public.can_read_site_project(site_project_id));
create policy site_releases_admin_manage on public.customer_site_deployments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 表單送出：workspace 成員與森映 admin 讀取；新增只經 submit_site_form()
create policy site_form_submissions_member_read on public.customer_site_form_submissions for select to authenticated
  using (public.can_read_site_project(site_project_id));
create policy site_form_submissions_editor_update on public.customer_site_form_submissions for update to authenticated
  using (public.can_edit_site_project(site_project_id)) with check (public.can_edit_site_project(site_project_id));
create policy site_form_submissions_manage_delete on public.customer_site_form_submissions for delete to authenticated
  using (public.can_manage_site_project(site_project_id));

-- 公開前台（已公開發布的客戶網站）
create policy site_settings_public_read on public.customer_site_project_settings for select using (public.is_site_publicly_visible(site_project_id));
create policy site_theme_public_read on public.customer_site_theme_settings for select using (public.is_site_publicly_visible(site_project_id));
create policy site_footer_public_read on public.customer_site_footer_settings for select using (public.is_site_publicly_visible(site_project_id));
create policy site_assets_public_read on public.customer_site_assets for select using (public.is_site_publicly_visible(site_project_id));
create policy site_pages_public_read on public.customer_site_pages for select
  using (public.is_site_publicly_visible(site_project_id) and public.is_publicly_visible(status, published_at, scheduled_at));
create policy site_sections_public_read on public.customer_site_sections for select
  using (is_enabled and public.is_site_publicly_visible(site_project_id)
         and exists (select 1 from public.customer_site_pages pg where pg.id = page_id and public.is_publicly_visible(pg.status, pg.published_at, pg.scheduled_at)));
create policy site_fields_public_read on public.customer_site_section_fields for select
  using (public.is_site_publicly_visible(site_project_id));
create policy site_values_public_read on public.customer_site_content_values for select
  using (content_state = 'published' and public.is_site_publicly_visible(site_project_id));
create policy site_nav_menus_public_read on public.customer_site_navigation_menus for select
  using (is_active and public.is_site_publicly_visible(site_project_id));
create policy site_nav_items_public_read on public.customer_site_navigation_items for select
  using (is_active and public.is_site_publicly_visible(site_project_id));
create policy site_forms_public_read on public.customer_site_forms for select
  using (is_active and public.is_site_publicly_visible(site_project_id));
create policy site_form_fields_public_read on public.customer_site_form_fields for select
  using (public.is_site_publicly_visible(site_project_id));

-- =====================================================================
-- 6. Template Marketplace
-- =====================================================================
create policy template_categories_public_read on public.site_template_categories for select using (is_active);
create policy templates_public_read on public.site_templates for select
  using (pricing_type <> 'private' and public.is_publicly_visible(status, published_at, null));
create policy templates_private_owner_read on public.site_templates for select to authenticated
  using (pricing_type = 'private' and public.is_workspace_member(owner_workspace_id));
create policy template_versions_public_read on public.site_template_versions for select
  using (status = 'published' and exists (select 1 from public.site_templates t where t.id = template_id));
create policy template_pages_public_read on public.site_template_pages for select
  using (exists (select 1 from public.site_template_versions v where v.id = template_version_id));
create policy template_sections_public_read on public.site_template_sections for select
  using (exists (select 1 from public.site_template_versions v where v.id = template_version_id));
create policy template_fields_public_read on public.site_template_fields for select
  using (exists (select 1 from public.site_template_versions v where v.id = template_version_id));
create policy template_assets_public_read on public.site_template_assets for select
  using (exists (select 1 from public.site_template_versions v where v.id = template_version_id));
create policy template_category_links_public_read on public.site_template_category_links for select
  using (exists (select 1 from public.site_templates t where t.id = template_id));
create policy template_products_public_read on public.site_template_products for select
  using (exists (select 1 from public.site_templates t where t.id = template_id));
create policy template_preview_sites_public_read on public.site_template_preview_sites for select
  using (is_active and exists (select 1 from public.site_templates t where t.id = template_id));
create policy template_licenses_member_read on public.site_template_licenses for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy template_purchases_customer_read on public.site_template_purchases for select to authenticated
  using (user_id = auth.uid() or public.current_workspace_role(workspace_id) in ('owner','admin'));

do $$
declare t text;
begin
  foreach t in array array['site_template_categories','site_templates','site_template_versions','site_template_pages','site_template_sections',
    'site_template_fields','site_template_assets','site_template_category_links','site_template_products','site_template_licenses',
    'site_template_purchases','site_template_preview_sites'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.is_cms_staff())', t || '_staff_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
end $$;

-- =====================================================================
-- 7. Domain / DNS / Deployment
-- =====================================================================
create policy site_domains_member_read on public.site_project_domains for select to authenticated using (public.can_read_site_project(site_project_id));
create policy site_domains_manage_update on public.site_project_domains for update to authenticated
  using (public.can_manage_site_project(site_project_id)) with check (public.can_manage_site_project(site_project_id));
create policy site_domain_verifications_member_read on public.site_domain_verifications for select to authenticated
  using (exists (select 1 from public.site_project_domains d where d.id = domain_id));
create policy site_ssl_member_read on public.site_ssl_certificates for select to authenticated
  using (exists (select 1 from public.site_project_domains d where d.id = domain_id));
create policy site_domain_check_logs_member_read on public.site_domain_check_logs for select to authenticated
  using (exists (select 1 from public.site_project_domains d where d.id = domain_id));
create policy site_dns_instructions_member_read on public.site_dns_instructions for select to authenticated
  using (site_project_id is not null and public.can_read_site_project(site_project_id));
create policy site_publish_targets_manage_read on public.site_publish_targets for select to authenticated
  using (public.can_manage_site_project(site_project_id));
create policy site_deployments_member_read on public.site_deployments for select to authenticated using (public.can_read_site_project(site_project_id));
create policy dns_guides_public_read on public.site_dns_provider_guides for select using (public.is_publicly_visible(status, published_at, null));
create policy dns_guides_staff_read on public.site_dns_provider_guides for select to authenticated using (public.is_cms_staff());
create policy dns_guides_editor_manage on public.site_dns_provider_guides for all to authenticated using (public.can_publish_content()) with check (public.can_publish_content());

do $$
declare t text;
begin
  foreach t in array array['site_project_domains','site_domain_verifications','site_dns_instructions','site_ssl_certificates',
    'site_publish_targets','site_deployments','site_domain_check_logs'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
end $$;

-- =====================================================================
-- 8. SEO Article Generator
--   workspace_id is null → 森映內部：後台角色可讀；owner / admin / editor / author 可寫
--   workspace_id not null → 客戶（v2）：can_access_ai_workspace()（platform flag + 權限 + workspace 角色）
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['ai_article_brand_profiles','ai_article_projects','ai_article_generations','ai_article_generation_outputs','ai_article_exports'] loop
    execute format($f$create policy %I on public.%I for select to authenticated using (
      (workspace_id is null and public.is_cms_staff())
      or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor','viewer']))))$f$,
      t || '_read', t);
    execute format($f$create policy %I on public.%I for insert to authenticated with check (
      (workspace_id is null and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
      or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor']))))$f$,
      t || '_insert', t);
    execute format($f$create policy %I on public.%I for update to authenticated using (
      (workspace_id is null and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
      or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor']))))
      with check (
      (workspace_id is null and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
      or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor']))))$f$,
      t || '_update', t);
    execute format($f$create policy %I on public.%I for delete to authenticated using (
      (workspace_id is null and public.is_admin())
      or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin']))))$f$,
      t || '_delete', t);
  end loop;
end $$;

-- 關鍵字：依專案權限
create policy ai_keywords_read on public.ai_article_keywords for select to authenticated
  using (exists (select 1 from public.ai_article_projects p where p.id = project_id));
create policy ai_keywords_write on public.ai_article_keywords for all to authenticated
  using (exists (select 1 from public.ai_article_projects p where p.id = project_id and (
    (p.workspace_id is null and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
    or (p.workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(p.workspace_id, array['owner','admin','editor']))))))
  with check (exists (select 1 from public.ai_article_projects p where p.id = project_id and (
    (p.workspace_id is null and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
    or (p.workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(p.workspace_id, array['owner','admin','editor']))))));

-- 額度與使用紀錄：讀取同上；寫入只允許 owner / admin（發放額度），扣除經 consume_ai_article_credits()
create policy ai_credits_read on public.ai_article_usage_credits for select to authenticated using (
  (workspace_id is null and public.is_cms_staff())
  or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor','viewer']))));
create policy ai_credits_admin_manage on public.ai_article_usage_credits for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ai_usage_events_read on public.ai_article_usage_events for select to authenticated using (
  (workspace_id is null and public.is_cms_staff())
  or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor','viewer']))));

-- 審核紀錄：可讀者可看；審核者只能以自己名義新增
create policy ai_review_logs_read on public.ai_article_review_logs for select to authenticated
  using (exists (select 1 from public.ai_article_generation_outputs o where o.id = output_id));
create policy ai_review_logs_insert on public.ai_article_review_logs for insert to authenticated with check (
  reviewer_id = auth.uid() and (
    (workspace_id is null and public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[]))
    or (workspace_id is not null and (public.is_admin() or public.can_access_ai_workspace(workspace_id, array['owner','admin','editor'])))));

-- =====================================================================
-- 9. External Project Connections：owner / admin
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['external_project_connections','external_project_sync_logs','external_project_cms_mappings'] loop
    execute format('create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t || '_admin_manage', t);
  end loop;
end $$;

commit;
