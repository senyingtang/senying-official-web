-- =====================================================================
-- 0014_storage.sql
-- Buckets
--   public-assets           （v1.0 沿用）森映官網公開圖片；後台角色上傳
--   private-admin-uploads   （v1.0 架構文件規劃）後台私有檔案
--   customer-site-assets    客戶網站圖片；路徑 {workspace_id}/{site_project_id}/{uuid}.{ext}
--   template-assets         版型縮圖 / 預覽圖；森映 owner / admin 管理
--   ai-article-exports      SEO 文章匯出檔；路徑 internal/... 或 {workspace_id}/...
-- 檔名一律使用 UUID，不使用原始中文檔名作為 storage key。
-- 客戶上傳不允許 SVG（可夾帶 script）。
-- =====================================================================
begin;

create or replace function public.try_uuid(value text) returns uuid
language plpgsql immutable set search_path = public, pg_temp as $$
begin
  return value::uuid;
exception when others then
  return null;
end $$;
revoke all on function public.try_uuid(text) from public, anon, authenticated;
grant execute on function public.try_uuid(text) to anon, authenticated, service_role;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types) values
  ('public-assets', 'public-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml']),
  ('private-admin-uploads', 'private-admin-uploads', false, 20971520, array['image/jpeg','image/png','image/webp','image/avif','application/pdf']),
  ('customer-site-assets', 'customer-site-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif','image/gif']),
  ('template-assets', 'template-assets', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('ai-article-exports', 'ai-article-exports', false, 5242880, array['text/markdown','text/html','application/json','application/ld+json','text/plain'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- 移除 v1.0 / 先前版本的同名 policy 後重建
do $$
declare p text;
begin
  foreach p in array array[
    'storage_public_read','storage_admin_insert','storage_admin_update','storage_admin_delete',
    'syt_public_assets_read','syt_public_assets_insert','syt_public_assets_update','syt_public_assets_delete',
    'syt_private_admin_read','syt_private_admin_insert','syt_private_admin_update','syt_private_admin_delete',
    'syt_customer_site_assets_read','syt_customer_site_assets_insert','syt_customer_site_assets_update','syt_customer_site_assets_delete',
    'syt_template_assets_read','syt_template_assets_manage',
    'syt_ai_exports_read','syt_ai_exports_insert','syt_ai_exports_delete'
  ] loop
    execute format('drop policy if exists %I on storage.objects', p);
  end loop;
end $$;

-- public-assets（v1.0 角色矩陣：editor 以上可上傳 / 修改；author 可上傳；owner / admin 可刪除）
create policy syt_public_assets_read on storage.objects for select using (bucket_id = 'public-assets');
create policy syt_public_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]));
create policy syt_public_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and public.can_publish_content())
  with check (bucket_id = 'public-assets' and public.can_publish_content());
create policy syt_public_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_admin());

-- private-admin-uploads
create policy syt_private_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'private-admin-uploads' and public.is_cms_staff());
create policy syt_private_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'private-admin-uploads' and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]));
create policy syt_private_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'private-admin-uploads' and public.can_publish_content())
  with check (bucket_id = 'private-admin-uploads' and public.can_publish_content());
create policy syt_private_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'private-admin-uploads' and public.is_admin());

-- customer-site-assets：第 1 層 = workspace_id、第 2 層 = site_project_id，且兩者必須對應
create policy syt_customer_site_assets_read on storage.objects for select to authenticated
  using (bucket_id = 'customer-site-assets'
         and public.try_uuid((storage.foldername(name))[1]) = public.site_project_workspace_id(public.try_uuid((storage.foldername(name))[2]))
         and public.can_read_site_project(public.try_uuid((storage.foldername(name))[2])));
create policy syt_customer_site_assets_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'customer-site-assets'
         and public.try_uuid((storage.foldername(name))[1]) = public.site_project_workspace_id(public.try_uuid((storage.foldername(name))[2]))
         and public.can_edit_site_project(public.try_uuid((storage.foldername(name))[2])));
create policy syt_customer_site_assets_update on storage.objects for update to authenticated
  using (bucket_id = 'customer-site-assets'
         and public.try_uuid((storage.foldername(name))[1]) = public.site_project_workspace_id(public.try_uuid((storage.foldername(name))[2]))
         and public.can_edit_site_project(public.try_uuid((storage.foldername(name))[2])))
  with check (bucket_id = 'customer-site-assets'
         and public.try_uuid((storage.foldername(name))[1]) = public.site_project_workspace_id(public.try_uuid((storage.foldername(name))[2]))
         and public.can_edit_site_project(public.try_uuid((storage.foldername(name))[2])));
create policy syt_customer_site_assets_delete on storage.objects for delete to authenticated
  using (bucket_id = 'customer-site-assets'
         and public.try_uuid((storage.foldername(name))[1]) = public.site_project_workspace_id(public.try_uuid((storage.foldername(name))[2]))
         and public.can_edit_site_project(public.try_uuid((storage.foldername(name))[2])));

-- template-assets
create policy syt_template_assets_read on storage.objects for select using (bucket_id = 'template-assets');
create policy syt_template_assets_manage on storage.objects for all to authenticated
  using (bucket_id = 'template-assets' and public.is_admin())
  with check (bucket_id = 'template-assets' and public.is_admin());

-- ai-article-exports：internal/ = 森映內部；{workspace_id}/ = 客戶（v2 flag）
create policy syt_ai_exports_read on storage.objects for select to authenticated
  using (bucket_id = 'ai-article-exports' and (
    ((storage.foldername(name))[1] = 'internal' and public.is_cms_staff())
    or public.is_admin()
    or public.can_access_ai_workspace(public.try_uuid((storage.foldername(name))[1]), array['owner','admin','editor','viewer'])));
create policy syt_ai_exports_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'ai-article-exports' and (
    ((storage.foldername(name))[1] = 'internal' and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]))
    or public.can_access_ai_workspace(public.try_uuid((storage.foldername(name))[1]), array['owner','admin','editor'])));
create policy syt_ai_exports_delete on storage.objects for delete to authenticated
  using (bucket_id = 'ai-article-exports' and (
    public.is_admin()
    or public.can_access_ai_workspace(public.try_uuid((storage.foldername(name))[1]), array['owner','admin'])));

commit;
