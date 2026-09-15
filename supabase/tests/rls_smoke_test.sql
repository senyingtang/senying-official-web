-- =====================================================================
-- rls_smoke_test.sql
-- 在本機 / 可丟棄 Supabase 以 postgres 執行；使用 set local role + request.jwt.claims 模擬 anon / authenticated。
-- 測試帳號以 gen_random_uuid() 動態建立（email 使用 .invalid 保留網域），全程 rollback。
-- 涵蓋：anon 公開讀取、後台五角色、audit_logs、客戶 workspace 隔離、金流設定、表單送出、
--       最後一位 owner（後台 / workspace）、模板結構保護、跨網站關聯防呆、access code 可見性。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 測試 helper（pg_temp，交易結束即消失）
-- ---------------------------------------------------------------------
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
create function pg_temp.login_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------------------------------------------------------------------
-- 準備資料（postgres / service 身分）
-- ---------------------------------------------------------------------
select pg_temp.new_user('cms_owner'), pg_temp.new_user('cms_admin'), pg_temp.new_user('cms_editor'), pg_temp.new_user('cms_viewer'),
       pg_temp.new_user('cust_a'), pg_temp.new_user('cust_a_viewer'), pg_temp.new_user('cust_b');

do $$
declare
  ws_a uuid := gen_random_uuid(); ws_b uuid := gen_random_uuid();
  p_a uuid := gen_random_uuid(); p_b uuid := gen_random_uuid();
  pg_a uuid; pg_b uuid; form_a uuid; code_row public.access_codes;
begin
  insert into public.admin_profiles(user_id, display_name, role) values
    (current_setting('test.cms_owner')::uuid, 'Test Owner', 'owner'),
    (current_setting('test.cms_admin')::uuid, 'Test Admin', 'admin'),
    (current_setting('test.cms_editor')::uuid, 'Test Editor', 'editor'),
    (current_setting('test.cms_viewer')::uuid, 'Test Viewer', 'viewer');
  insert into public.audit_logs(actor_id, action, entity_type) values (current_setting('test.cms_owner')::uuid, 'test.seed', 'test');

  insert into public.customer_workspaces(id, slug, name, owner_user_id) values
    (ws_a, 'rls-a-' || substr(md5(ws_a::text), 1, 8), 'Workspace A', current_setting('test.cust_a')::uuid),
    (ws_b, 'rls-b-' || substr(md5(ws_b::text), 1, 8), 'Workspace B', current_setting('test.cust_b')::uuid);
  insert into public.customer_workspace_members(workspace_id, user_id, role) values
    (ws_a, current_setting('test.cust_a')::uuid, 'owner'),
    (ws_a, current_setting('test.cust_a_viewer')::uuid, 'viewer'),
    (ws_b, current_setting('test.cust_b')::uuid, 'owner');

  insert into public.customer_site_projects(id, workspace_id, name, slug, site_type) values
    (p_a, ws_a, 'Site A', 'site-rls-a', 'seo_website'), (p_b, ws_b, 'Site B', 'site-rls-b', 'seo_website');
  insert into public.customer_site_publish_settings(site_project_id) values (p_a), (p_b);
  insert into public.customer_site_pages(site_project_id, page_key, title, path, page_type) values (p_a, 'home', 'Home A', '/', 'home') returning id into pg_a;
  insert into public.customer_site_pages(site_project_id, page_key, title, path, page_type) values (p_b, 'home', 'Home B', '/', 'home') returning id into pg_b;
  insert into public.customer_site_forms(site_project_id, form_key, name) values (p_a, 'contact', 'Contact A') returning id into form_a;
  insert into public.customer_site_form_submissions(form_id, site_project_id, workspace_id, payload) values (form_a, p_a, ws_a, '{"name":"訪客","message":"hello"}');

  code_row := public.issue_access_code((select id from public.entitlement_products where entitlement_key = 'seo_website_v1'),
                                       'admin_grant', null, null, null, current_setting('test.cust_a')::uuid, null, null, '{}');

  perform set_config('test.ws_a', ws_a::text, true);
  perform set_config('test.ws_b', ws_b::text, true);
  perform set_config('test.p_a', p_a::text, true);
  perform set_config('test.p_b', p_b::text, true);
  perform set_config('test.pg_a', pg_a::text, true);
  perform set_config('test.pg_b', pg_b::text, true);
  perform set_config('test.form_a', form_a::text, true);
  raise notice 'SETUP done';
end $$;

-- ---------------------------------------------------------------------
-- 1. anon
-- ---------------------------------------------------------------------
select pg_temp.login_anon();
set local role anon;
do $$
begin
  if exists (select 1 from public.cms_pages where slug = 'about') then raise exception 'FAIL anon can read draft cms page'; end if;
  if not exists (select 1 from public.cms_pages where slug = 'home') then raise exception 'FAIL anon cannot read published home page'; end if;
  if exists (select 1 from public.customer_site_projects) then raise exception 'FAIL anon can read preview-only site projects'; end if;
  if exists (select 1 from public.customer_site_pages) then raise exception 'FAIL anon can read preview-only site pages'; end if;
  if exists (select 1 from public.commerce_payment_provider_configs) then raise exception 'FAIL anon can read payment configs'; end if;
  if exists (select 1 from public.audit_logs) then raise exception 'FAIL anon can read audit logs'; end if;
  if exists (select 1 from public.access_codes) then raise exception 'FAIL anon can read access codes'; end if;
  if exists (select 1 from public.external_project_connections) then raise exception 'FAIL anon can read external projects'; end if;
  if exists (select 1 from public.site_templates where status <> 'published') then raise exception 'FAIL anon can read draft templates'; end if;
  if (select count(*) from public.get_enabled_payment_methods()) <> 0 then raise exception 'FAIL disabled payment methods are exposed'; end if;
  begin
    insert into public.customer_site_form_submissions(form_id, site_project_id, workspace_id, payload)
    values (current_setting('test.form_a')::uuid, current_setting('test.p_a')::uuid, current_setting('test.ws_a')::uuid, '{}');
    raise exception 'FAIL anon inserted form submission directly';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS anon public read boundaries';
end $$;
reset role;

-- ---------------------------------------------------------------------
-- 2. 後台 viewer / editor / admin / owner
-- ---------------------------------------------------------------------
select pg_temp.login('cms_viewer');
set local role authenticated;
do $$
declare n int;
begin
  update public.cms_pages set title = 'viewer edit' where slug = 'home';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL viewer updated cms_pages'; end if;
  if not exists (select 1 from public.cms_pages where slug = 'about') then raise exception 'FAIL viewer cannot read draft page'; end if;
  if exists (select 1 from public.audit_logs) then raise exception 'FAIL viewer can read audit_logs'; end if;
  if exists (select 1 from public.customer_site_form_submissions) then raise exception 'FAIL CMS viewer can read customer form submissions'; end if;
  raise notice 'PASS cms viewer is read-only';
end $$;
reset role;

select pg_temp.login('cms_editor');
set local role authenticated;
do $$
declare n int;
begin
  update public.cms_pages set title = '首頁（editor）' where slug = 'home';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL editor cannot update cms_pages'; end if;
  update public.cms_site_settings set is_public = true where setting_key = 'site.brand';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL editor updated site settings'; end if;
  if exists (select 1 from public.audit_logs) then raise exception 'FAIL editor can read audit_logs'; end if;
  if exists (select 1 from public.commerce_payment_provider_configs) then raise exception 'FAIL editor can read payment configs'; end if;
  insert into public.audit_logs(actor_id, actor_type, action, entity_type) values (auth.uid(), 'admin', 'test.editor', 'cms_pages');
  begin
    insert into public.audit_logs(actor_id, actor_type, action, entity_type) values (current_setting('test.cms_owner')::uuid, 'admin', 'test.spoof', 'cms_pages');
    raise exception 'FAIL editor spoofed audit actor';
  exception when insufficient_privilege then null;
  end;
  update public.audit_logs set action = 'tampered';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL editor updated audit_logs'; end if;
  raise notice 'PASS cms editor boundaries';
end $$;
reset role;

select pg_temp.login('cms_admin');
set local role authenticated;
do $$
begin
  if not exists (select 1 from public.audit_logs) then raise exception 'FAIL admin cannot read audit_logs'; end if;
  if (select count(*) from public.commerce_payment_provider_configs) = 0 then raise exception 'FAIL admin cannot read payment configs'; end if;
  begin
    insert into public.admin_profiles(user_id, role) values (current_setting('test.cust_b')::uuid, 'owner');
    raise exception 'FAIL admin created an owner';
  exception when insufficient_privilege then null;
  end;
  if (select count(*) from public.customer_site_form_submissions) <> 1 then raise exception 'FAIL Senying admin cannot read form submissions'; end if;
  raise notice 'PASS cms admin boundaries';
end $$;
reset role;

select pg_temp.login('cms_owner');
set local role authenticated;
do $$
begin
  begin
    update public.admin_profiles set is_active = false where user_id = auth.uid();
    raise exception 'FAIL last owner deactivated';
  exception when check_violation then null;
  end;
  begin
    update public.admin_profiles set role = 'admin' where user_id = auth.uid();
    raise exception 'FAIL last owner demoted';
  exception when check_violation then null;
  end;
  raise notice 'PASS last active owner cannot be deactivated or demoted';
end $$;
reset role;
select pg_temp.logout();

do $$
begin
  begin
    delete from public.admin_profiles where role = 'owner';
    raise exception 'FAIL last owner deleted by service role';
  exception when check_violation then null;
  end;
  begin
    update public.audit_logs set action = 'tampered by postgres';
    raise exception 'FAIL audit_logs updated by postgres';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS owner / audit guards hold for service context';
end $$;

-- ---------------------------------------------------------------------
-- 3. 客戶 workspace 隔離
-- ---------------------------------------------------------------------
select pg_temp.login('cust_a');
set local role authenticated;
do $$
declare n int;
begin
  if not exists (select 1 from public.customer_workspaces where id = current_setting('test.ws_a')::uuid) then raise exception 'FAIL cust_a cannot see own workspace'; end if;
  if exists (select 1 from public.customer_workspaces where id = current_setting('test.ws_b')::uuid) then raise exception 'FAIL cust_a can see workspace B'; end if;
  if exists (select 1 from public.customer_site_projects where id = current_setting('test.p_b')::uuid) then raise exception 'FAIL cust_a can see site B'; end if;
  if exists (select 1 from public.customer_site_pages where site_project_id = current_setting('test.p_b')::uuid) then raise exception 'FAIL cust_a can see pages of site B'; end if;
  if (select count(*) from public.customer_site_form_submissions) <> 1 then raise exception 'FAIL cust_a cannot read own form submissions'; end if;
  if exists (select 1 from public.commerce_payment_provider_configs) or exists (select 1 from public.commerce_webhook_events)
     or exists (select 1 from public.commerce_bank_transfer_accounts) or exists (select 1 from public.commerce_coupons) then
    raise exception 'FAIL customer can read payment internals';
  end if;
  if exists (select 1 from public.audit_logs) then raise exception 'FAIL customer can read audit_logs'; end if;
  if (select count(*) from public.access_codes) <> 1 then raise exception 'FAIL holder cannot see own access code'; end if;

  begin
    insert into public.audit_logs(actor_id, actor_type, action, entity_type) values (auth.uid(), 'customer', 'test', 'x');
    raise exception 'FAIL customer inserted audit log';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.customer_workspaces set status = 'suspended', suspended_at = now() where id = current_setting('test.ws_a')::uuid;
    raise exception 'FAIL customer changed workspace status';
  exception when insufficient_privilege then null;
  end;
  update public.customer_workspaces set name = 'Workspace A renamed' where id = current_setting('test.ws_a')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot rename workspace'; end if;
  begin
    update public.customer_workspace_members set role = 'admin' where workspace_id = current_setting('test.ws_a')::uuid and user_id = auth.uid();
    raise exception 'FAIL last workspace owner demoted';
  exception when check_violation then null;
  end;
  begin
    insert into public.customer_site_sections(site_project_id, page_id, section_key, section_type)
    values (current_setting('test.p_a')::uuid, current_setting('test.pg_a')::uuid, 'free_block', 'custom');
    raise exception 'FAIL customer inserted a free section';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.customer_site_projects set site_type = 'ecommerce' where id = current_setting('test.p_a')::uuid;
    raise exception 'FAIL customer changed site_type';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.customer_site_pages set status = 'published', published_at = now() where id = current_setting('test.pg_a')::uuid;
    raise exception 'FAIL customer published page without publish_site_project()';
  exception when insufficient_privilege then null;
  end;
  update public.customer_site_pages set seo_title = '首頁 SEO 標題' where id = current_setting('test.pg_a')::uuid;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL customer cannot edit page SEO'; end if;
  update public.customer_site_pages set seo_title = 'hack' where id = current_setting('test.pg_b')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL customer edited another workspace page'; end if;
  raise notice 'PASS customer workspace isolation (owner)';
end $$;
reset role;

select pg_temp.login('cust_a_viewer');
set local role authenticated;
do $$
declare n int;
begin
  if not exists (select 1 from public.customer_site_pages where id = current_setting('test.pg_a')::uuid) then raise exception 'FAIL workspace viewer cannot read pages'; end if;
  update public.customer_site_pages set seo_title = 'viewer edit' where id = current_setting('test.pg_a')::uuid;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL workspace viewer edited page'; end if;
  if exists (select 1 from public.access_codes) then raise exception 'FAIL viewer can see another user access code'; end if;
  raise notice 'PASS workspace viewer is read-only';
end $$;
reset role;

select pg_temp.login('cust_b');
set local role authenticated;
do $$
begin
  if exists (select 1 from public.customer_site_form_submissions) then raise exception 'FAIL cust_b can read workspace A submissions'; end if;
  if exists (select 1 from public.access_codes) then raise exception 'FAIL cust_b can query cust_a access code'; end if;
  if exists (select 1 from public.user_entitlements) then raise exception 'FAIL cust_b can read other entitlements'; end if;
  raise notice 'PASS cross-customer isolation';
end $$;
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 4. 跨網站關聯防呆（即使 service context 也不可把 A 的 section 掛到 B 的頁面）
-- ---------------------------------------------------------------------
do $$
begin
  begin
    insert into public.customer_site_sections(site_project_id, page_id, section_key, section_type)
    values (current_setting('test.p_a')::uuid, current_setting('test.pg_b')::uuid, 'mismatch', 'hero');
    raise exception 'FAIL cross-project section accepted';
  exception when check_violation then null;
  end;
  raise notice 'PASS cross-project relation guard';
end $$;

rollback;
