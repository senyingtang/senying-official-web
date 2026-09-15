-- =====================================================================
-- site_settings_rls.sql（Phase 2.8）
-- 在本機 / 可丟棄 Supabase 以 postgres 執行；使用 set local role + request.jwt.claims 模擬 anon / authenticated。
-- 測試帳號以 gen_random_uuid() 動態建立（email 使用 .invalid 保留網域），全程 rollback，不留下資料。
-- 涵蓋：0016 seed（site.brand / site.socials / site.floating_actions）、JSON 結構、updated_at trigger、
--       cms_site_settings RLS（anon、owner、admin、editor、author、viewer、customer）、非公開設定、audit_logs 寫入規則。
-- 失敗時 raise exception（psql -v ON_ERROR_STOP=1 會回傳非 0）。
-- =====================================================================
begin;

create function pg_temp.new_user(p_label text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := p_label || '.' || substr(v::text, 1, 8) || '@test.invalid';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at) values (v, v_email, 'authenticated', 'authenticated', now(), now());
  perform set_config('test.' || p_label, v::text, true);
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
create function pg_temp.assert(p_ok boolean, p_message text) returns void language plpgsql as $$
begin
  if p_ok is distinct from true then raise exception 'FAIL: %', p_message; end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. 0016 seed 與 JSON 結構（postgres）
-- ---------------------------------------------------------------------
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key in ('site.brand','site.socials','site.floating_actions')) = 3,
  'site.brand / site.socials / site.floating_actions 必須各一列');
select pg_temp.assert((select bool_and(is_public) from public.cms_site_settings where setting_key in ('site.brand','site.socials','site.floating_actions')),
  '三個官網設定都必須 is_public = true');
select pg_temp.assert((select bool_and(created_at is not null and updated_at is not null and updated_at >= created_at) from public.cms_site_settings
  where setting_key in ('site.brand','site.socials','site.floating_actions')), 'created_at / updated_at 必須存在');
select pg_temp.assert((select setting_value->>'name_zh' = '森映' and setting_value->>'name_en' = 'SEN YING' and setting_value->>'name' = '森映 SEN YING'
  and jsonb_typeof(setting_value->'logo_url') = 'string' and jsonb_typeof(setting_value->'favicon_url') = 'string'
  from public.cms_site_settings where setting_key = 'site.brand'), 'site.brand 預設為 森映 / SEN YING，logo_url / favicon_url 為字串');
select pg_temp.assert((select jsonb_typeof(setting_value->'items') = 'array' and jsonb_array_length(setting_value->'items') = 8
  and not exists (select 1 from jsonb_array_elements(setting_value->'items') i
                  where jsonb_typeof(i->'platform') <> 'string' or jsonb_typeof(i->'url') <> 'string' or jsonb_typeof(i->'enabled') <> 'boolean'
                     or jsonb_typeof(i->'sort_order') <> 'number' or jsonb_typeof(i->'show_on_desktop') <> 'boolean' or jsonb_typeof(i->'show_on_mobile') <> 'boolean')
  from public.cms_site_settings where setting_key = 'site.socials'), 'site.socials.items 為 8 筆且欄位型別正確');
select pg_temp.assert((select jsonb_typeof(setting_value->'default_collapsed') = 'boolean' and jsonb_typeof(setting_value->'cart') = 'object'
  and (setting_value->'cart'->>'enabled')::boolean = false
  from public.cms_site_settings where setting_key = 'site.floating_actions'), 'site.floating_actions 結構正確且購物車預設關閉');
select pg_temp.assert(exists (select 1 from pg_trigger where tgrelid = 'public.cms_site_settings'::regclass and tgname = 'trg_cms_site_settings_updated_at' and not tgisinternal),
  'cms_site_settings 必須有 updated_at trigger');

-- 非公開設定（只給 RLS 測試使用，rollback 後消失）
insert into public.cms_site_settings(setting_key, setting_value, is_public) values ('test.private_setting', '{"secret_flag": true}', false);

-- ---------------------------------------------------------------------
-- 2. 測試帳號與角色
-- ---------------------------------------------------------------------
select pg_temp.new_user('owner'), pg_temp.new_user('admin'), pg_temp.new_user('editor'), pg_temp.new_user('author'),
       pg_temp.new_user('viewer'), pg_temp.new_user('customer');
insert into public.admin_profiles(user_id, display_name, role) values
  (current_setting('test.owner')::uuid, 'Settings Owner', 'owner'),
  (current_setting('test.admin')::uuid, 'Settings Admin', 'admin'),
  (current_setting('test.editor')::uuid, 'Settings Editor', 'editor'),
  (current_setting('test.author')::uuid, 'Settings Author', 'author'),
  (current_setting('test.viewer')::uuid, 'Settings Viewer', 'viewer');
do $$
declare ws uuid := gen_random_uuid();
begin
  insert into public.customer_workspaces(id, slug, name, owner_user_id)
  values (ws, 'settings-rls-' || substr(md5(ws::text), 1, 8), 'Settings RLS Workspace', current_setting('test.customer')::uuid);
  insert into public.customer_workspace_members(workspace_id, user_id, role) values (ws, current_setting('test.customer')::uuid, 'owner');
end $$;

-- 寫入測試共用：嘗試 update / insert / delete，回傳實際影響列數（insert 被拒回傳 -1）
create function pg_temp.try_update(p_key text) returns int language plpgsql as $$
declare n int;
begin
  update public.cms_site_settings set setting_value = setting_value || '{"rls_probe": true}'::jsonb where setting_key = p_key;
  get diagnostics n = row_count;
  return n;
end $$;
create function pg_temp.try_insert(p_key text) returns int language plpgsql as $$
begin
  insert into public.cms_site_settings(setting_key, setting_value, is_public) values (p_key, '{}', true);
  return 1;
exception when insufficient_privilege then
  return -1;
end $$;
create function pg_temp.try_delete(p_key text) returns int language plpgsql as $$
declare n int;
begin
  delete from public.cms_site_settings where setting_key = p_key;
  get diagnostics n = row_count;
  return n;
end $$;

grant execute on function pg_temp.try_update(text), pg_temp.try_insert(text), pg_temp.try_delete(text), pg_temp.assert(boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. anon：只讀 is_public，不可寫
-- ---------------------------------------------------------------------
set local role anon;
select pg_temp.login_anon();
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key in ('site.brand','site.socials','site.floating_actions')) = 3, 'anon 可讀 3 個公開官網設定');
select pg_temp.assert((select count(*) from public.cms_site_settings where not is_public) = 0, 'anon 讀不到非公開設定');
select pg_temp.assert(pg_temp.try_update('site.brand') = 0, 'anon update 必須 0 列');
select pg_temp.assert(pg_temp.try_insert('test.anon_insert') = -1, 'anon insert 必須被 RLS 拒絕');
select pg_temp.assert(pg_temp.try_delete('site.brand') = 0, 'anon delete 必須 0 列');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 4. customer（已登入、非後台成員）：只讀公開設定，不可寫
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('customer');
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key in ('site.brand','site.socials','site.floating_actions')) = 3, 'customer 可讀公開官網設定');
select pg_temp.assert((select count(*) from public.cms_site_settings where not is_public) = 0, 'customer 讀不到非公開設定');
select pg_temp.assert(pg_temp.try_update('site.brand') = 0, 'customer update 必須 0 列');
select pg_temp.assert(pg_temp.try_insert('test.customer_insert') = -1, 'customer insert 必須被拒絕');
select pg_temp.assert(pg_temp.try_delete('site.socials') = 0, 'customer delete 必須 0 列');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 5. editor / author / viewer：可讀（含非公開設定），不可寫
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('editor');
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key = 'test.private_setting') = 1, 'editor 可讀非公開設定（後台唯讀）');
select pg_temp.assert(pg_temp.try_update('site.brand') = 0, 'editor update 必須 0 列');
select pg_temp.assert(pg_temp.try_insert('test.editor_insert') = -1, 'editor insert 必須被拒絕');
select pg_temp.assert(pg_temp.try_delete('site.brand') = 0, 'editor delete 必須 0 列');
select pg_temp.login('author');
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key = 'site.brand') = 1, 'author 可讀（DB 層），後台路由另外阻擋');
select pg_temp.assert(pg_temp.try_update('site.socials') = 0, 'author update 必須 0 列');
select pg_temp.assert(pg_temp.try_insert('test.author_insert') = -1, 'author insert 必須被拒絕');
select pg_temp.login('viewer');
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key = 'site.floating_actions') = 1, 'viewer 可讀');
select pg_temp.assert(pg_temp.try_update('site.floating_actions') = 0, 'viewer update 必須 0 列');
select pg_temp.assert(pg_temp.try_insert('test.viewer_insert') = -1, 'viewer insert 必須被拒絕');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 6. owner / admin：可讀寫；updated_at 由 trigger 更新
-- ---------------------------------------------------------------------
create temporary table settings_before on commit drop as
  select setting_key, setting_value, updated_at from public.cms_site_settings;
grant select on settings_before to authenticated;

set local role authenticated;
select pg_temp.login('owner');
select pg_temp.assert(pg_temp.try_update('site.brand') = 1, 'owner update site.brand 必須 1 列');
select pg_temp.login('admin');
select pg_temp.assert(pg_temp.try_update('site.floating_actions') = 1, 'admin update site.floating_actions 必須 1 列');
select pg_temp.assert(pg_temp.try_insert('test.admin_insert') = 1, 'admin 可新增設定');
select pg_temp.assert(pg_temp.try_delete('test.admin_insert') = 1, 'admin 可刪除自己新增的測試設定');
reset role;
select pg_temp.logout();

select pg_temp.assert((select (c.setting_value->>'rls_probe')::boolean and c.updated_at > b.updated_at
  from public.cms_site_settings c join settings_before b using (setting_key) where setting_key = 'site.brand'),
  'owner 更新後 site.brand 內容與 updated_at 必須變更');
select pg_temp.assert((select count(*) from public.cms_site_settings c join settings_before b using (setting_key)
  where c.setting_key not in ('site.brand','site.floating_actions') and (c.setting_value is distinct from b.setting_value or c.updated_at is distinct from b.updated_at)) = 0,
  '只有目標設定列被修改');
select pg_temp.assert((select count(*) from public.cms_site_settings where setting_key in ('site.brand','site.socials','site.floating_actions')) = 3, '沒有重複設定列');

-- ---------------------------------------------------------------------
-- 7. audit_logs：後台成員只能以自己身分新增 admin 紀錄；customer 不可
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('owner');
insert into public.audit_logs(actor_id, actor_type, action, entity_type, metadata)
values (current_setting('test.owner')::uuid, 'admin', 'site_settings.update', 'cms_site_settings', '{"changed_keys": ["site.brand"]}');
select pg_temp.login('customer');
do $$
begin
  insert into public.audit_logs(actor_id, actor_type, action, entity_type) values (current_setting('test.customer')::uuid, 'admin', 'site_settings.update', 'cms_site_settings');
  raise exception 'FAIL: customer 不可寫入 audit_logs';
exception when insufficient_privilege then
  null;
end $$;
reset role;
select pg_temp.logout();
select pg_temp.assert((select count(*) from public.audit_logs where action = 'site_settings.update' and actor_id = current_setting('test.owner')::uuid) = 1,
  'owner 的 site_settings.update audit log 已寫入');

select 'site_settings_rls: ALL PASSED' as result;
rollback;
