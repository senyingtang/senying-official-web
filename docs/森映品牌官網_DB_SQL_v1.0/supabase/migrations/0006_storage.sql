begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('public-assets','public-assets',true,10485760,array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy storage_public_read on storage.objects for select using(bucket_id='public-assets');
create policy storage_admin_insert on storage.objects for insert to authenticated with check(bucket_id='public-assets' and public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[]));
create policy storage_admin_update on storage.objects for update to authenticated using(bucket_id='public-assets' and public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[])) with check(bucket_id='public-assets' and public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[]));
create policy storage_admin_delete on storage.objects for delete to authenticated using(bucket_id='public-assets' and public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));
commit;
