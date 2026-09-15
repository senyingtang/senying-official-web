-- =====================================================================
-- template_license_smoke_test.sql
-- 版型：免費 / 付費 / 方案限定 / 私人版型的使用判斷；未購買可預覽不可套用；
--       從模板建立網站（頁面 / 區塊 / 欄位 / 預設內容）；v1 每組代碼 1 個網站；網站類型權限；
--       模板制結構保護；draft → publish（v1 只到 preview）；授權撤銷後禁止發布。
-- 本機 / 可丟棄 Supabase，以 postgres 執行，全程 rollback。
-- =====================================================================
begin;

create function pg_temp.new_user(p_label text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := p_label || '.' || substr(v::text, 1, 8) || '@test.invalid';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at) values (v, v_email, 'authenticated', 'authenticated', now(), now());
  perform set_config('test.' || p_label, v::text, true);
  perform set_config('test.' || p_label || '_email', v_email, true);
  return v;
end $$;
create function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v text := current_setting('test.' || p_label);
begin
  perform set_config('request.jwt.claim.sub', v, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

select pg_temp.new_user('cust_a'), pg_temp.new_user('cust_b');

-- ---------------------------------------------------------------------
-- 準備：發布種子免費版型、建立付費 / 私人 / 方案限定版型、兩個客戶 workspace
-- ---------------------------------------------------------------------
do $$
declare
  c_a public.access_codes; c_b public.access_codes;
  v_paid uuid; v_paid_ver uuid; v_page uuid; v_section uuid;
  v_private uuid; v_plan uuid;
begin
  update public.site_template_versions v set status = 'published', published_at = now()
  from public.site_templates t where t.id = v.template_id and t.template_key in ('seo_starter','landing_basic');
  update public.site_templates set status = 'published', published_at = now() where template_key in ('seo_starter','landing_basic');

  c_a := public.issue_access_code((select id from public.entitlement_products where entitlement_key = 'seo_website_v1'), 'admin_grant', null, null, null, current_setting('test.cust_a')::uuid);
  c_b := public.issue_access_code((select id from public.entitlement_products where entitlement_key = 'seo_website_v1'), 'admin_grant', null, null, null, current_setting('test.cust_b')::uuid);
  perform set_config('test.code_a', c_a.code::text, true);
  perform set_config('test.code_b', c_b.code::text, true);

  -- 付費版型（最小結構）
  insert into public.site_templates(template_key, slug, name, site_type, pricing_type, status, published_at)
  values ('test_paid_' || substr(md5(random()::text), 1, 6), 'test-paid-' || substr(md5(random()::text), 1, 6), '付費測試版型', 'seo_website', 'paid', 'published', now())
  returning id into v_paid;
  insert into public.site_template_versions(template_id, version, status, astro_entry_path, published_at)
  values (v_paid, '1.0.0', 'published', 'src/templates/test-paid/index.astro', now()) returning id into v_paid_ver;
  update public.site_templates set latest_version_id = v_paid_ver where id = v_paid;
  insert into public.site_template_pages(template_version_id, page_key, page_type, title, path) values (v_paid_ver, 'home', 'home', '首頁', '/') returning id into v_page;
  insert into public.site_template_sections(template_version_id, template_page_id, section_key, section_type, name) values (v_paid_ver, v_page, 'hero', 'hero', '主視覺') returning id into v_section;
  insert into public.site_template_fields(template_version_id, template_section_id, field_key, label, field_type, is_required, default_value)
  values (v_paid_ver, v_section, 'heading', '標題', 'text', true, '"付費版型標題"');

  insert into public.site_templates(template_key, slug, name, site_type, pricing_type, status, published_at, required_feature_id)
  values ('test_plan_' || substr(md5(random()::text), 1, 6), 'test-plan-' || substr(md5(random()::text), 1, 6), '方案限定測試版型', 'seo_website', 'plan_restricted', 'published', now(),
          (select id from public.entitlement_features where feature_key = 'template.premium'))
  returning id into v_plan;

  perform set_config('test.tpl_free', (select id::text from public.site_templates where template_key = 'seo_starter'), true);
  perform set_config('test.tpl_landing', (select id::text from public.site_templates where template_key = 'landing_basic'), true);
  perform set_config('test.tpl_paid', v_paid::text, true);
  perform set_config('test.tpl_plan', v_plan::text, true);
end $$;

select pg_temp.login('cust_a');
set local role authenticated;
do $$ begin perform set_config('test.ws_a', public.create_workspace_from_access_code(current_setting('test.code_a')) ->> 'workspace_id', true); end $$;
reset role;
select pg_temp.login('cust_b');
set local role authenticated;
do $$ begin perform set_config('test.ws_b', public.create_workspace_from_access_code(current_setting('test.code_b')) ->> 'workspace_id', true); end $$;
reset role;
select pg_temp.logout();

-- 私人版型（屬於 workspace B）
do $$
declare v_private uuid;
begin
  insert into public.site_templates(template_key, slug, name, site_type, pricing_type, owner_workspace_id, status)
  values ('test_private_' || substr(md5(random()::text), 1, 6), 'test-private-' || substr(md5(random()::text), 1, 6), '客製私人版型', 'seo_website', 'private',
          current_setting('test.ws_b')::uuid, 'draft')
  returning id into v_private;
  perform set_config('test.tpl_private', v_private::text, true);
end $$;

-- ---------------------------------------------------------------------
-- 1. 使用判斷
-- ---------------------------------------------------------------------
select pg_temp.login('cust_a');
set local role authenticated;
do $$
declare ws uuid := current_setting('test.ws_a')::uuid;
begin
  if not public.can_workspace_use_template(ws, current_setting('test.tpl_free')::uuid) then raise exception 'FAIL free template not usable'; end if;
  if public.can_workspace_use_template(ws, current_setting('test.tpl_paid')::uuid) then raise exception 'FAIL paid template usable without license'; end if;
  if public.can_workspace_use_template(ws, current_setting('test.tpl_plan')::uuid) then raise exception 'FAIL plan template usable without plan'; end if;
  if public.can_workspace_use_template(ws, current_setting('test.tpl_private')::uuid) then raise exception 'FAIL other workspace private template usable'; end if;
  if exists (select 1 from public.site_templates where id = current_setting('test.tpl_private')::uuid) then raise exception 'FAIL private template visible to other workspace'; end if;
  -- 未購買可預覽（可讀取版型與欄位定義），不可套用
  if not exists (select 1 from public.site_template_fields f join public.site_template_versions v on v.id = f.template_version_id
                 where v.template_id = current_setting('test.tpl_paid')::uuid) then raise exception 'FAIL paid template not previewable'; end if;
  begin
    perform public.create_site_project_from_template(ws, current_setting('test.tpl_paid')::uuid);
    raise exception 'FAIL created site from unlicensed paid template';
  exception when insufficient_privilege then null;
  end;
  -- 網站類型權限：SEO 代碼不含一頁式
  begin
    perform public.create_site_project_from_template(ws, current_setting('test.tpl_landing')::uuid);
    raise exception 'FAIL created landing page without site.type.landing_page';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS template usage rules before license';
end $$;
reset role;

select pg_temp.login('cust_b');
set local role authenticated;
do $$
begin
  if not public.can_workspace_use_template(current_setting('test.ws_b')::uuid, current_setting('test.tpl_private')::uuid) then raise exception 'FAIL owner workspace cannot use private template'; end if;
  if not exists (select 1 from public.site_templates where id = current_setting('test.tpl_private')::uuid) then raise exception 'FAIL owner workspace cannot see private template'; end if;
  raise notice 'PASS private template owner access';
end $$;
reset role;
select pg_temp.logout();

-- 購買授權 + 方案權限（service context）
do $$
declare v_purchase uuid; v_ep uuid;
begin
  insert into public.site_template_purchases(template_id, workspace_id, user_id, status, paid_at)
  values (current_setting('test.tpl_paid')::uuid, current_setting('test.ws_a')::uuid, current_setting('test.cust_a')::uuid, 'paid', now()) returning id into v_purchase;
  insert into public.site_template_licenses(template_id, workspace_id, source_type, purchase_id)
  values (current_setting('test.tpl_paid')::uuid, current_setting('test.ws_a')::uuid, 'purchase', v_purchase);

  insert into public.entitlement_products(entitlement_key, product_code, name) values ('test_premium_' || substr(md5(random()::text), 1, 6), 'SEO', '測試進階方案') returning id into v_ep;
  insert into public.entitlement_feature_rules(entitlement_product_id, feature_id)
  select v_ep, id from public.entitlement_features where feature_key = 'template.premium';
  insert into public.user_entitlements(user_id, workspace_id, entitlement_product_id, source_type)
  values (current_setting('test.cust_a')::uuid, current_setting('test.ws_a')::uuid, v_ep, 'admin_grant');
end $$;

select pg_temp.login('cust_a');
set local role authenticated;
do $$
declare
  ws uuid := current_setting('test.ws_a')::uuid;
  v_project uuid;
  n int;
begin
  if not public.can_workspace_use_template(ws, current_setting('test.tpl_paid')::uuid) then raise exception 'FAIL paid template not usable after license'; end if;
  if not public.can_workspace_use_template(ws, current_setting('test.tpl_plan')::uuid) then raise exception 'FAIL plan template not usable with premium entitlement'; end if;

  -- 2. 從免費模板建立網站
  v_project := public.create_site_project_from_template(ws, current_setting('test.tpl_free')::uuid, '測試 SEO 官網');
  perform set_config('test.project', v_project::text, true);
  if (select count(*) from public.customer_site_pages where site_project_id = v_project) <> 5 then raise exception 'FAIL expected 5 pages'; end if;
  if (select count(*) from public.customer_site_sections where site_project_id = v_project) < 8 then raise exception 'FAIL sections not instantiated'; end if;
  if (select count(*) from public.customer_site_section_fields where site_project_id = v_project) < 15 then raise exception 'FAIL fields not instantiated'; end if;
  if (select value #>> '{}' from public.customer_site_content_values v join public.customer_site_sections s on s.id = v.section_id
      where v.site_project_id = v_project and s.section_key = 'hero' and v.field_key = 'heading' and v.content_state = 'draft') is null then
    raise exception 'FAIL default content not copied';
  end if;
  if not exists (select 1 from public.customer_site_forms where site_project_id = v_project and form_key = 'contact') then raise exception 'FAIL contact form missing'; end if;
  if (select count(*) from public.customer_site_navigation_items where site_project_id = v_project) <> 5 then raise exception 'FAIL navigation items'; end if;
  if (select publish_mode from public.customer_site_publish_settings where site_project_id = v_project) <> 'preview_only' then raise exception 'FAIL v1 must be preview_only'; end if;
  if not public.can_use_template(current_setting('test.tpl_free')::uuid, v_project) then raise exception 'FAIL can_use_template for project'; end if;

  -- v1：每組代碼只能建立 1 個網站
  if public.can_create_site_project(ws) then raise exception 'FAIL can_create_site_project after using quota'; end if;
  begin
    perform public.create_site_project_from_template(ws, current_setting('test.tpl_free')::uuid);
    raise exception 'FAIL second site created with 1-site entitlement';
  exception when raise_exception then
    if sqlerrm not like 'no site creation quota%' then raise; end if;
  end;

  -- 3. 模板制結構保護
  begin
    insert into public.customer_site_sections(site_project_id, page_id, section_key, section_type)
    select v_project, id, 'drag_block', 'custom' from public.customer_site_pages where site_project_id = v_project and page_key = 'home';
    raise exception 'FAIL customer added section';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.customer_site_sections set section_type = 'custom_html' where site_project_id = v_project and section_key = 'hero';
    raise exception 'FAIL customer changed section_type';
  exception when insufficient_privilege then null;
  end;
  update public.customer_site_sections set is_enabled = false where site_project_id = v_project and section_key = 'cta';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL customer cannot disable section'; end if;
  begin
    insert into public.customer_site_content_values(site_project_id, section_id, field_id, field_key, content_state, value, published_at)
    select f.site_project_id, f.section_id, f.id, f.field_key, 'published', '"hack"', now()
    from public.customer_site_section_fields f where f.site_project_id = v_project limit 1;
    raise exception 'FAIL customer wrote published content directly';
  exception when insufficient_privilege then null;
  end;

  -- 4. 必填欄位未填不可發布
  begin
    perform public.publish_site_project(v_project);
    raise exception 'FAIL publish with empty required fields';
  exception when not_null_violation then null;
  end;

  insert into public.customer_site_content_values(site_project_id, section_id, field_id, field_key, content_state, value)
  select f.site_project_id, f.section_id, f.id, f.field_key, 'draft', to_jsonb('測試內容'::text)
  from public.customer_site_section_fields f
  where f.site_project_id = v_project and f.is_required
    and not exists (select 1 from public.customer_site_content_values v where v.field_id = f.id and v.content_state = 'draft');

  update public.customer_site_content_values set value = '"更新後的主標題"'
  where site_project_id = v_project and field_key = 'heading' and content_state = 'draft'
    and section_id = (select id from public.customer_site_sections where site_project_id = v_project and section_key = 'hero');
  if (select version from public.customer_site_content_values where site_project_id = v_project and field_key = 'heading' and content_state = 'draft'
      and section_id = (select id from public.customer_site_sections where site_project_id = v_project and section_key = 'hero')) <> 2 then
    raise exception 'FAIL content version not bumped';
  end if;
  raise notice 'PASS create site from template + structure guards';
end $$;

do $$
declare v jsonb; v_project uuid := current_setting('test.project')::uuid;
begin
  v := public.publish_site_project(v_project);
  if v ->> 'status' <> 'preview' then raise exception 'FAIL v1 publish should stay preview: %', v; end if;
  if (v ->> 'version')::int <> 1 then raise exception 'FAIL release version'; end if;
  if (select count(*) from public.customer_site_content_values where site_project_id = v_project and content_state = 'published')
     <> (select count(*) from public.customer_site_content_values where site_project_id = v_project and content_state = 'draft') then
    raise exception 'FAIL published content count mismatch';
  end if;
  if exists (select 1 from public.customer_site_pages where site_project_id = v_project and published_snapshot is null) then raise exception 'FAIL page snapshot missing'; end if;
  if not exists (select 1 from public.site_deployments where site_project_id = v_project and is_dry_run and status = 'skipped') then raise exception 'FAIL dry-run deployment missing'; end if;
  raise notice 'PASS publish draft -> published (preview only in v1)';
end $$;
reset role;

select pg_temp.logout();
set local role anon;
do $$
begin
  if exists (select 1 from public.customer_site_pages where site_project_id = current_setting('test.project')::uuid) then raise exception 'FAIL anon can read preview site'; end if;
  if exists (select 1 from public.customer_site_content_values where site_project_id = current_setting('test.project')::uuid) then raise exception 'FAIL anon can read preview content'; end if;
  raise notice 'PASS preview site is not public';
end $$;
reset role;

-- ---------------------------------------------------------------------
-- 5. 付費版型建站後撤銷授權 → 禁止發布
-- ---------------------------------------------------------------------
update public.customer_workspaces set site_project_limit_override = 5 where id = current_setting('test.ws_a')::uuid;

select pg_temp.login('cust_a');
set local role authenticated;
do $$
declare v_project uuid;
begin
  v_project := public.create_site_project_from_template(current_setting('test.ws_a')::uuid, current_setting('test.tpl_paid')::uuid, '付費版型網站');
  perform set_config('test.paid_project', v_project::text, true);
end $$;
reset role;
select pg_temp.logout();

update public.site_template_licenses set status = 'revoked', revoked_at = now(), revoked_reason = 'refund test'
where template_id = current_setting('test.tpl_paid')::uuid and workspace_id = current_setting('test.ws_a')::uuid;

select pg_temp.login('cust_a');
set local role authenticated;
do $$
begin
  if public.can_use_template(current_setting('test.tpl_paid')::uuid, current_setting('test.paid_project')::uuid) then raise exception 'FAIL revoked license still usable'; end if;
  begin
    perform public.publish_site_project(current_setting('test.paid_project')::uuid);
    raise exception 'FAIL published with revoked license';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS revoked template license blocks publishing';
end $$;
reset role;

rollback;
