-- Keep shared publication feed aligned with platform table conventions.
-- Additive and backwards-compatible for the SEO publisher.

alter table public.published_content_feed
    add column if not exists created_at timestamptz not null default now();
