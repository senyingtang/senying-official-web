-- Shared publication feed permission hardening.
-- Browser/public clients are read-only.
-- SEO publishing remains server-side/service-role controlled.

revoke all on table public.publication_sites
    from anon, authenticated;

revoke all on table public.published_content_feed
    from anon, authenticated;

grant select on table public.publication_sites
    to anon, authenticated;

grant select on table public.published_content_feed
    to anon, authenticated;

grant all on table public.publication_sites
    to service_role;

grant all on table public.published_content_feed
    to service_role;
