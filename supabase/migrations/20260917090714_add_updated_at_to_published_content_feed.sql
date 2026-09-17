-- Keep shared publication tables aligned with platform updated_at conventions.
--
-- publication_sites already has updated_at from the original shared schema,
-- but it was created after 0011_indexes_triggers.sql, so it never received
-- the platform set_updated_at trigger.
--
-- published_content_feed needs both the updated_at column and trigger.

alter table public.published_content_feed
    add column if not exists updated_at timestamptz not null default now();


-- publication_sites

drop trigger if exists trg_publication_sites_updated_at
    on public.publication_sites;

create trigger trg_publication_sites_updated_at
    before update on public.publication_sites
    for each row
    execute function public.set_updated_at();


-- published_content_feed

drop trigger if exists trg_published_content_feed_updated_at
    on public.published_content_feed;

create trigger trg_published_content_feed_updated_at
    before update on public.published_content_feed
    for each row
    execute function public.set_updated_at();
