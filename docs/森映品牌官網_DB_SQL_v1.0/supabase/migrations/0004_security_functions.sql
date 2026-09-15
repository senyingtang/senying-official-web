begin;
create or replace function public.current_admin_role() returns public.cms_admin_role
language sql stable security definer set search_path=public,auth as $$
 select role from public.admin_profiles where user_id=auth.uid() and is_active=true limit 1
$$;
revoke all on function public.current_admin_role() from public;
grant execute on function public.current_admin_role() to authenticated;

create or replace function public.has_admin_role(allowed public.cms_admin_role[]) returns boolean
language sql stable security definer set search_path=public,auth as $$
 select coalesce(public.current_admin_role()=any(allowed),false)
$$;
revoke all on function public.has_admin_role(public.cms_admin_role[]) from public;
grant execute on function public.has_admin_role(public.cms_admin_role[]) to authenticated;

create or replace function public.can_publish_content() returns boolean language sql stable as $$
 select public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[])
$$;
create or replace function public.is_publicly_visible(s public.cms_publish_status,published_at timestamptz,scheduled_at timestamptz default null)
returns boolean language sql stable as $$
 select s='published' and published_at is not null and published_at<=now() and (scheduled_at is null or scheduled_at<=now())
$$;

create or replace function public.guard_admin_profile_changes() returns trigger language plpgsql security definer set search_path=public,auth as $$
declare actor public.cms_admin_role; owners int;
begin
 actor:=public.current_admin_role();
 if tg_op='INSERT' and not (actor='owner' or not exists(select 1 from public.admin_profiles)) then raise exception 'owner required'; end if;
 if tg_op in('UPDATE','DELETE') and actor<>'owner' then raise exception 'owner required'; end if;
 if tg_op='DELETE' and old.role='owner' and old.is_active then
   select count(*) into owners from public.admin_profiles where role='owner' and is_active and user_id<>old.user_id;
   if owners=0 then raise exception 'cannot remove last active owner'; end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
drop trigger if exists trg_guard_admin_profiles on public.admin_profiles;
create trigger trg_guard_admin_profiles before insert or update or delete on public.admin_profiles for each row execute function public.guard_admin_profile_changes();
commit;
