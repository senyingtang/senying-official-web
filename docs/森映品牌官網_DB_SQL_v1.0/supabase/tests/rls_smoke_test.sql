-- Run in a disposable/local Supabase project after migrations.
-- 1. Confirm RLS enabled
select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relname in('cms_pages','blog_posts','products','services','contact_inquiries','admin_profiles');
-- 2. Public must only see published rows (execute with anon JWT in integration test).
-- 3. Author must not publish directly; owner/admin/editor may publish.
-- 4. Last active owner cannot be deleted.
-- 5. Anonymous inquiry insert requires consent_at, valid name, message >= 10 chars.
