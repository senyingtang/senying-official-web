begin;
do $$ declare t text; begin
 foreach t in array array['admin_profiles','cms_site_settings','cms_assets','cms_pages','cms_page_sections','seo_metadata','seo_redirects','blog_categories','blog_tags','blog_posts','blog_post_tags','products','product_features','services','service_features','case_studies','case_metrics','case_assets','case_services','case_products','faqs','cta_blocks','cms_navigation_menus','cms_navigation_items','contact_inquiries','conversion_events','audit_logs'] loop
   execute format('alter table public.%I enable row level security',t);
 end loop;
end $$;

-- Public read
create policy pages_public_read on public.cms_pages for select using(public.is_publicly_visible(status,published_at,scheduled_at));
create policy sections_public_read on public.cms_page_sections for select using(is_enabled and exists(select 1 from public.cms_pages p where p.id=page_id and public.is_publicly_visible(p.status,p.published_at,p.scheduled_at)));
create policy site_public_read on public.cms_site_settings for select using(is_public);
create policy assets_public_read on public.cms_assets for select using(bucket='public-assets');
create policy seo_public_read on public.seo_metadata for select using(true);
create policy redirects_public_read on public.seo_redirects for select using(is_active);
create policy categories_public_read on public.blog_categories for select using(is_active);
create policy tags_public_read on public.blog_tags for select using(true);
create policy posts_public_read on public.blog_posts for select using(public.is_publicly_visible(status,published_at,scheduled_at));
create policy post_tags_public_read on public.blog_post_tags for select using(exists(select 1 from public.blog_posts p where p.id=post_id and public.is_publicly_visible(p.status,p.published_at,p.scheduled_at)));
create policy products_public_read on public.products for select using(public.is_publicly_visible(status,published_at,null));
create policy product_features_public_read on public.product_features for select using(exists(select 1 from public.products p where p.id=product_id and public.is_publicly_visible(p.status,p.published_at,null)));
create policy services_public_read on public.services for select using(public.is_publicly_visible(status,published_at,null));
create policy service_features_public_read on public.service_features for select using(exists(select 1 from public.services s where s.id=service_id and public.is_publicly_visible(s.status,s.published_at,null)));
create policy cases_public_read on public.case_studies for select using(public.is_publicly_visible(status,published_at,null));
create policy case_metrics_public_read on public.case_metrics for select using(exists(select 1 from public.case_studies c where c.id=case_id and public.is_publicly_visible(c.status,c.published_at,null)));
create policy case_assets_public_read on public.case_assets for select using(exists(select 1 from public.case_studies c where c.id=case_id and public.is_publicly_visible(c.status,c.published_at,null)));
create policy case_services_public_read on public.case_services for select using(true);
create policy case_products_public_read on public.case_products for select using(true);
create policy faqs_public_read on public.faqs for select using(is_published);
create policy ctas_public_read on public.cta_blocks for select using(is_active);
create policy menus_public_read on public.cms_navigation_menus for select using(is_active);
create policy nav_items_public_read on public.cms_navigation_items for select using(is_active and exists(select 1 from public.cms_navigation_menus m where m.id=menu_id and m.is_active));

-- Admin broad read
create policy admin_profiles_admin_read on public.admin_profiles for select to authenticated using(public.has_admin_role(array['owner','admin','editor','author','viewer']::public.cms_admin_role[]));

do $$ declare t text; begin
 foreach t in array array['cms_site_settings','cms_assets','cms_pages','cms_page_sections','seo_metadata','seo_redirects','blog_categories','blog_tags','blog_posts','blog_post_tags','products','product_features','services','service_features','case_studies','case_metrics','case_assets','case_services','case_products','faqs','cta_blocks','cms_navigation_menus','cms_navigation_items','contact_inquiries','conversion_events','audit_logs'] loop
   execute format('create policy %I_admin_read on public.%I for select to authenticated using (public.has_admin_role(array[''owner'',''admin'',''editor'',''author'',''viewer'']::public.cms_admin_role[]))',t,t);
 end loop;
end $$;

-- Owner-only profiles
create policy admin_profiles_owner_insert on public.admin_profiles for insert to authenticated with check(public.has_admin_role(array['owner']::public.cms_admin_role[]) or not exists(select 1 from public.admin_profiles));
create policy admin_profiles_owner_update on public.admin_profiles for update to authenticated using(public.has_admin_role(array['owner']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner']::public.cms_admin_role[]));
create policy admin_profiles_owner_delete on public.admin_profiles for delete to authenticated using(public.has_admin_role(array['owner']::public.cms_admin_role[]));

-- Owner/admin system tables
create policy settings_manage on public.cms_site_settings for all to authenticated using(public.has_admin_role(array['owner','admin']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));
create policy redirects_manage on public.seo_redirects for all to authenticated using(public.has_admin_role(array['owner','admin']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));
create policy nav_menus_manage on public.cms_navigation_menus for all to authenticated using(public.has_admin_role(array['owner','admin']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));
create policy nav_items_manage on public.cms_navigation_items for all to authenticated using(public.has_admin_role(array['owner','admin']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));

-- Content editors

do $$ declare t text; begin
 foreach t in array array['cms_assets','cms_pages','cms_page_sections','seo_metadata','blog_categories','blog_tags','blog_post_tags','products','product_features','services','service_features','case_studies','case_metrics','case_assets','case_services','case_products','faqs','cta_blocks'] loop
   execute format('create policy %I_manage on public.%I for all to authenticated using (public.has_admin_role(array[''owner'',''admin'',''editor'']::public.cms_admin_role[])) with check (public.has_admin_role(array[''owner'',''admin'',''editor'']::public.cms_admin_role[]))',t,t);
 end loop;
end $$;

-- Blog authors own drafts/posts; editors manage all
create policy posts_editor_manage on public.blog_posts for all to authenticated using(public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[]));
create policy posts_author_insert on public.blog_posts for insert to authenticated with check(public.current_admin_role()='author' and author_id=auth.uid() and status in('draft','review'));
create policy posts_author_update on public.blog_posts for update to authenticated using(public.current_admin_role()='author' and author_id=auth.uid()) with check(public.current_admin_role()='author' and author_id=auth.uid() and status in('draft','review'));
create policy posts_author_delete on public.blog_posts for delete to authenticated using(public.current_admin_role()='author' and author_id=auth.uid() and status<>'published');

-- Inquiries and events
create policy inquiries_public_insert on public.contact_inquiries for insert to anon,authenticated with check(consent_at is not null and length(name) between 1 and 120 and length(message) between 10 and 5000);
create policy inquiries_manage on public.contact_inquiries for update to authenticated using(public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[])) with check(public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[]));
create policy events_public_insert on public.conversion_events for insert to anon,authenticated with check(length(event_name) between 1 and 100);
create policy events_admin_delete on public.conversion_events for delete to authenticated using(public.has_admin_role(array['owner','admin']::public.cms_admin_role[]));
create policy audit_insert_authenticated on public.audit_logs for insert to authenticated with check(actor_id=auth.uid());
commit;
