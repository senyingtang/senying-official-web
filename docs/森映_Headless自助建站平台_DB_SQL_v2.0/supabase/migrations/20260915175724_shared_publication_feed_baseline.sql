-- Shared publication feed baseline.
-- Canonical local copy of remote migration 20260915175724.
-- Remote project already has this migration version applied.

create table if not exists public.publication_sites (
    site_id uuid primary key,
    site_name text not null,
    status text not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint publication_sites_status_check
        check (status in ('active', 'paused', 'archived'))
);

create table if not exists public.published_content_feed (
    site_id uuid not null,
    article_id uuid not null,
    revision_id uuid not null,
    revision_number integer not null,
    slug text not null,
    title text not null,
    excerpt text,
    meta_title text,
    meta_description text,
    canonical_url text,
    featured_image_url text,
    author_name text,
    content_hash text not null,
    snapshot_json jsonb not null,
    publication_status text not null default 'published',
    published_at timestamptz not null,
    source_updated_at timestamptz,
    synced_at timestamptz not null default now(),

    constraint published_content_feed_pkey
        primary key (site_id, article_id),

    constraint published_content_feed_site_id_slug_key
        unique (site_id, slug),

    constraint published_content_feed_publication_status_check
        check (publication_status in ('published', 'unpublished')),

    constraint published_content_feed_revision_number_check
        check (revision_number > 0),

    constraint published_content_feed_site_id_fkey
        foreign key (site_id)
        references public.publication_sites(site_id)
        on delete cascade
);

create index if not exists published_content_feed_site_status_idx
    on public.published_content_feed (
        site_id,
        publication_status,
        published_at desc
    );

alter table public.publication_sites
    enable row level security;

alter table public.published_content_feed
    enable row level security;

drop policy if exists "public can read active publication sites"
    on public.publication_sites;

create policy "public can read active publication sites"
    on public.publication_sites
    for select
    to anon, authenticated
    using (status = 'active');

drop policy if exists "public can read published content"
    on public.published_content_feed;

create policy "public can read published content"
    on public.published_content_feed
    for select
    to anon, authenticated
    using (
        publication_status = 'published'
        and exists (
            select 1
            from public.publication_sites s
            where s.site_id = published_content_feed.site_id
              and s.status = 'active'
        )
    );

grant all on table public.publication_sites
    to service_role;

grant all on table public.published_content_feed
    to service_role;
