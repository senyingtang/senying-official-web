begin;
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

do $$ declare t text; begin
 foreach t in array array['admin_profiles','cms_site_settings','cms_assets','cms_pages','cms_page_sections','seo_metadata','seo_redirects','blog_categories','blog_tags','blog_posts','products','product_features','services','service_features','case_studies','case_metrics','faqs','cta_blocks','cms_navigation_menus','cms_navigation_items','contact_inquiries'] loop
   execute format('drop trigger if exists trg_%I_updated_at on public.%I',t,t);
   execute format('create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
 end loop;
end $$;
commit;
