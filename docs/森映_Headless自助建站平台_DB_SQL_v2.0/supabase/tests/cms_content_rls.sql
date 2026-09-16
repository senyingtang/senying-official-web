-- =====================================================================
-- cms_content_rls.sql（Phase 2.9）
-- 在本機 / 可丟棄 Supabase 以 postgres 執行；使用 set local role + request.jwt.claims 模擬 anon / authenticated。
-- 測試帳號以 gen_random_uuid() 動態建立（email 使用 .invalid 保留網域），全程 rollback，不留下資料。
--
-- 涵蓋：
--   1. 0017 欄位與 seed（blog_posts / case_studies / blog_categories / seo_metadata / marketing_rebuild_requests）
--   2. anon 只讀得到「已發布且發布時間已到」的文章與案例；draft / 未到期 scheduled / archived 一律讀不到
--   3. anon 不可寫入任何 CMS 內容
--   4. owner / admin / editor 可以新增與修改內容；viewer / author（他人內容）/ customer 不可
--   5. author 只能建立與修改自己的未發布文章，不能直接發布
--   6. slug 唯一（unique violation）
--   7. audit_logs：cms.blog.* / cms.case.* 由後台成員以自己身分寫入；customer 不可
--   8. marketing_rebuild_requests：editor 以上可提出請求，viewer / customer 不可
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
-- 1. 0017 欄位與 seed
-- ---------------------------------------------------------------------
select pg_temp.assert(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'blog_posts' and column_name in ('author_name','cover_image_url')) = 2,
  'blog_posts 必須有 author_name 與 cover_image_url');
select pg_temp.assert(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'case_studies'
     and column_name in ('industry','service_type','content','cover_image_url','gallery','is_sample','display_status')) = 7,
  'case_studies 必須有 0017 新增的 7 個欄位');
select pg_temp.assert(
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'seo_metadata' and column_name = 'og_image_url') = 1,
  'seo_metadata 必須有 og_image_url');
select pg_temp.assert((select count(*) from public.blog_categories where is_active) >= 7, 'blog_categories 至少有 7 個啟用中的分類');
select pg_temp.assert((select count(*) from public.blog_posts where status = 'published') >= 3, '至少有 3 篇已發布的示範文章');
select pg_temp.assert((select count(*) from public.case_studies where status = 'published') >= 8, '至少有 8 筆已發布案例');
select pg_temp.assert((select bool_and(published_at is not null) from public.blog_posts where status = 'published'), '已發布文章必須有 published_at');
select pg_temp.assert(
  (select count(*) from public.case_studies where is_sample and (display_status is null or display_status = '')) = 0,
  '版型示意案例必須有狀態文字');
select pg_temp.assert(
  (select count(*) from public.cms_navigation_items i join public.cms_navigation_menus m on m.id = i.menu_id where m.menu_key = 'header' and i.is_active) = 5,
  'Header 選單有 5 個啟用中的項目');
select pg_temp.assert(exists (select 1 from pg_trigger where tgrelid = 'public.marketing_rebuild_requests'::regclass and tgname = 'trg_marketing_rebuild_requests_updated_at' and not tgisinternal),
  'marketing_rebuild_requests 必須有 updated_at trigger');
select pg_temp.assert((select relrowsecurity from pg_class where oid = 'public.marketing_rebuild_requests'::regclass), 'marketing_rebuild_requests 必須啟用 RLS');

-- 成效欄位：seed 不得預先填入任何未經確認的數據
select pg_temp.assert((select count(*) from public.case_studies where result is not null and result <> '') = 0, 'seed 案例不得包含成果數據');

-- ---------------------------------------------------------------------
-- 2. 測試資料：draft / 未到期 scheduled / archived 各一筆
-- ---------------------------------------------------------------------
insert into public.blog_posts(slug, title, excerpt, content, status, published_at, scheduled_at)
values ('rls-draft-post', 'RLS 草稿文章', '草稿', '草稿內容', 'draft', null, null),
       ('rls-scheduled-post', 'RLS 排程文章', '排程', '排程內容', 'published', now() + interval '10 years', now() + interval '10 years'),
       ('rls-archived-post', 'RLS 已下架文章', '下架', '下架內容', 'archived', now() - interval '1 day', null);
insert into public.case_studies(slug, title, summary, status, published_at)
values ('rls-draft-case', 'RLS 草稿案例', '草稿', 'draft', null),
       ('rls-archived-case', 'RLS 已下架案例', '下架', 'archived', now() - interval '1 day');

-- ---------------------------------------------------------------------
-- 3. 測試帳號與角色
-- ---------------------------------------------------------------------
select pg_temp.new_user('owner'), pg_temp.new_user('admin'), pg_temp.new_user('editor'), pg_temp.new_user('author'),
       pg_temp.new_user('viewer'), pg_temp.new_user('customer');
insert into public.admin_profiles(user_id, display_name, role) values
  (current_setting('test.owner')::uuid, 'CMS Owner', 'owner'),
  (current_setting('test.admin')::uuid, 'CMS Admin', 'admin'),
  (current_setting('test.editor')::uuid, 'CMS Editor', 'editor'),
  (current_setting('test.author')::uuid, 'CMS Author', 'author'),
  (current_setting('test.viewer')::uuid, 'CMS Viewer', 'viewer');

-- 寫入測試共用：回傳實際影響列數（insert 被拒回傳 -1）
create function pg_temp.try_post_update(p_slug text) returns int language plpgsql as $$
declare n int;
begin
  update public.blog_posts set excerpt = coalesce(excerpt, '') || ' probe' where slug = p_slug;
  get diagnostics n = row_count;
  return n;
end $$;
create function pg_temp.try_post_insert(p_slug text, p_status public.cms_publish_status, p_author uuid default null) returns int language plpgsql as $$
begin
  insert into public.blog_posts(slug, title, content, status, published_at, author_id)
  values (p_slug, 'probe', '', p_status, case when p_status = 'published' then now() end, p_author);
  return 1;
exception when insufficient_privilege then
  return -1;
end $$;
create function pg_temp.try_case_update(p_slug text) returns int language plpgsql as $$
declare n int;
begin
  update public.case_studies set summary = coalesce(summary, '') || ' probe' where slug = p_slug;
  get diagnostics n = row_count;
  return n;
end $$;
create function pg_temp.try_case_insert(p_slug text) returns int language plpgsql as $$
begin
  insert into public.case_studies(slug, title, status) values (p_slug, 'probe', 'draft');
  return 1;
exception when insufficient_privilege then
  return -1;
end $$;
create function pg_temp.try_rebuild_insert() returns int language plpgsql as $$
begin
  insert into public.marketing_rebuild_requests(reason, status, requested_by) values ('rls probe', 'pending', auth.uid());
  return 1;
exception when insufficient_privilege then
  return -1;
end $$;

grant execute on function pg_temp.try_post_update(text), pg_temp.try_post_insert(text, public.cms_publish_status, uuid),
  pg_temp.try_case_update(text), pg_temp.try_case_insert(text), pg_temp.try_rebuild_insert(), pg_temp.assert(boolean, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. anon：只讀已發布內容，不可寫
-- ---------------------------------------------------------------------
set local role anon;
select pg_temp.login_anon();
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'new-site-seo-first-3-months') = 1, 'anon 可讀已發布文章');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'rls-draft-post') = 0, 'anon 讀不到草稿文章');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'rls-scheduled-post') = 0, 'anon 讀不到未到期的排程文章');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'rls-archived-post') = 0, 'anon 讀不到已下架文章');
select pg_temp.assert((select count(*) from public.case_studies where slug = 'hungjui-brand-site') = 1, 'anon 可讀已發布案例');
select pg_temp.assert((select count(*) from public.case_studies where slug = 'rls-draft-case') = 0, 'anon 讀不到草稿案例');
select pg_temp.assert((select count(*) from public.case_studies where slug = 'rls-archived-case') = 0, 'anon 讀不到已下架案例');
select pg_temp.assert((select count(*) from public.blog_categories where is_active) >= 7, 'anon 可讀啟用中的分類');
select pg_temp.assert(pg_temp.try_post_update('new-site-seo-first-3-months') = 0, 'anon 不可修改文章');
select pg_temp.assert(pg_temp.try_post_insert('rls-anon-post', 'draft') = -1, 'anon 不可新增文章');
select pg_temp.assert(pg_temp.try_case_update('hungjui-brand-site') = 0, 'anon 不可修改案例');
select pg_temp.assert(pg_temp.try_case_insert('rls-anon-case') = -1, 'anon 不可新增案例');
select pg_temp.assert(pg_temp.try_rebuild_insert() = -1, 'anon 不可提出重建請求');
select pg_temp.assert((select count(*) from public.marketing_rebuild_requests) = 0, 'anon 讀不到重建請求');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 5. customer（已登入、非後台成員）：與 anon 相同
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('customer');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'new-site-seo-first-3-months') = 1, 'customer 可讀已發布文章');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'rls-draft-post') = 0, 'customer 讀不到草稿文章');
select pg_temp.assert(pg_temp.try_post_update('new-site-seo-first-3-months') = 0, 'customer 不可修改文章');
select pg_temp.assert(pg_temp.try_post_insert('rls-customer-post', 'draft') = -1, 'customer 不可新增文章');
select pg_temp.assert(pg_temp.try_case_insert('rls-customer-case') = -1, 'customer 不可新增案例');
select pg_temp.assert(pg_temp.try_rebuild_insert() = -1, 'customer 不可提出重建請求');
do $$
begin
  insert into public.audit_logs(actor_id, actor_type, action, entity_type) values (current_setting('test.customer')::uuid, 'admin', 'cms.blog.update', 'blog_posts');
  raise exception 'FAIL: customer 不可寫入 admin audit log';
exception when insufficient_privilege then
  null;
end $$;
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 6. viewer：可讀全部（含草稿），不可寫
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('viewer');
select pg_temp.assert((select count(*) from public.blog_posts where slug = 'rls-draft-post') = 1, 'viewer 可讀草稿文章（後台唯讀）');
select pg_temp.assert(pg_temp.try_post_update('rls-draft-post') = 0, 'viewer 不可修改文章');
select pg_temp.assert(pg_temp.try_post_insert('rls-viewer-post', 'draft') = -1, 'viewer 不可新增文章');
select pg_temp.assert(pg_temp.try_case_update('rls-draft-case') = 0, 'viewer 不可修改案例');
select pg_temp.assert(pg_temp.try_case_insert('rls-viewer-case') = -1, 'viewer 不可新增案例');
select pg_temp.assert(pg_temp.try_rebuild_insert() = -1, 'viewer 不可提出重建請求');
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 7. author：只能建立 / 修改自己的未發布文章；不可發布、不可寫案例
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('author');
select pg_temp.assert(pg_temp.try_post_insert('rls-author-own', 'draft', current_setting('test.author')::uuid) = 1, 'author 可建立自己的草稿文章');
select pg_temp.assert(pg_temp.try_post_update('rls-author-own') = 1, 'author 可修改自己的草稿文章');
select pg_temp.assert(pg_temp.try_post_update('rls-draft-post') = 0, 'author 不可修改別人的文章');
select pg_temp.assert(pg_temp.try_post_insert('rls-author-published', 'published', current_setting('test.author')::uuid) = -1, 'author 不可直接建立已發布文章');
do $$
declare n int;
begin
  update public.blog_posts set status = 'published', published_at = now() where slug = 'rls-author-own';
  get diagnostics n = row_count;
  raise exception 'FAIL: author 不可將自己的草稿改為已發布（影響 % 列）', n;
exception
  when insufficient_privilege then null;
  when others then if sqlerrm like 'FAIL:%' then raise; else null; end if;
end $$;
select pg_temp.assert(pg_temp.try_case_insert('rls-author-case') = -1, 'author 不可新增案例');
select pg_temp.assert(pg_temp.try_case_update('rls-draft-case') = 0, 'author 不可修改案例');
reset role;
select pg_temp.logout();
select pg_temp.assert((select status from public.blog_posts where slug = 'rls-author-own') = 'draft', 'author 的文章仍為草稿');

-- ---------------------------------------------------------------------
-- 8. editor / admin / owner：可以完整管理內容
-- ---------------------------------------------------------------------
set local role authenticated;
select pg_temp.login('editor');
select pg_temp.assert(pg_temp.try_post_insert('rls-editor-post', 'draft') = 1, 'editor 可新增文章');
select pg_temp.assert(pg_temp.try_post_update('rls-editor-post') = 1, 'editor 可修改文章');
select pg_temp.assert(pg_temp.try_case_insert('rls-editor-case') = 1, 'editor 可新增案例');
select pg_temp.assert(pg_temp.try_case_update('rls-editor-case') = 1, 'editor 可修改案例');
select pg_temp.assert(pg_temp.try_rebuild_insert() = 1, 'editor 可提出重建請求');
do $$
declare n int;
begin
  update public.blog_posts set status = 'published', published_at = now() where slug = 'rls-editor-post';
  get diagnostics n = row_count;
  perform pg_temp.assert(n = 1, 'editor 可以發布文章');
end $$;
-- seo_metadata：內容角色可寫
insert into public.seo_metadata(entity_type, entity_id, seo_title, meta_description, og_image_url)
select 'blog_post', id, 'RLS SEO 標題', 'RLS SEO 描述', '/images/og/blog-og-1200x630.png' from public.blog_posts where slug = 'rls-editor-post';
select pg_temp.assert((select count(*) from public.seo_metadata where seo_title = 'RLS SEO 標題') = 1, 'editor 可寫入 seo_metadata');
insert into public.audit_logs(actor_id, actor_type, action, entity_type, metadata)
values (current_setting('test.editor')::uuid, 'admin', 'cms.blog.publish', 'blog_posts', '{"slug":"rls-editor-post"}');

select pg_temp.login('admin');
select pg_temp.assert(pg_temp.try_post_update('rls-editor-post') = 1, 'admin 可修改其他人建立的文章');
select pg_temp.assert(pg_temp.try_case_update('rls-editor-case') = 1, 'admin 可修改案例');
do $$
declare n int;
begin
  update public.marketing_rebuild_requests set status = 'synced', completed_at = now();
  get diagnostics n = row_count;
  perform pg_temp.assert(n >= 1, 'admin 可更新重建請求狀態');
end $$;

select pg_temp.login('owner');
select pg_temp.assert(pg_temp.try_post_update('rls-editor-post') = 1, 'owner 可修改文章');
select pg_temp.assert(pg_temp.try_case_update('rls-editor-case') = 1, 'owner 可修改案例');
-- slug 唯一
do $$
begin
  insert into public.blog_posts(slug, title, content, status) values ('rls-editor-post', 'duplicate', '', 'draft');
  raise exception 'FAIL: blog_posts.slug 必須唯一';
exception when unique_violation then
  null;
end $$;
do $$
begin
  insert into public.case_studies(slug, title, status) values ('rls-editor-case', 'duplicate', 'draft');
  raise exception 'FAIL: case_studies.slug 必須唯一';
exception when unique_violation then
  null;
end $$;
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 9. audit_logs 內容
-- ---------------------------------------------------------------------
select pg_temp.assert(
  (select count(*) from public.audit_logs where action = 'cms.blog.publish' and actor_id = current_setting('test.editor')::uuid) = 1,
  'editor 的 cms.blog.publish audit log 已寫入');
select pg_temp.assert(
  (select metadata ->> 'slug' from public.audit_logs where action = 'cms.blog.publish' and actor_id = current_setting('test.editor')::uuid limit 1) = 'rls-editor-post',
  'audit metadata 記錄 slug');
select pg_temp.assert(
  (select count(*) from public.audit_logs where action like 'cms.%' and id > (select coalesce(max(id), 0) - 1000 from public.audit_logs) and (before_data is not null or after_data is not null)) = 0,
  'CMS audit log 不存整篇內容（before_data / after_data 留空）');

select 'cms_content_rls: ALL PASSED' as result;
rollback;
