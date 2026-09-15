begin;
create extension if not exists pgcrypto;
create extension if not exists citext;

do $$ begin
  create type public.cms_publish_status as enum ('draft','review','scheduled','published','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cms_admin_role as enum ('owner','admin','editor','author','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.cms_visibility as enum ('all','desktop','mobile');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.inquiry_status as enum ('new','contacted','qualified','closed','spam');
exception when duplicate_object then null; end $$;
commit;
