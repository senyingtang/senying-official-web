-- =====================================================================
-- 0012_security_functions.sql
-- 權限 helper、guard trigger、交易安全的業務函式。
--
-- 身分判斷：
--   is_service_role()     JWT role = service_role；無 JWT（psql / SQL Editor 以 postgres 執行）亦視為服務端
--   is_internal_context() current_user 不是 anon / authenticated（= service_role、postgres 或 SECURITY DEFINER 函式內）
--                         guard trigger 用它區分「API 直接寫入」與「受信任函式內寫入」，無法由前端偽造
--   current_admin_role() / is_admin() / is_owner() / is_cms_staff()：森映後台角色（admin_profiles）
--   is_workspace_member() / has_workspace_role() / current_workspace_role()：客戶 workspace 角色
--
-- 交易安全：
--   redeem_access_code / create_workspace_from_access_code：select ... for update 鎖定代碼列 + 成功兌換唯一索引
--   consume_usage_quota：鎖定 entitlement 與 quota 列後才檢查、扣除，並支援 idempotency_key
--   mark_payment_success_and_issue_entitlement：鎖定訂單列 + entitlements_issued_at 冪等標記
--   create_site_project_from_template：鎖定 workspace 列，避免併發建立超過網站額度
-- =====================================================================
begin;

-- =====================================================================
-- A. 基礎身分 helper
-- =====================================================================
create or replace function public.is_service_role() returns boolean
language sql stable security invoker set search_path = public, pg_temp as $$
  select case
    when nullif(current_setting('request.jwt.claims', true), '') is not null
      then coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '') = 'service_role'
    when nullif(current_setting('request.jwt.claim.role', true), '') is not null
      then current_setting('request.jwt.claim.role', true) = 'service_role'
    else session_user in ('postgres', 'supabase_admin')
  end
$$;

create or replace function public.is_internal_context() returns boolean
language sql stable security invoker set search_path = public, pg_temp as $$
  select current_user not in ('anon', 'authenticated')
$$;

-- v1.0 沿用（同名同回傳型別）
create or replace function public.current_admin_role() returns public.cms_admin_role
language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.admin_profiles where user_id = auth.uid() and is_active = true limit 1
$$;

create or replace function public.has_admin_role(allowed public.cms_admin_role[]) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(public.current_admin_role() = any(allowed), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.has_admin_role(array['owner','admin']::public.cms_admin_role[])
$$;

create or replace function public.is_owner() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.has_admin_role(array['owner']::public.cms_admin_role[])
$$;

create or replace function public.is_cms_staff() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.current_admin_role() is not null
$$;

create or replace function public.can_publish_content() returns boolean
language sql stable security invoker set search_path = public, pg_temp as $$
  select public.has_admin_role(array['owner','admin','editor']::public.cms_admin_role[])
$$;

create or replace function public.is_publicly_visible(s public.cms_publish_status, published_at timestamptz, scheduled_at timestamptz default null)
returns boolean language sql stable security invoker set search_path = public, pg_temp as $$
  select s = 'published' and published_at is not null and published_at <= now() and (scheduled_at is null or scheduled_at <= now())
$$;

create or replace function public.platform_feature_enabled(flag text) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(
    (select (s.setting_value ->> platform_feature_enabled.flag)::boolean
       from public.cms_site_settings s where s.setting_key = 'platform.feature_flags'),
    false)
$$;

-- =====================================================================
-- B. Workspace / Site project helper
-- =====================================================================
create or replace function public.current_workspace_role(workspace_id uuid) returns public.workspace_member_role
language sql stable security definer set search_path = public, pg_temp as $$
  select m.role from public.customer_workspace_members m
  where m.workspace_id = current_workspace_role.workspace_id and m.user_id = auth.uid() and m.status = 'active'
  limit 1
$$;

create or replace function public.is_workspace_member(workspace_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.customer_workspace_members m
    where m.workspace_id = is_workspace_member.workspace_id and m.user_id = auth.uid() and m.status = 'active'
  )
$$;

-- 寫入類權限：workspace 必須為 active
create or replace function public.has_workspace_role(workspace_id uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.customer_workspace_members m
    join public.customer_workspaces w on w.id = m.workspace_id
    where m.workspace_id = has_workspace_role.workspace_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and w.status = 'active'
      and m.role::text = any(has_workspace_role.roles)
  )
$$;

create or replace function public.site_project_workspace_id(site_project_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select p.workspace_id from public.customer_site_projects p where p.id = site_project_workspace_id.site_project_id
$$;

create or replace function public.can_read_site_project(site_project_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or public.is_workspace_member(public.site_project_workspace_id(can_read_site_project.site_project_id))
$$;

create or replace function public.can_edit_site_project(site_project_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or exists (
    select 1 from public.customer_site_projects p
    where p.id = can_edit_site_project.site_project_id
      and p.status not in ('suspended','archived')
      and public.has_workspace_role(p.workspace_id, array['owner','admin','editor'])
  )
$$;

create or replace function public.can_manage_site_project(site_project_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.is_admin() or exists (
    select 1 from public.customer_site_projects p
    where p.id = can_manage_site_project.site_project_id
      and p.status not in ('suspended','archived')
      and public.has_workspace_role(p.workspace_id, array['owner','admin'])
  )
$$;

-- 前台公開條件：網站已發布 + 發布設定公開（非 preview_only）+ workspace active
create or replace function public.is_site_publicly_visible(site_project_id uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.customer_site_projects p
    join public.customer_site_publish_settings ps on ps.site_project_id = p.id
    join public.customer_workspaces w on w.id = p.workspace_id
    where p.id = is_site_publicly_visible.site_project_id
      and p.status = 'published'
      and ps.is_public
      and ps.publish_mode <> 'preview_only'
      and w.status = 'active'
  )
$$;

-- =====================================================================
-- C. Entitlement helper
-- =====================================================================
create or replace function public.has_active_entitlement(user_id uuid, feature_key text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  -- 只允許查自己；admin / service 可查任何人（避免探測他人權限）
  if has_active_entitlement.user_id is distinct from auth.uid() and not (public.is_admin() or public.is_service_role()) then
    return false;
  end if;
  return exists (
    select 1
    from public.user_entitlements ue
    join public.entitlement_products ep on ep.id = ue.entitlement_product_id and ep.is_active
    join public.entitlement_feature_rules r on r.entitlement_product_id = ue.entitlement_product_id and r.is_enabled
    join public.entitlement_features f on f.id = r.feature_id and f.is_active
    where ue.user_id = has_active_entitlement.user_id
      and ue.status = 'active'
      and ue.starts_at <= now()
      and (ue.expires_at is null or ue.expires_at > now())
      and f.feature_key = has_active_entitlement.feature_key::citext
  );
end $$;

create or replace function public.workspace_has_feature(workspace_id uuid, feature_key text) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if not (public.is_admin() or public.is_service_role() or public.is_workspace_member(workspace_has_feature.workspace_id)) then
    return false;
  end if;
  return exists (
    select 1
    from public.user_entitlements ue
    join public.entitlement_products ep on ep.id = ue.entitlement_product_id and ep.is_active
    join public.entitlement_feature_rules r on r.entitlement_product_id = ue.entitlement_product_id and r.is_enabled
    join public.entitlement_features f on f.id = r.feature_id and f.is_active
    where ue.workspace_id = workspace_has_feature.workspace_id
      and ue.status = 'active'
      and ue.starts_at <= now()
      and (ue.expires_at is null or ue.expires_at > now())
      and f.feature_key = workspace_has_feature.feature_key::citext
  );
end $$;

-- AI 文章生產器客戶端存取：v2 flag + workspace 角色 + 權限
create or replace function public.can_access_ai_workspace(workspace_id uuid, roles text[]) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select public.platform_feature_enabled('ai_article_generator.customer_access')
     and public.has_workspace_role(can_access_ai_workspace.workspace_id, can_access_ai_workspace.roles)
     and public.workspace_has_feature(can_access_ai_workspace.workspace_id, 'ai.article.generate')
$$;

-- =====================================================================
-- D. Request metadata / Audit
-- =====================================================================
create or replace function public.request_ip_hash() returns text
language plpgsql stable security invoker set search_path = public, pg_temp as $$
declare v_headers jsonb; v_ip text;
begin
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception when others then
    return null;
  end;
  v_ip := split_part(coalesce(v_headers ->> 'cf-connecting-ip', v_headers ->> 'x-forwarded-for', v_headers ->> 'x-real-ip', ''), ',', 1);
  if btrim(v_ip) = '' then return null; end if;
  return encode(sha256(convert_to(btrim(v_ip), 'UTF8')), 'hex');
end $$;

create or replace function public.request_user_agent() returns text
language plpgsql stable security invoker set search_path = public, pg_temp as $$
begin
  return left(nullif(current_setting('request.headers', true), '')::jsonb ->> 'user-agent', 500);
exception when others then
  return null;
end $$;

create or replace function public.write_audit_log(
  p_action text, p_entity_type text, p_entity_id uuid,
  p_before jsonb default null, p_after jsonb default null,
  p_workspace_id uuid default null, p_actor_type text default null, p_metadata jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into public.audit_logs(actor_id, actor_type, action, entity_type, entity_id, before_data, after_data, workspace_id, ip_hash, metadata)
  values (
    auth.uid(),
    coalesce(p_actor_type, case when public.is_cms_staff() then 'admin' when auth.uid() is null then 'system' else 'customer' end),
    p_action, p_entity_type, p_entity_id, p_before, p_after, p_workspace_id, public.request_ip_hash(), coalesce(p_metadata, '{}'::jsonb)
  );
end $$;

-- =====================================================================
-- E. Guard triggers
-- =====================================================================

-- E-1. admin_profiles：只有 owner 可管理後台帳號；最後一位啟用中 owner 不可刪除 / 停用 / 降級
--      v1.0 修正：v1 在 actor 為 null（非後台帳號）時 INSERT 判斷式為 null 而未擋下，v2 改為明確拒絕；
--      第一位 owner 只能由 service role / SQL Editor bootstrap。
create or replace function public.guard_admin_profile_changes() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_actor text := coalesce(public.current_admin_role()::text, '');
  v_internal boolean := public.is_internal_context();
  v_other_owners int;
begin
  if not v_internal then
    if tg_op = 'INSERT' and v_actor <> 'owner' then
      raise exception 'owner role required to create admin profiles' using errcode = '42501';
    end if;
    if tg_op in ('UPDATE','DELETE') and v_actor <> 'owner' then
      raise exception 'owner role required to modify admin profiles' using errcode = '42501';
    end if;
  end if;

  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' and old.is_active
     and (tg_op = 'DELETE' or new.role <> 'owner' or not new.is_active) then
    perform pg_advisory_xact_lock(hashtext('syt.admin_profiles.owner_guard'));
    select count(*) into v_other_owners from public.admin_profiles
    where role = 'owner' and is_active and user_id <> old.user_id;
    if v_other_owners = 0 then
      raise exception 'cannot remove, deactivate or demote the last active owner' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_guard_admin_profiles on public.admin_profiles;
create trigger trg_guard_admin_profiles before insert or update or delete on public.admin_profiles
  for each row execute function public.guard_admin_profile_changes();

-- E-2. Workspace 成員：只有 workspace owner 可授予 / 變更 owner；最後一位 active owner 不可移除 / 停用 / 降級
-- 只回傳給 workspace 成員 / 森映 admin / 服務端；其他人回傳 null（guard 以 coalesce 視為 0，fail closed）
create or replace function public.workspace_active_owner_count(p_workspace_id uuid, p_exclude_member_id uuid) returns int
language sql stable security definer set search_path = public, pg_temp as $$
  select case
    when public.is_workspace_member(p_workspace_id) or public.is_admin() or public.is_service_role() then (
      select count(*)::int from public.customer_workspace_members
      where workspace_id = p_workspace_id and role = 'owner' and status = 'active' and id <> p_exclude_member_id)
  end
$$;

create or replace function public.guard_workspace_member_changes() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  v_trusted boolean := public.is_internal_context() or public.is_admin();
  v_ws uuid := case when tg_op = 'DELETE' then old.workspace_id else new.workspace_id end;
  v_actor_role text := coalesce(public.current_workspace_role(v_ws)::text, '');
begin
  if tg_op = 'UPDATE' and (new.workspace_id <> old.workspace_id or new.user_id <> old.user_id) then
    raise exception 'workspace_id and user_id are immutable' using errcode = '42501';
  end if;

  if not v_trusted then
    if tg_op = 'INSERT' and new.role = 'owner' and v_actor_role <> 'owner' then
      raise exception 'only workspace owner can grant owner role' using errcode = '42501';
    end if;
    if tg_op = 'UPDATE' and (old.role = 'owner' or new.role = 'owner') and v_actor_role <> 'owner' then
      raise exception 'only workspace owner can change owner membership' using errcode = '42501';
    end if;
    if tg_op = 'DELETE' and old.role = 'owner' and old.user_id <> auth.uid() and v_actor_role <> 'owner' then
      raise exception 'only workspace owner can remove an owner' using errcode = '42501';
    end if;
  end if;

  if tg_op in ('UPDATE','DELETE') and old.role = 'owner' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'owner' or new.status <> 'active') then
    -- workspace 本身被刪除時（cascade）允許
    if tg_op = 'DELETE' and pg_trigger_depth() > 1
       and not exists (select 1 from public.customer_workspaces w where w.id = old.workspace_id) then
      return old;
    end if;
    perform pg_advisory_xact_lock(hashtext('syt.workspace_owner_guard:' || old.workspace_id::text));
    if coalesce(public.workspace_active_owner_count(old.workspace_id, old.id), 0) = 0 then
      raise exception 'cannot remove, deactivate or demote the last active workspace owner' using errcode = '23514';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists trg_guard_workspace_members on public.customer_workspace_members;
create trigger trg_guard_workspace_members before insert or update or delete on public.customer_workspace_members
  for each row execute function public.guard_workspace_member_changes();

-- E-3. Workspace / settings：客戶不可自行變更狀態、擁有者、額度覆寫、來源欄位、feature_flags
create or replace function public.guard_workspace_changes() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if public.is_internal_context() or public.is_admin() then
    return new;
  end if;
  if tg_table_name = 'customer_workspaces' then
    if new.owner_user_id is distinct from old.owner_user_id
       or new.status is distinct from old.status
       or new.site_project_limit_override is distinct from old.site_project_limit_override
       or new.source_access_code_id is distinct from old.source_access_code_id
       or new.source_entitlement_id is distinct from old.source_entitlement_id
       or new.suspended_at is distinct from old.suspended_at
       or new.archived_at is distinct from old.archived_at then
      raise exception 'restricted workspace fields can only be changed by Senying admin' using errcode = '42501';
    end if;
  elsif tg_table_name = 'customer_workspace_settings' then
    if new.feature_flags is distinct from old.feature_flags or new.workspace_id is distinct from old.workspace_id then
      raise exception 'feature_flags can only be changed by Senying admin' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_customer_workspaces on public.customer_workspaces;
create trigger trg_guard_customer_workspaces before update on public.customer_workspaces
  for each row execute function public.guard_workspace_changes();
drop trigger if exists trg_guard_customer_workspace_settings on public.customer_workspace_settings;
create trigger trg_guard_customer_workspace_settings before update on public.customer_workspace_settings
  for each row execute function public.guard_workspace_changes();

-- E-4. Access codes：禁止人工建立；已兌換欄位不可改；API 直接更新只允許撤銷 / 延長期限 / metadata
create or replace function public.guard_access_code_insert() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if coalesce(current_setting('syt.access_code_generator', true), '') <> 'on' then
    raise exception 'access codes must be created by issue_access_code(); manual codes are not allowed' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_access_codes_insert on public.access_codes;
create trigger trg_guard_access_codes_insert before insert on public.access_codes
  for each row execute function public.guard_access_code_insert();

create or replace function public.guard_access_code_update() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  -- 外鍵 on delete set null（刪除帳號 / workspace / 訂閱）造成的欄位清空：允許
  -- （兌換者 redeemed_by_user_id 為 on delete restrict，仍不可硬刪除）
  if pg_trigger_depth() > 1 and not exists (
    select 1 from jsonb_each(to_jsonb(new)) n join jsonb_each(to_jsonb(old)) o on o.key = n.key
    where n.key <> 'updated_at' and n.value is distinct from o.value
      and not (n.value = 'null'::jsonb and n.key in ('issued_to_user_id','created_by','revoked_by','redeemed_workspace_id','customer_subscription_id'))
  ) then
    return new;
  end if;

  if new.code is distinct from old.code or new.product_code is distinct from old.product_code
     or new.code_year is distinct from old.code_year or new.entitlement_product_id is distinct from old.entitlement_product_id
     or new.order_id is distinct from old.order_id or new.order_item_id is distinct from old.order_item_id
     or new.created_at is distinct from old.created_at or new.created_by is distinct from old.created_by then
    raise exception 'access code identity fields are immutable' using errcode = '42501';
  end if;

  if old.status = 'redeemed' then
    if new.redeemed_by_user_id is distinct from old.redeemed_by_user_id
       or new.redeemed_at is distinct from old.redeemed_at
       or new.issued_to_user_id is distinct from old.issued_to_user_id
       or new.issued_to_email is distinct from old.issued_to_email
       or new.status not in ('redeemed','revoked') then
      raise exception 'redeemed access code cannot be transferred or re-assigned' using errcode = '42501';
    end if;
  end if;

  if old.status = 'revoked' and new.status <> 'revoked' then
    raise exception 'revoked access code cannot be reactivated' using errcode = '42501';
  end if;

  if not public.is_internal_context() then
    -- API 直接更新（owner / admin）：只允許 revoke、調整 expires_at / metadata
    if new.status <> old.status and new.status <> 'revoked' then
      raise exception 'status can only be changed to revoked directly; use redeem / transfer functions' using errcode = '42501';
    end if;
    if new.issued_to_user_id is distinct from old.issued_to_user_id or new.issued_to_email is distinct from old.issued_to_email
       or new.redeemed_by_user_id is distinct from old.redeemed_by_user_id or new.redeemed_at is distinct from old.redeemed_at
       or new.transfer_count is distinct from old.transfer_count or new.redeemed_workspace_id is distinct from old.redeemed_workspace_id then
      raise exception 'holder / redemption fields can only be changed by transfer_access_code() or redeem_access_code()' using errcode = '42501';
    end if;
    if new.status = 'revoked' and old.status <> 'revoked' then
      new.revoked_at := coalesce(new.revoked_at, now());
      new.revoked_by := coalesce(new.revoked_by, auth.uid());
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_access_codes_update on public.access_codes;
create trigger trg_guard_access_codes_update before update on public.access_codes
  for each row execute function public.guard_access_code_update();

-- E-5. audit_logs：append-only；只允許外鍵 on delete set null 造成的欄位清空，刪除僅限 postgres（保存期限清理）
create or replace function public.guard_audit_log_mutation() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    if pg_trigger_depth() > 1
       and (to_jsonb(new) - 'actor_id' - 'workspace_id') = (to_jsonb(old) - 'actor_id' - 'workspace_id')
       and (new.actor_id is null or new.actor_id = old.actor_id)
       and (new.workspace_id is null or new.workspace_id = old.workspace_id) then
      return new;
    end if;
    raise exception 'audit_logs is append-only' using errcode = '42501';
  end if;
  if current_user not in ('postgres','supabase_admin') then
    raise exception 'audit_logs rows cannot be deleted' using errcode = '42501';
  end if;
  return old;
end $$;
drop trigger if exists trg_guard_audit_logs on public.audit_logs;
create trigger trg_guard_audit_logs before update or delete on public.audit_logs
  for each row execute function public.guard_audit_log_mutation();

-- E-6. 其他 ledger：API 端不可修改 / 刪除；受信任函式與 cascade 允許
create or replace function public.guard_append_only() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
begin
  if pg_trigger_depth() > 1 or current_user in ('postgres','supabase_admin') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'commerce_payment_transactions','access_code_redemptions','access_code_transfers','entitlement_usage_events',
    'site_domain_check_logs','ai_article_review_logs','ai_article_usage_events'
  ] loop
    execute format('drop trigger if exists trg_guard_append_only on public.%I', t);
    execute format('create trigger trg_guard_append_only before update or delete on public.%I for each row execute function public.guard_append_only()', t);
  end loop;
end $$;

-- E-7. 客戶網站結構：模板制，客戶只能改內容 / 排序 / 啟用；結構與發布欄位由函式或森映 admin 寫入
create or replace function public.guard_customer_site_structure() returns trigger
language plpgsql security invoker set search_path = public, pg_temp as $$
declare
  r_new jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  r_old jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_col text;
  v_locked text[];
begin
  if public.is_internal_context() or public.is_admin() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  case tg_table_name
    when 'customer_site_projects' then
      if tg_op <> 'UPDATE' then
        raise exception 'site projects are created by create_site_project_from_template()' using errcode = '42501';
      end if;
      v_locked := array['workspace_id','site_type','template_id','template_version_id','entitlement_id','status',
                        'published_version','published_at','suspended_at','suspended_reason','archived_at','created_by','created_at'];
    when 'customer_site_pages' then
      if tg_op <> 'UPDATE' then
        raise exception 'pages are defined by the template (template-based builder)' using errcode = '42501';
      end if;
      if new.status in ('published','scheduled') and new.status is distinct from old.status then
        raise exception 'use publish_site_project() to publish pages' using errcode = '42501';
      end if;
      v_locked := array['site_project_id','template_page_id','page_key','page_type','published_snapshot','published_at','created_by','created_at'];
    when 'customer_site_sections' then
      if tg_op <> 'UPDATE' then
        raise exception 'sections are defined by the template (no free drag-and-drop)' using errcode = '42501';
      end if;
      v_locked := array['site_project_id','page_id','template_section_id','section_key','section_type','created_at'];
    when 'customer_site_section_fields' then
      raise exception 'field definitions are managed by the template' using errcode = '42501';
    when 'customer_site_content_values' then
      if (tg_op in ('INSERT','UPDATE') and new.content_state <> 'draft') or (tg_op in ('UPDATE','DELETE') and old.content_state <> 'draft') then
        raise exception 'published content is written by publish_site_project()' using errcode = '42501';
      end if;
      if tg_op in ('INSERT','UPDATE') and not exists (
        select 1 from public.customer_site_section_fields f where f.id = new.field_id and f.is_customer_editable
      ) then
        raise exception 'field is not customer editable' using errcode = '42501';
      end if;
      if tg_op = 'UPDATE' then
        v_locked := array['site_project_id','section_id','field_id','field_key','locale','content_state','published_at','created_at'];
      end if;
    when 'customer_site_forms' then
      if tg_op <> 'UPDATE' then
        raise exception 'forms are defined by the template' using errcode = '42501';
      end if;
      v_locked := array['site_project_id','form_key','created_at'];
    when 'customer_site_form_submissions' then
      if tg_op <> 'UPDATE' then
        raise exception 'form submissions are created by submit_site_form()' using errcode = '42501';
      end if;
      v_locked := array['form_id','site_project_id','workspace_id','payload','source_path','utm_source','utm_medium','utm_campaign',
                        'consent_at','ip_hash','user_agent','spam_score','created_at'];
    when 'customer_site_publish_settings' then
      if tg_op <> 'UPDATE' then
        raise exception 'publish settings are created with the site project' using errcode = '42501';
      end if;
      -- 公開發布模式依平台階段開放（v1 preview_only）
      if new.publish_mode is distinct from old.publish_mode or new.is_public is distinct from old.is_public then
        if not (
          (new.publish_mode = 'preview_only' and not new.is_public)
          or (new.publish_mode = 'platform_subdomain' and public.platform_feature_enabled('site_builder.platform_subdomain'))
          or (new.publish_mode = 'custom_domain' and public.platform_feature_enabled('site_builder.custom_domain'))
        ) then
          raise exception 'publish mode % is not available in the current platform phase', new.publish_mode using errcode = '42501';
        end if;
      end if;
      v_locked := array['site_project_id','preview_token_sha256','preview_token_expires_at','last_published_at','last_published_by','created_at'];
    when 'site_project_domains' then
      if tg_op = 'INSERT' then
        raise exception 'domains are added by add_site_project_domain()' using errcode = '42501';
      end if;
      if tg_op = 'UPDATE' then
        if new.status is distinct from old.status and new.status <> 'removed' then
          raise exception 'domain status is updated by the verification worker' using errcode = '42501';
        end if;
        if new.status = 'removed' and old.status <> 'removed' then
          new.removed_at := coalesce(new.removed_at, now());
          new.is_primary := false;
          r_new := to_jsonb(new);
        end if;
        v_locked := array['site_project_id','workspace_id','domain','domain_type','apex_domain','subdomain_label','verification_token',
                          'verified_at','activated_at','last_checked_at','failure_reason','created_by','created_at'];
      end if;
    else
      null;
  end case;

  if tg_op = 'UPDATE' and v_locked is not null then
    foreach v_col in array v_locked loop
      if (r_new -> v_col) is distinct from (r_old -> v_col) then
        raise exception 'column %.% cannot be changed by workspace members', tg_table_name, v_col using errcode = '42501';
      end if;
    end loop;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'customer_site_projects','customer_site_pages','customer_site_sections','customer_site_section_fields',
    'customer_site_content_values','customer_site_forms','customer_site_form_submissions','customer_site_publish_settings',
    'site_project_domains'
  ] loop
    execute format('drop trigger if exists trg_guard_customer_site_structure on public.%I', t);
    execute format('create trigger trg_guard_customer_site_structure before insert or update or delete on public.%I for each row execute function public.guard_customer_site_structure()', t);
  end loop;
end $$;

-- =====================================================================
-- F. Access code functions
-- =====================================================================
create or replace function public.normalize_access_code(input text) returns text
language sql immutable set search_path = public, pg_temp as $$
  select upper(regexp_replace(coalesce(input, ''), '[\s_]+', '', 'g'))
$$;

-- 產生代碼字串（格式 SYT-{CODE}-{YYYY}-{6 碼}）。唯一性由 access_codes.code unique 保證；
-- issue_access_code() 在 unique_violation 時自動重試。
create or replace function public.generate_access_code(product_code text) returns text
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  c_alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ123456789';  -- 32 字：去除 I、L、O、0
  v_product text := upper(btrim(coalesce(generate_access_code.product_code, '')));
  v_year text := to_char(now() at time zone 'Asia/Taipei', 'YYYY');
  v_bytes bytea;
  v_suffix text;
  v_code text;
  i int;
  attempt int;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;
  if v_product not in (select unnest(enum_range(null::public.commerce_product_code))::text) then
    raise exception 'invalid product code: %', v_product using errcode = '22023';
  end if;
  for attempt in 1..20 loop
    v_bytes := uuid_send(gen_random_uuid());  -- 前 6 bytes 為完全隨機位元
    v_suffix := '';
    for i in 0..5 loop
      v_suffix := v_suffix || substr(c_alphabet, (get_byte(v_bytes, i) & 31) + 1, 1);
    end loop;
    v_code := 'SYT-' || v_product || '-' || v_year || '-' || v_suffix;
    if not exists (select 1 from public.access_codes a where a.code = v_code::citext) then
      return v_code;
    end if;
  end loop;
  raise exception 'unable to generate a unique access code' using errcode = '23505';
end $$;

create or replace function public.issue_access_code(
  p_entitlement_product_id uuid,
  p_source_type text default 'admin_grant',
  p_order_id uuid default null,
  p_order_item_id uuid default null,
  p_customer_subscription_id uuid default null,
  p_issued_to_user_id uuid default null,
  p_issued_to_email text default null,
  p_expires_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.access_codes
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_product public.entitlement_products;
  v_row public.access_codes;
  v_code text;
  v_issued boolean := p_issued_to_user_id is not null or p_issued_to_email is not null;
  attempt int;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;
  select * into v_product from public.entitlement_products where id = p_entitlement_product_id;
  if not found or not v_product.is_active then
    raise exception 'entitlement product not found or inactive' using errcode = 'P0002';
  end if;

  perform set_config('syt.access_code_generator', 'on', true);
  for attempt in 1..5 loop
    v_code := public.generate_access_code(v_product.product_code::text);
    begin
      insert into public.access_codes(
        code, product_code, code_year, entitlement_product_id, status, source_type,
        order_id, order_item_id, customer_subscription_id,
        issued_to_user_id, issued_to_email, issued_at, expires_at, metadata, created_by
      ) values (
        v_code, v_product.product_code, split_part(v_code, '-', 3)::smallint, v_product.id,
        case when v_issued then 'issued' else 'generated' end::public.access_code_status,
        p_source_type, p_order_id, p_order_item_id, p_customer_subscription_id,
        p_issued_to_user_id, p_issued_to_email, case when v_issued then now() end,
        coalesce(p_expires_at, case when v_product.code_valid_days is not null then now() + make_interval(days => v_product.code_valid_days) end),
        coalesce(p_metadata, '{}'::jsonb), auth.uid()
      ) returning * into v_row;
      perform set_config('syt.access_code_generator', 'off', true);
      perform public.write_audit_log('access_code.issue', 'access_codes', v_row.id, null,
        jsonb_build_object('product_code', v_row.product_code, 'status', v_row.status, 'order_id', p_order_id), null, null);
      return v_row;
    exception when unique_violation then
      -- 併發下產生相同代碼：重試
      null;
    end;
  end loop;
  perform set_config('syt.access_code_generator', 'off', true);
  raise exception 'unable to issue a unique access code' using errcode = '23505';
end $$;

-- 內部兌換邏輯（不對外 grant）
create or replace function public._redeem_access_code_internal(p_code text, p_user_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_norm text := public.normalize_access_code(p_code);
  v_hash text := encode(sha256(convert_to(public.normalize_access_code(p_code), 'UTF8')), 'hex');
  v_code public.access_codes;
  v_product public.entitlement_products;
  v_ent public.user_entitlements;
  v_expires timestamptz;
  v_days int;
  v_result text;
  v_failures int;
  v_rule record;
begin
  if p_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  -- 暴力猜測防護：15 分鐘內失敗 10 次即暫停
  select count(*) into v_failures from public.access_code_redemptions
  where user_id = p_user_id and result <> 'success' and created_at > now() - interval '15 minutes';
  if v_failures >= 10 then
    v_result := 'rate_limited';
  elsif v_norm !~ '^SYT-(SEO|LP|ECOM|DM|AI|CUSTOM)-[0-9]{4}-[A-HJKMNP-Z1-9]{6}$' then
    v_result := 'invalid_format';
  else
    -- 鎖定代碼列：併發兌換時第二個交易會等待並讀到 redeemed 狀態
    select * into v_code from public.access_codes where code = v_norm::citext for update;
    if not found then
      v_result := 'not_found';
    elsif v_code.status = 'redeemed' then
      v_result := 'already_redeemed';
    elsif v_code.status = 'revoked' then
      v_result := 'revoked';
    elsif v_code.status = 'expired' or (v_code.expires_at is not null and v_code.expires_at <= now()) then
      v_result := 'expired';
      if v_code.status <> 'expired' then
        update public.access_codes set status = 'expired' where id = v_code.id;
      end if;
    elsif v_code.starts_at is not null and v_code.starts_at > now() then
      v_result := 'not_started';
    else
      select * into v_product from public.entitlement_products where id = v_code.entitlement_product_id;
      if not v_product.is_active then
        v_result := 'inactive_product';
      end if;
    end if;
  end if;

  if v_result is not null then
    insert into public.access_code_redemptions(access_code_id, user_id, attempted_code_sha256, result, ip_hash, user_agent)
    values (v_code.id, p_user_id, v_hash, v_result, public.request_ip_hash(), public.request_user_agent());
    return jsonb_build_object('ok', false, 'result', v_result);
  end if;

  -- 權限到期日
  if v_code.customer_subscription_id is not null then
    select current_period_end into v_expires from public.customer_subscriptions
    where id = v_code.customer_subscription_id and status in ('active','trialing','past_due','cancel_scheduled');
    if not found then
      insert into public.access_code_redemptions(access_code_id, user_id, attempted_code_sha256, result, ip_hash, user_agent)
      values (v_code.id, p_user_id, v_hash, 'expired', public.request_ip_hash(), public.request_user_agent());
      return jsonb_build_object('ok', false, 'result', 'expired');
    end if;
  else
    v_days := coalesce(v_code.entitlement_duration_days, v_product.default_duration_days);
    v_expires := case when v_days is null then null else now() + make_interval(days => v_days) end;
  end if;

  insert into public.user_entitlements(user_id, entitlement_product_id, source_type, access_code_id, order_id, customer_subscription_id, status, starts_at, expires_at)
  values (p_user_id, v_product.id, 'access_code', v_code.id, v_code.order_id, v_code.customer_subscription_id, 'active', now(), v_expires)
  returning * into v_ent;

  -- 依權限規則建立額度
  for v_rule in
    select f.feature_key, r.quota_amount, r.quota_period
    from public.entitlement_feature_rules r
    join public.entitlement_features f on f.id = r.feature_id
    where r.entitlement_product_id = v_product.id and r.is_enabled and r.quota_amount is not null
  loop
    insert into public.entitlement_usage_quotas(user_entitlement_id, usage_key, quota_limit, reset_period, period_start, period_end)
    values (v_ent.id, v_rule.feature_key, v_rule.quota_amount, v_rule.quota_period, v_ent.starts_at,
            case v_rule.quota_period when 'month' then v_ent.starts_at + interval '1 month'
                                     when 'year' then v_ent.starts_at + interval '1 year' end);
  end loop;

  update public.access_codes
  set status = 'redeemed', redeemed_by_user_id = p_user_id, redeemed_at = now(),
      issued_to_user_id = coalesce(issued_to_user_id, p_user_id), issued_at = coalesce(issued_at, now())
  where id = v_code.id;

  insert into public.access_code_redemptions(access_code_id, user_id, attempted_code_sha256, result, user_entitlement_id, ip_hash, user_agent)
  values (v_code.id, p_user_id, v_hash, 'success', v_ent.id, public.request_ip_hash(), public.request_user_agent());

  perform public.write_audit_log('access_code.redeem', 'access_codes', v_code.id, null,
    jsonb_build_object('user_entitlement_id', v_ent.id, 'product_code', v_code.product_code), null, 'customer');

  return jsonb_build_object(
    'ok', true, 'result', 'success',
    'access_code_id', v_code.id, 'product_code', v_code.product_code,
    'user_entitlement_id', v_ent.id, 'entitlement_product_id', v_product.id,
    'entitlement_key', v_product.entitlement_key, 'expires_at', v_ent.expires_at
  );
end $$;

create or replace function public.redeem_access_code(code text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
begin
  return public._redeem_access_code_internal(redeem_access_code.code, auth.uid());
end $$;

-- 未兌換前轉讓：受讓人需已註冊（以 email 查找）；兌換後不可轉讓
create or replace function public.transfer_access_code(code text, recipient_email text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_code public.access_codes;
  v_product public.entitlement_products;
  v_recipient uuid;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into v_code from public.access_codes a where a.code = public.normalize_access_code(transfer_access_code.code)::citext for update;
  if not found or (v_code.issued_to_user_id is distinct from v_uid and not public.is_admin()) then
    raise exception 'access code not found' using errcode = 'P0002';  -- 不區分「不存在」與「不是你的」
  end if;
  if v_code.status not in ('generated','issued') then
    raise exception 'access code cannot be transferred in status %', v_code.status using errcode = '22023';
  end if;
  if v_code.expires_at is not null and v_code.expires_at <= now() then
    raise exception 'access code expired' using errcode = '22023';
  end if;
  select * into v_product from public.entitlement_products where id = v_code.entitlement_product_id;
  if not v_product.is_transferable_before_redeem then
    raise exception 'this access code is not transferable' using errcode = '22023';
  end if;
  select u.id into v_recipient from auth.users u where lower(u.email) = lower(btrim(recipient_email)) limit 1;
  if v_recipient is null then
    raise exception 'recipient must register an account first' using errcode = 'P0002';
  end if;
  if v_recipient = v_code.issued_to_user_id then
    raise exception 'recipient already holds this access code' using errcode = '22023';
  end if;

  update public.access_codes
  set issued_to_user_id = v_recipient, issued_to_email = lower(btrim(recipient_email)), status = 'issued',
      issued_at = coalesce(issued_at, now()), transfer_count = transfer_count + 1, last_transferred_at = now()
  where id = v_code.id;
  insert into public.access_code_transfers(access_code_id, from_user_id, to_user_id, to_email)
  values (v_code.id, v_code.issued_to_user_id, v_recipient, lower(btrim(recipient_email)));
  perform public.write_audit_log('access_code.transfer', 'access_codes', v_code.id,
    jsonb_build_object('from_user_id', v_code.issued_to_user_id), jsonb_build_object('to_user_id', v_recipient), null, null);
  return jsonb_build_object('ok', true, 'access_code_id', v_code.id, 'transfer_count', v_code.transfer_count + 1);
end $$;

create or replace function public.revoke_access_code(code text, reason text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_code public.access_codes;
begin
  if not (public.is_admin() or public.is_service_role()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;
  select * into v_code from public.access_codes a where a.code = public.normalize_access_code(revoke_access_code.code)::citext for update;
  if not found then
    raise exception 'access code not found' using errcode = 'P0002';
  end if;
  if v_code.status = 'revoked' then
    return jsonb_build_object('ok', true, 'already_revoked', true);
  end if;
  update public.access_codes set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), revoke_reason = reason where id = v_code.id;
  update public.user_entitlements set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), revoke_reason = coalesce(reason, 'access code revoked')
  where access_code_id = v_code.id and status <> 'revoked';
  perform public.write_audit_log('access_code.revoke', 'access_codes', v_code.id,
    jsonb_build_object('status', v_code.status), jsonb_build_object('status', 'revoked', 'reason', reason), null, null);
  return jsonb_build_object('ok', true, 'access_code_id', v_code.id, 'previous_status', v_code.status);
end $$;

-- =====================================================================
-- G. Quota
-- =====================================================================
create or replace function public.consume_usage_quota(entitlement_id uuid, usage_key text, amount integer, idempotency_key text default null)
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
#variable_conflict use_variable
declare
  v_ent public.user_entitlements;
  v_quota public.entitlement_usage_quotas;
  v_latest public.entitlement_usage_quotas;
  v_start timestamptz;
  v_end timestamptz;
  v_step interval;
  v_event_id uuid;
begin
  if amount is null or amount <= 0 then
    raise exception 'amount must be a positive integer' using errcode = '22023';
  end if;

  select * into v_ent from public.user_entitlements ue where ue.id = entitlement_id for update;
  if not found then
    raise exception 'entitlement not found' using errcode = 'P0002';
  end if;
  if not (public.is_service_role() or public.is_admin() or v_ent.user_id = auth.uid()
          or (v_ent.workspace_id is not null and public.has_workspace_role(v_ent.workspace_id, array['owner','admin','editor']))) then
    raise exception 'not allowed to use this entitlement' using errcode = '42501';
  end if;
  if v_ent.status <> 'active' or v_ent.starts_at > now() or (v_ent.expires_at is not null and v_ent.expires_at <= now()) then
    raise exception 'entitlement is not active' using errcode = 'P0001';
  end if;

  -- 冪等：同一 idempotency_key 重送不重複扣除
  if idempotency_key is not null then
    select e.id into v_event_id from public.entitlement_usage_events e where e.idempotency_key = idempotency_key;
    if found then
      select q.* into v_quota from public.entitlement_usage_events e join public.entitlement_usage_quotas q on q.id = e.quota_id where e.id = v_event_id;
      return jsonb_build_object('ok', true, 'replayed', true, 'usage_event_id', v_event_id, 'quota_id', v_quota.id,
        'quota_limit', v_quota.quota_limit, 'quota_used', v_quota.quota_used,
        'remaining', case when v_quota.quota_limit is null then null else v_quota.quota_limit - v_quota.quota_used end);
    end if;
  end if;

  select q.* into v_quota from public.entitlement_usage_quotas q
  where q.user_entitlement_id = entitlement_id and q.usage_key = usage_key::citext
    and q.period_start <= now() and (q.period_end is null or q.period_end > now())
  order by q.period_start desc limit 1
  for update;

  if not found then
    -- 月 / 年額度自動滾動到目前週期
    select q.* into v_latest from public.entitlement_usage_quotas q
    where q.user_entitlement_id = entitlement_id and q.usage_key = usage_key::citext
    order by q.period_start desc limit 1
    for update;
    if not found or v_latest.reset_period = 'lifetime' then
      raise exception 'no quota available for %', usage_key using errcode = 'P0002';
    end if;
    v_step := case v_latest.reset_period when 'month' then interval '1 month' else interval '1 year' end;
    v_start := v_latest.period_end;
    v_end := v_start + v_step;
    while v_end <= now() loop
      v_start := v_end;
      v_end := v_start + v_step;
    end loop;
    -- entitlement 列已鎖定，不會有併發建立同一週期
    if not exists (
      select 1 from public.entitlement_usage_quotas q
      where q.user_entitlement_id = entitlement_id and q.usage_key = v_latest.usage_key and q.period_start = v_start
    ) then
      insert into public.entitlement_usage_quotas(user_entitlement_id, usage_key, quota_limit, quota_used, reset_period, period_start, period_end)
      values (entitlement_id, v_latest.usage_key, v_latest.quota_limit, 0, v_latest.reset_period, v_start, v_end);
    end if;
    select q.* into v_quota from public.entitlement_usage_quotas q
    where q.user_entitlement_id = entitlement_id and q.usage_key = usage_key::citext and q.period_start = v_start
    for update;
  end if;

  if v_quota.quota_limit is not null and v_quota.quota_used + amount > v_quota.quota_limit then
    raise exception 'quota exceeded for % (used %, limit %, requested %)', usage_key, v_quota.quota_used, v_quota.quota_limit, amount
      using errcode = 'P0001', hint = 'upgrade plan or purchase additional quota';
  end if;

  update public.entitlement_usage_quotas q set quota_used = q.quota_used + amount
  where q.id = v_quota.id returning * into v_quota;

  insert into public.entitlement_usage_events(user_entitlement_id, quota_id, usage_key, amount, actor_user_id, workspace_id, idempotency_key, quota_used_after)
  values (entitlement_id, v_quota.id, v_quota.usage_key, amount, auth.uid(), v_ent.workspace_id, idempotency_key, v_quota.quota_used)
  returning id into v_event_id;

  return jsonb_build_object('ok', true, 'replayed', false, 'usage_event_id', v_event_id, 'quota_id', v_quota.id,
    'quota_limit', v_quota.quota_limit, 'quota_used', v_quota.quota_used,
    'remaining', case when v_quota.quota_limit is null then null else v_quota.quota_limit - v_quota.quota_used end);
end $$;

-- =====================================================================
-- H. Workspace functions
-- =====================================================================
create or replace function public.create_workspace_from_access_code(code text, workspace_name text default null) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_code public.access_codes;
  v_redeem jsonb;
  v_ent public.user_entitlements;
  v_ws_id uuid := gen_random_uuid();
  v_name text;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  select * into v_code from public.access_codes a where a.code = public.normalize_access_code(create_workspace_from_access_code.code)::citext for update;

  if found and v_code.status = 'redeemed' and v_code.redeemed_by_user_id = v_uid then
    -- 已兌換：冪等回傳或補建 workspace
    if v_code.redeemed_workspace_id is not null then
      return jsonb_build_object('ok', true, 'result', 'already_exists', 'workspace_id', v_code.redeemed_workspace_id, 'access_code_id', v_code.id);
    end if;
    select * into v_ent from public.user_entitlements where access_code_id = v_code.id;
  else
    v_redeem := public._redeem_access_code_internal(create_workspace_from_access_code.code, v_uid);
    if not coalesce((v_redeem ->> 'ok')::boolean, false) then
      return v_redeem || jsonb_build_object('workspace_id', null);
    end if;
    select * into v_ent from public.user_entitlements where id = (v_redeem ->> 'user_entitlement_id')::uuid;
    select * into v_code from public.access_codes where id = v_ent.access_code_id;
  end if;

  v_name := coalesce(nullif(btrim(workspace_name), ''),
                     (select nullif(btrim(display_name), '') || ' 的工作區' from public.customer_profiles where user_id = v_uid),
                     '我的工作區');

  insert into public.customer_workspaces(id, slug, name, owner_user_id, source_access_code_id, source_entitlement_id, created_by, updated_by)
  values (v_ws_id, 'ws-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12), left(v_name, 120), v_uid, v_code.id, v_ent.id, v_uid, v_uid);
  insert into public.customer_workspace_members(workspace_id, user_id, role, status) values (v_ws_id, v_uid, 'owner', 'active');
  insert into public.customer_workspace_settings(workspace_id, brand_name) values (v_ws_id, left(v_name, 120));

  update public.user_entitlements set workspace_id = v_ws_id where id = v_ent.id;
  update public.access_codes set redeemed_workspace_id = v_ws_id where id = v_code.id;
  update public.access_code_redemptions set workspace_id = v_ws_id where access_code_id = v_code.id and result = 'success';
  if v_ent.customer_subscription_id is not null then
    update public.customer_subscriptions set workspace_id = coalesce(workspace_id, v_ws_id) where id = v_ent.customer_subscription_id;
  end if;

  perform public.write_audit_log('workspace.create_from_access_code', 'customer_workspaces', v_ws_id, null,
    jsonb_build_object('access_code_id', v_code.id, 'user_entitlement_id', v_ent.id), v_ws_id, 'customer');

  return jsonb_build_object('ok', true, 'result', 'created', 'workspace_id', v_ws_id,
    'user_entitlement_id', v_ent.id, 'access_code_id', v_code.id, 'product_code', v_code.product_code);
end $$;

-- 邀請成員：回傳一次性明文 token（只存 sha256）
create or replace function public.create_workspace_invitation(workspace_id uuid, email text, role public.workspace_member_role default 'editor')
returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_id uuid;
begin
  if not (public.is_admin() or public.has_workspace_role(create_workspace_invitation.workspace_id, array['owner','admin'])) then
    raise exception 'workspace owner or admin required' using errcode = '42501';
  end if;
  if create_workspace_invitation.role = 'owner' then
    raise exception 'owner role cannot be granted by invitation' using errcode = '22023';
  end if;
  update public.customer_workspace_invitations i set status = 'revoked', revoked_at = now()
  where i.workspace_id = create_workspace_invitation.workspace_id and i.email = lower(btrim(create_workspace_invitation.email))::citext and i.status = 'pending';
  insert into public.customer_workspace_invitations(workspace_id, email, role, token_sha256, invited_by)
  values (create_workspace_invitation.workspace_id, lower(btrim(create_workspace_invitation.email)), create_workspace_invitation.role,
          encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), auth.uid())
  returning id into v_id;
  perform public.write_audit_log('workspace.invite', 'customer_workspace_invitations', v_id, null,
    jsonb_build_object('email', lower(btrim(create_workspace_invitation.email)), 'role', create_workspace_invitation.role), create_workspace_invitation.workspace_id, null);
  return jsonb_build_object('ok', true, 'invitation_id', v_id, 'token', v_token);
end $$;

create or replace function public.accept_workspace_invitation(token text) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_inv public.customer_workspace_invitations;
  v_limit int;
  v_count int;
begin
  if v_uid is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select * into v_inv from public.customer_workspace_invitations i
  where i.token_sha256 = encode(sha256(convert_to(coalesce(accept_workspace_invitation.token, ''), 'UTF8')), 'hex')
  for update;
  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation is invalid or expired' using errcode = 'P0002';
  end if;
  select email into v_email from auth.users where id = v_uid;
  if lower(coalesce(v_email, '')) <> lower(v_inv.email::text) then
    raise exception 'invitation email does not match the signed-in account' using errcode = '42501';
  end if;

  -- 成員上限（entitlement_feature_rules.limit_value of workspace.members；無設定 = 不限）
  perform 1 from public.customer_workspaces where id = v_inv.workspace_id for update;
  select max(r.limit_value) into v_limit
  from public.user_entitlements ue
  join public.entitlement_feature_rules r on r.entitlement_product_id = ue.entitlement_product_id and r.is_enabled
  join public.entitlement_features f on f.id = r.feature_id and f.feature_key = 'workspace.members'
  where ue.workspace_id = v_inv.workspace_id and ue.status = 'active' and (ue.expires_at is null or ue.expires_at > now());
  select count(*) into v_count from public.customer_workspace_members where workspace_id = v_inv.workspace_id and status = 'active';
  if v_limit is not null and v_count >= v_limit then
    raise exception 'workspace member limit reached (%)', v_limit using errcode = 'P0001';
  end if;

  insert into public.customer_workspace_members(workspace_id, user_id, role, status, invited_by)
  values (v_inv.workspace_id, v_uid, v_inv.role, 'active', v_inv.invited_by)
  on conflict (workspace_id, user_id) do update set status = 'active';
  update public.customer_workspace_invitations set status = 'accepted', accepted_by = v_uid, accepted_at = now() where id = v_inv.id;
  perform public.write_audit_log('workspace.invitation_accept', 'customer_workspace_invitations', v_inv.id, null,
    jsonb_build_object('user_id', v_uid, 'role', v_inv.role), v_inv.workspace_id, 'customer');
  return jsonb_build_object('ok', true, 'workspace_id', v_inv.workspace_id, 'role', v_inv.role);
end $$;

-- =====================================================================
-- I. Site project / Template functions
-- =====================================================================

-- 回傳可用於建立網站的權限 id（有 site.create 剩餘額度）；無則 null
create or replace function public._site_create_entitlement(p_workspace_id uuid) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select ue.id
  from public.user_entitlements ue
  join public.entitlement_usage_quotas q on q.user_entitlement_id = ue.id and q.usage_key = 'site.create'
  where ue.workspace_id = p_workspace_id
    and ue.status = 'active' and ue.starts_at <= now() and (ue.expires_at is null or ue.expires_at > now())
    and q.period_start <= now() and (q.period_end is null or q.period_end > now())
    and (q.quota_limit is null or q.quota_used < q.quota_limit)
  order by ue.created_at
  limit 1
$$;

create or replace function public.can_create_site_project(workspace_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_ws public.customer_workspaces; v_count int;
begin
  if not (public.is_admin() or public.is_service_role() or public.is_workspace_member(can_create_site_project.workspace_id)) then
    return false;
  end if;
  select * into v_ws from public.customer_workspaces w where w.id = can_create_site_project.workspace_id;
  if not found or v_ws.status <> 'active' then
    return false;
  end if;
  if v_ws.site_project_limit_override is not null then
    select count(*) into v_count from public.customer_site_projects p where p.workspace_id = v_ws.id and p.status <> 'archived';
    return v_count < v_ws.site_project_limit_override;
  end if;
  return public._site_create_entitlement(v_ws.id) is not null;
end $$;

create or replace function public.can_workspace_use_template(workspace_id uuid, template_id uuid, site_project_id uuid default null) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_t public.site_templates;
begin
  if not (public.is_admin() or public.is_service_role() or public.is_workspace_member(can_workspace_use_template.workspace_id)) then
    return false;
  end if;
  select * into v_t from public.site_templates t where t.id = can_workspace_use_template.template_id;
  if not found then
    return false;
  end if;
  if v_t.pricing_type = 'private' then
    return v_t.owner_workspace_id = can_workspace_use_template.workspace_id;
  end if;
  if v_t.status <> 'published' and not public.is_admin() then
    return false;
  end if;
  if v_t.pricing_type = 'free' then
    return true;
  end if;
  -- 付費 / 方案限定：有效授權（workspace 或指定網站）
  if exists (
    select 1 from public.site_template_licenses l
    where l.template_id = v_t.id and l.workspace_id = can_workspace_use_template.workspace_id and l.status = 'active'
      and l.starts_at <= now() and (l.expires_at is null or l.expires_at > now())
      and (l.license_scope = 'workspace' or l.site_project_id = can_workspace_use_template.site_project_id)
  ) then
    return true;
  end if;
  if v_t.pricing_type = 'plan_restricted' then
    return exists (
      select 1
      from public.user_entitlements ue
      join public.entitlement_feature_rules r on r.entitlement_product_id = ue.entitlement_product_id and r.is_enabled
      where ue.workspace_id = can_workspace_use_template.workspace_id
        and ue.status = 'active' and ue.starts_at <= now() and (ue.expires_at is null or ue.expires_at > now())
        and r.feature_id = v_t.required_feature_id
    );
  end if;
  return false;
end $$;

create or replace function public.can_use_template(template_id uuid, site_project_id uuid) returns boolean
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_p public.customer_site_projects; v_type public.site_type;
begin
  select * into v_p from public.customer_site_projects p where p.id = can_use_template.site_project_id;
  if not found then
    return false;
  end if;
  select t.site_type into v_type from public.site_templates t where t.id = can_use_template.template_id;
  if v_type is null or v_type <> v_p.site_type then
    return false;
  end if;
  return public.can_workspace_use_template(v_p.workspace_id, can_use_template.template_id, v_p.id);
end $$;

create or replace function public.create_site_project_from_template(workspace_id uuid, template_id uuid, project_name text default null) returns uuid
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_ws public.customer_workspaces;
  v_t public.site_templates;
  v_v public.site_template_versions;
  v_project_id uuid := gen_random_uuid();
  v_ent_id uuid;
  v_count int;
  v_page record;
  v_section record;
  v_field record;
  v_page_id uuid;
  v_section_id uuid;
  v_field_id uuid;
  v_value jsonb;
  v_header_menu uuid;
  v_footer_menu uuid;
  v_contact_page uuid;
  v_form_id uuid;
begin
  if not (public.is_admin() or public.is_service_role() or public.has_workspace_role(create_site_project_from_template.workspace_id, array['owner','admin'])) then
    raise exception 'workspace owner or admin required' using errcode = '42501';
  end if;

  -- 鎖定 workspace：同一 workspace 併發建立網站時序列化，避免超過額度
  select * into v_ws from public.customer_workspaces w where w.id = create_site_project_from_template.workspace_id for update;
  if not found or v_ws.status <> 'active' then
    raise exception 'workspace not found or not active' using errcode = 'P0002';
  end if;

  select * into v_t from public.site_templates t where t.id = create_site_project_from_template.template_id;
  if not found then
    raise exception 'template not found' using errcode = 'P0002';
  end if;
  if not public.can_workspace_use_template(v_ws.id, v_t.id, null) then
    raise exception 'template is not licensed for this workspace (preview only)' using errcode = '42501';
  end if;

  select * into v_v from public.site_template_versions sv
  where sv.template_id = v_t.id and (sv.status = 'published' or (public.is_admin() and sv.id = v_t.latest_version_id))
  order by (sv.id = v_t.latest_version_id) desc, sv.published_at desc nulls last, sv.created_at desc
  limit 1;
  if not found then
    raise exception 'template has no published version' using errcode = 'P0002';
  end if;

  -- 網站類型權限：v1 自助 = seo_website / landing_page；ecommerce / dm_page 需客製權限
  if not (public.is_admin() or public.workspace_has_feature(v_ws.id, 'site.type.' || v_t.site_type::text)) then
    raise exception 'site type % is not included in this workspace plan', v_t.site_type using errcode = '42501';
  end if;

  -- 網站數量：admin 覆寫 or site.create 額度（v1 每次購買 1 個網站）
  if v_ws.site_project_limit_override is not null then
    select count(*) into v_count from public.customer_site_projects p where p.workspace_id = v_ws.id and p.status <> 'archived';
    if v_count >= v_ws.site_project_limit_override then
      raise exception 'site project limit reached (%)', v_ws.site_project_limit_override using errcode = 'P0001';
    end if;
  else
    v_ent_id := public._site_create_entitlement(v_ws.id);
    if v_ent_id is null then
      raise exception 'no site creation quota available' using errcode = 'P0001';
    end if;
  end if;

  insert into public.customer_site_projects(id, workspace_id, name, slug, site_type, template_id, template_version_id, entitlement_id, status, created_by, updated_by)
  values (v_project_id, v_ws.id, left(coalesce(nullif(btrim(project_name), ''), v_t.name), 120),
          'site-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
          v_t.site_type, v_t.id, v_v.id, v_ent_id, 'draft', v_uid, v_uid);

  if v_ent_id is not null then
    perform public.consume_usage_quota(v_ent_id, 'site.create', 1, 'site.create:' || v_project_id::text);
  end if;

  insert into public.customer_site_project_settings(site_project_id, site_name) values (v_project_id, left(coalesce(nullif(btrim(project_name), ''), v_t.name), 120));
  insert into public.customer_site_theme_settings(site_project_id, theme_variant, color_tokens, typography)
  values (v_project_id,
          coalesce(v_v.theme_defaults_json ->> 'theme_variant', 'default'),
          coalesce(v_v.theme_defaults_json -> 'color_tokens', '{}'::jsonb),
          coalesce(v_v.theme_defaults_json -> 'typography', '{}'::jsonb));
  insert into public.customer_site_publish_settings(site_project_id) values (v_project_id);
  insert into public.customer_site_footer_settings(site_project_id, copyright_text) values (v_project_id, '© ' || to_char(now(), 'YYYY') || ' ' || left(coalesce(nullif(btrim(project_name), ''), v_t.name), 100));
  insert into public.customer_site_navigation_menus(site_project_id, menu_key, name) values (v_project_id, 'header', '主選單') returning id into v_header_menu;
  insert into public.customer_site_navigation_menus(site_project_id, menu_key, name) values (v_project_id, 'footer', '頁尾選單') returning id into v_footer_menu;

  for v_page in
    select * from public.site_template_pages tp where tp.template_version_id = v_v.id order by tp.sort_order, tp.page_key
  loop
    insert into public.customer_site_pages(site_project_id, template_page_id, page_key, page_type, title, path, h1,
      seo_title, meta_description, schema_json, sort_order, created_by, updated_by)
    values (v_project_id, v_page.id, v_page.page_key, v_page.page_type, v_page.title, v_page.path,
      v_page.default_seo ->> 'h1', v_page.default_seo ->> 'seo_title', v_page.default_seo ->> 'meta_description',
      coalesce(v_page.default_seo -> 'schema_json', '[]'::jsonb), v_page.sort_order, v_uid, v_uid)
    returning id into v_page_id;

    if v_page.page_type = 'contact' then
      v_contact_page := v_page_id;
    end if;

    if v_page.page_type <> 'legal' then
      insert into public.customer_site_navigation_items(site_project_id, menu_id, label, link_type, page_id, sort_order)
      values (v_project_id, v_header_menu, left(v_page.title, 60), 'page', v_page_id, v_page.sort_order);
    else
      insert into public.customer_site_navigation_items(site_project_id, menu_id, label, link_type, page_id, sort_order)
      values (v_project_id, v_footer_menu, left(v_page.title, 60), 'page', v_page_id, v_page.sort_order);
    end if;

    for v_section in
      select * from public.site_template_sections ts where ts.template_page_id = v_page.id order by ts.sort_order, ts.section_key
    loop
      insert into public.customer_site_sections(site_project_id, page_id, template_section_id, section_key, section_type, title, settings, sort_order, is_enabled)
      values (v_project_id, v_page_id, v_section.id, v_section.section_key, v_section.section_type, v_section.name,
              v_section.default_settings, v_section.sort_order, v_section.is_enabled_by_default)
      returning id into v_section_id;

      for v_field in
        select * from public.site_template_fields tf where tf.template_section_id = v_section.id order by tf.sort_order, tf.field_key
      loop
        insert into public.customer_site_section_fields(site_project_id, section_id, template_field_id, field_key, label, field_type,
          is_required, is_customer_editable, validation_schema, options, default_value, help_text, group_label, sort_order)
        values (v_project_id, v_section_id, v_field.id, v_field.field_key, v_field.label, v_field.field_type,
          v_field.is_required, v_field.is_customer_editable, v_field.validation_schema, v_field.options, v_field.default_value,
          v_field.help_text, v_field.group_label, v_field.sort_order)
        returning id into v_field_id;

        v_value := coalesce(v_v.default_content_json #> array['pages', v_page.page_key, v_section.section_key, v_field.field_key], v_field.default_value);
        if v_value is not null then
          insert into public.customer_site_content_values(site_project_id, section_id, field_id, field_key, content_state, value, updated_by)
          values (v_project_id, v_section_id, v_field_id, v_field.field_key, 'draft', v_value, v_uid);
        end if;
      end loop;
    end loop;
  end loop;

  if v_contact_page is not null then
    insert into public.customer_site_forms(site_project_id, page_id, form_key, name) values (v_project_id, v_contact_page, 'contact', '聯絡表單') returning id into v_form_id;
    insert into public.customer_site_form_fields(site_project_id, form_id, field_key, label, field_type, is_required, max_length, sort_order) values
      (v_project_id, v_form_id, 'name', '姓名', 'text', true, 120, 10),
      (v_project_id, v_form_id, 'email', 'Email', 'email', true, 254, 20),
      (v_project_id, v_form_id, 'phone', '電話', 'tel', false, 40, 30),
      (v_project_id, v_form_id, 'message', '需求說明', 'textarea', true, 5000, 40),
      (v_project_id, v_form_id, 'privacy_consent', '我同意隱私權政策', 'consent', true, 10, 50);
  end if;

  perform public.write_audit_log('site_project.create_from_template', 'customer_site_projects', v_project_id, null,
    jsonb_build_object('template_id', v_t.id, 'template_version_id', v_v.id, 'entitlement_id', v_ent_id), v_ws.id, null);

  return v_project_id;
end $$;

-- 發布：draft 內容 → published 列；頁面 SEO → published_snapshot；建立內容版本；v1 只到 preview
create or replace function public.publish_site_project(site_project_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_p public.customer_site_projects;
  v_ps public.customer_site_publish_settings;
  v_missing int;
  v_version int;
  v_release_id uuid;
  v_new_status public.site_project_status;
  v_snapshot jsonb;
  v_pages int;
begin
  if not public.can_manage_site_project(publish_site_project.site_project_id) then
    raise exception 'workspace owner or admin required' using errcode = '42501';
  end if;
  select * into v_p from public.customer_site_projects p where p.id = publish_site_project.site_project_id for update;
  if v_p.template_id is not null and not public.can_use_template(v_p.template_id, v_p.id) then
    raise exception 'template license is not active; publishing is blocked (preview only)' using errcode = '42501';
  end if;

  select count(*) into v_missing
  from public.customer_site_section_fields f
  join public.customer_site_sections s on s.id = f.section_id and s.is_enabled
  join public.customer_site_pages pg on pg.id = s.page_id and pg.status <> 'archived'
  where f.site_project_id = v_p.id and f.is_required
    and not exists (
      select 1 from public.customer_site_content_values cv
      where cv.field_id = f.id and cv.content_state = 'draft' and (cv.value is not null or cv.asset_id is not null)
    );
  if v_missing > 0 then
    raise exception '% required field(s) are empty', v_missing using errcode = '23502';
  end if;

  delete from public.customer_site_content_values cv where cv.site_project_id = v_p.id and cv.content_state = 'published';
  insert into public.customer_site_content_values(site_project_id, section_id, field_id, field_key, locale, content_state, value, asset_id, version, published_at, updated_by)
  select cv.site_project_id, cv.section_id, cv.field_id, cv.field_key, cv.locale, 'published', cv.value, cv.asset_id, cv.version, now(), v_uid
  from public.customer_site_content_values cv
  where cv.site_project_id = v_p.id and cv.content_state = 'draft';

  update public.customer_site_pages pg
  set status = 'published',
      published_at = coalesce(pg.published_at, now()),
      published_snapshot = jsonb_build_object(
        'title', pg.title, 'path', pg.path, 'h1', pg.h1, 'seo_title', pg.seo_title, 'meta_description', pg.meta_description,
        'canonical_url', pg.canonical_url, 'og_title', pg.og_title, 'og_description', pg.og_description,
        'og_image_asset_id', pg.og_image_asset_id, 'robots', pg.robots, 'schema_json', pg.schema_json,
        'is_indexable', pg.is_indexable, 'published_at', now()),
      updated_by = v_uid
  where pg.site_project_id = v_p.id and pg.status <> 'archived';
  get diagnostics v_pages = row_count;

  select * into v_ps from public.customer_site_publish_settings ps where ps.site_project_id = v_p.id;
  v_new_status := case
    when v_ps.publish_mode <> 'preview_only' and v_ps.is_public and public.platform_feature_enabled('site_builder.public_publish') then 'published'
    else 'preview'
  end::public.site_project_status;
  v_version := v_p.published_version + 1;

  select jsonb_build_object(
    'pages', coalesce(jsonb_agg(jsonb_build_object('page_id', pg.id, 'page_key', pg.page_key, 'snapshot', pg.published_snapshot) order by pg.sort_order), '[]'::jsonb)
  ) into v_snapshot
  from public.customer_site_pages pg where pg.site_project_id = v_p.id and pg.status = 'published';

  update public.customer_site_deployments d set status = 'superseded' where d.site_project_id = v_p.id and d.status = 'published';
  insert into public.customer_site_deployments(site_project_id, version_number, status, content_snapshot, template_version_id, pages_count, published_by)
  values (v_p.id, v_version, 'published', v_snapshot, v_p.template_version_id, v_pages, v_uid)
  returning id into v_release_id;

  update public.customer_site_projects p
  set published_version = v_version, status = v_new_status,
      published_at = case when v_new_status = 'published' then coalesce(p.published_at, now()) else p.published_at end,
      updated_by = v_uid
  where p.id = v_p.id;
  update public.customer_site_publish_settings ps set last_published_at = now(), last_published_by = v_uid where ps.site_project_id = v_p.id;

  -- v1 不實際部署：記錄 dry-run
  insert into public.site_deployments(site_project_id, customer_site_deployment_id, status, trigger_type, is_dry_run, finished_at, triggered_by, metadata)
  values (v_p.id, v_release_id, 'skipped', 'publish', true, now(), v_uid, jsonb_build_object('reason', 'deployment disabled in current platform phase'));

  perform public.write_audit_log('site_project.publish', 'customer_site_projects', v_p.id, null,
    jsonb_build_object('version', v_version, 'status', v_new_status), v_p.workspace_id, null);

  return jsonb_build_object('ok', true, 'site_project_id', v_p.id, 'version', v_version, 'status', v_new_status, 'release_id', v_release_id, 'pages', v_pages);
end $$;

-- 前台表單送出（anon 可呼叫）：驗證欄位、honeypot、同 IP 速率限制
create or replace function public.submit_site_form(
  site_project_id uuid, form_key text, payload jsonb,
  source_path text default null, honeypot text default null,
  utm_source text default null, utm_medium text default null, utm_campaign text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_form public.customer_site_forms;
  v_project public.customer_site_projects;
  v_ps public.customer_site_publish_settings;
  v_field record;
  v_clean jsonb := '{}'::jsonb;
  v_val text;
  v_ip text := public.request_ip_hash();
  v_recent int;
  v_consent timestamptz;
begin
  select * into v_project from public.customer_site_projects p where p.id = submit_site_form.site_project_id;
  select * into v_ps from public.customer_site_publish_settings ps where ps.site_project_id = submit_site_form.site_project_id;
  if not found or not (public.is_site_publicly_visible(v_project.id) or (v_project.status = 'preview' and v_ps.preview_enabled)) then
    raise exception 'form not available' using errcode = 'P0002';
  end if;
  select * into v_form from public.customer_site_forms f
  where f.site_project_id = submit_site_form.site_project_id and f.form_key = submit_site_form.form_key and f.is_active;
  if not found then
    raise exception 'form not available' using errcode = 'P0002';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'payload must be an object' using errcode = '22023';
  end if;

  if v_form.enable_honeypot and coalesce(btrim(honeypot), '') <> '' then
    return jsonb_build_object('ok', true, 'message', v_form.success_message); -- 靜默丟棄
  end if;

  if v_ip is not null then
    select count(*) into v_recent from public.customer_site_form_submissions s
    where s.site_project_id = v_project.id and s.ip_hash = v_ip and s.created_at > now() - interval '10 minutes';
    if v_recent >= 5 then
      raise exception 'too many submissions, please try again later' using errcode = 'P0001';
    end if;
  end if;

  for v_field in select * from public.customer_site_form_fields ff where ff.form_id = v_form.id order by ff.sort_order loop
    v_val := payload ->> v_field.field_key;
    if v_field.is_required and coalesce(btrim(v_val), '') = '' then
      raise exception 'field % is required', v_field.field_key using errcode = '23502';
    end if;
    if v_val is not null then
      if length(v_val) > v_field.max_length then
        raise exception 'field % is too long', v_field.field_key using errcode = '22001';
      end if;
      if v_field.field_type = 'email' and v_val !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
        raise exception 'field % must be a valid email', v_field.field_key using errcode = '22023';
      end if;
      if v_field.field_type = 'consent' then
        if lower(v_val) not in ('true','1','yes','on') then
          if v_field.is_required then
            raise exception 'consent is required' using errcode = '23502';
          end if;
        else
          v_consent := now();
        end if;
      end if;
      v_clean := v_clean || jsonb_build_object(v_field.field_key, v_val);  -- 只保留定義過的欄位
    end if;
  end loop;

  insert into public.customer_site_form_submissions(form_id, site_project_id, workspace_id, payload, source_path,
    utm_source, utm_medium, utm_campaign, consent_at, ip_hash, user_agent)
  values (v_form.id, v_project.id, v_project.workspace_id, v_clean, left(source_path, 500),
    left(utm_source, 100), left(utm_medium, 100), left(utm_campaign, 100), v_consent, v_ip, public.request_user_agent());

  return jsonb_build_object('ok', true, 'message', v_form.success_message, 'redirect_path', v_form.redirect_path);
end $$;

-- =====================================================================
-- J. Domain / DNS
-- =====================================================================
create or replace function public.generate_dns_instruction(domain text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  v_domain text := public.normalize_domain_name(generate_dns_instruction.domain);
  v_cfg jsonb;
  v_target text;
  v_apex_ips jsonb;
  v_suffix text;
  v_txt_prefix text;
  v_ttl int;
  v_placeholder boolean;
  v_labels text[];
  v_n int;
  v_reg_labels int := 2;
  v_apex text;
  v_sub text;
  v_type public.domain_type;
  v_token text;
  v_domain_id uuid;
  v_records jsonb := '[]'::jsonb;
  v_steps jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
  v_recommended text;
  v_ip jsonb;
  v_second_level constant text[] := array[
    'com.tw','org.tw','net.tw','edu.tw','gov.tw','idv.tw','game.tw','ebiz.tw','club.tw',
    'com.hk','org.hk','net.hk','com.cn','net.cn','org.cn','com.sg','com.my','co.jp','ne.jp','or.jp',
    'co.kr','co.uk','org.uk','com.au','net.au','org.au','co.nz','com.mo'];
begin
  if v_domain is null or length(v_domain) > 253 or v_domain !~ '^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$' then
    raise exception 'invalid domain: %', generate_dns_instruction.domain using errcode = '22023';
  end if;

  select setting_value into v_cfg from public.cms_site_settings where setting_key = 'platform.dns';
  v_cfg := coalesce(v_cfg, '{}'::jsonb);
  v_target := v_cfg ->> 'cname_target';
  v_apex_ips := coalesce(v_cfg -> 'apex_a_records', '[]'::jsonb);
  v_suffix := v_cfg ->> 'platform_subdomain_suffix';
  v_txt_prefix := coalesce(v_cfg ->> 'verification_txt_prefix', '_syt-verify');
  v_ttl := coalesce((v_cfg ->> 'default_ttl')::int, 3600);
  v_placeholder := coalesce((v_cfg ->> 'is_placeholder')::boolean, true) or v_target is null;

  v_labels := string_to_array(v_domain, '.');
  v_n := array_length(v_labels, 1);
  if v_n >= 2 and (v_labels[v_n - 1] || '.' || v_labels[v_n]) = any(v_second_level) then
    v_reg_labels := 3;
  end if;
  if v_n < v_reg_labels then
    raise exception 'invalid domain (public suffix only): %', v_domain using errcode = '22023';
  end if;
  v_apex := array_to_string(v_labels[v_n - v_reg_labels + 1 : v_n], '.');

  if v_suffix is not null and v_domain like '%.' || v_suffix and v_domain <> v_suffix then
    v_type := 'platform_subdomain';
    v_sub := left(v_domain, length(v_domain) - length(v_suffix) - 1);
    v_apex := v_suffix;
  elsif v_n = v_reg_labels then
    v_type := 'custom_apex';
    v_sub := null;
  else
    v_type := 'custom_subdomain';
    v_sub := array_to_string(v_labels[1 : v_n - v_reg_labels], '.');
  end if;

  select d.id, d.verification_token into v_domain_id, v_token
  from public.site_project_domains d
  where d.domain = v_domain::citext and d.status <> 'removed'
    and (public.is_admin() or public.is_service_role() or public.is_workspace_member(d.workspace_id))
  limit 1;

  if v_type = 'platform_subdomain' then
    v_recommended := v_domain;
    v_steps := jsonb_build_array('此為森映平台子網域，不需要設定 DNS。', '系統會自動完成 SSL 與部署設定。');
  elsif v_type = 'custom_subdomain' then
    v_recommended := v_domain;
    v_records := jsonb_build_array(
      jsonb_build_object('type','CNAME','host', v_sub,'name', v_domain,'value', coalesce(v_target, '<平台 CNAME 目標尚未設定>'),'ttl', v_ttl,'purpose','routing','required', true),
      jsonb_build_object('type','TXT','host', v_txt_prefix || '.' || v_sub,'name', v_txt_prefix || '.' || v_domain,'value', coalesce(v_token, '<新增網域後產生驗證碼>'),'ttl', v_ttl,'purpose','ownership_verification','required', true)
    );
    v_steps := jsonb_build_array(
      '登入網域註冊商或 DNS 代管服務（例如 Cloudflare、GoDaddy、中華電信 HiNet）的 DNS 管理頁面。',
      format('確認主機名稱「%s」沒有既有的 A、AAAA 或 CNAME 記錄；若有，請先刪除或改名，避免衝突。', v_sub),
      format('新增 CNAME 記錄：主機（Host/Name）填「%s」，值（Target/Value）填「%s」。', v_sub, coalesce(v_target, '<平台 CNAME 目標>')),
      format('新增 TXT 記錄：主機填「%s」，值填「%s」，用於驗證網域所有權。', v_txt_prefix || '.' || v_sub, coalesce(v_token, '<驗證碼>')),
      '儲存後回到森映後台按「檢查 DNS」。DNS 生效通常需要數分鐘，最長可能 48 小時。',
      '驗證通過後，系統會自動申請 SSL 憑證，完成後網站即可使用 HTTPS。'
    );
  else
    v_recommended := 'www.' || v_apex;
    v_records := jsonb_build_array(
      jsonb_build_object('type','CNAME','host','www','name','www.' || v_apex,'value', coalesce(v_target, '<平台 CNAME 目標尚未設定>'),'ttl', v_ttl,'purpose','recommended_www','required', false),
      jsonb_build_object('type','ALIAS','host','@','name', v_apex,'value', coalesce(v_target, '<平台 CNAME 目標尚未設定>'),'ttl', v_ttl,'purpose','apex_alias_or_cname_flattening','required', false,
                         'note','網域商支援 ALIAS / ANAME 或 CNAME Flattening（例如 Cloudflare）時使用；與 A 記錄擇一。'),
      jsonb_build_object('type','TXT','host', v_txt_prefix,'name', v_txt_prefix || '.' || v_apex,'value', coalesce(v_token, '<新增網域後產生驗證碼>'),'ttl', v_ttl,'purpose','ownership_verification','required', true)
    );
    for v_ip in select value from jsonb_array_elements(v_apex_ips) loop
      v_records := v_records || jsonb_build_array(
        jsonb_build_object('type','A','host','@','name', v_apex,'value', v_ip #>> '{}','ttl', v_ttl,'purpose','apex_a_record','required', false,
                           'note','網域商不支援 ALIAS / CNAME Flattening 時使用；與 ALIAS 擇一。'));
    end loop;
    v_steps := jsonb_build_array(
      format('建議優先使用 www 子網域（%s），設定最單純也最穩定；裸網域 %s 再設定轉址到 www。', 'www.' || v_apex, v_apex),
      format('新增 CNAME 記錄：主機填「www」，值填「%s」。', coalesce(v_target, '<平台 CNAME 目標>')),
      '若一定要讓裸網域直接開站：網域商支援 ALIAS / ANAME / CNAME Flattening 時，主機填「@」並指向平台目標；不支援時，改用系統提供的 A 記錄。',
      '若只使用 www：請在網域商設定「網址轉址（URL Forwarding）」，將裸網域 301 轉址到 https://www.' || v_apex || '。',
      format('新增 TXT 記錄：主機填「%s」，值填「%s」，用於驗證網域所有權。', v_txt_prefix, coalesce(v_token, '<驗證碼>')),
      '儲存後回到森映後台按「檢查 DNS」。DNS 生效通常需要數分鐘，最長可能 48 小時；驗證通過後自動申請 SSL。'
    );
    v_warnings := v_warnings || jsonb_build_array('裸網域（@）不可設定一般 CNAME，會與 MX、NS 等記錄衝突並影響 Email。');
    if jsonb_array_length(v_apex_ips) = 0 then
      v_warnings := v_warnings || jsonb_build_array('平台尚未設定裸網域 A 記錄 IP（platform.dns.apex_a_records），請優先使用 www 子網域或 ALIAS。');
    end if;
  end if;

  if v_type <> 'platform_subdomain' then
    v_warnings := v_warnings || jsonb_build_array(
      '請勿刪除既有的 MX 記錄，否則公司 Email 可能無法收信。',
      '使用 Cloudflare 代理（橘色雲朵）時，驗證期間請先切換為「DNS only」，驗證與 SSL 完成後再視需要開啟。'
    );
    if not public.platform_feature_enabled('site_builder.custom_domain') then
      v_warnings := v_warnings || jsonb_build_array('自訂網域為第三版功能：目前僅產生設定指示，尚不會實際綁定網站。');
    end if;
  end if;
  if v_placeholder then
    v_warnings := v_warnings || jsonb_build_array('平台 DNS 目標目前為預設占位值（platform.dns），此指示僅供預覽，請勿實際設定。');
  end if;

  return jsonb_build_object(
    'domain', v_domain, 'domain_type', v_type, 'apex_domain', v_apex, 'subdomain_label', v_sub,
    'recommended_domain', v_recommended, 'domain_id', v_domain_id,
    'verification', jsonb_build_object(
      'record_type', 'TXT',
      'record_name', case when v_type = 'custom_subdomain' then v_txt_prefix || '.' || v_domain
                          when v_type = 'custom_apex' then v_txt_prefix || '.' || v_apex end,
      'value', v_token),
    'records', v_records, 'steps', v_steps, 'warnings', v_warnings,
    'is_placeholder_target', v_placeholder, 'generated_at', now()
  );
end $$;

create or replace function public.add_site_project_domain(site_project_id uuid, domain text, make_primary boolean default false) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_p public.customer_site_projects;
  v_domain text := public.normalize_domain_name(add_site_project_domain.domain);
  v_preview jsonb;
  v_instr jsonb;
  v_type public.domain_type;
  v_id uuid;
  v_token text := 'syt-verify=' || replace(gen_random_uuid()::text, '-', '');
begin
  if not public.can_manage_site_project(add_site_project_domain.site_project_id) then
    raise exception 'workspace owner or admin required' using errcode = '42501';
  end if;
  select * into v_p from public.customer_site_projects p where p.id = add_site_project_domain.site_project_id for update;

  v_preview := public.generate_dns_instruction(v_domain);
  v_type := (v_preview ->> 'domain_type')::public.domain_type;
  if not public.is_admin() then
    if v_type = 'platform_subdomain' and not public.platform_feature_enabled('site_builder.platform_subdomain') then
      raise exception 'platform subdomain is available from v2' using errcode = '42501';
    end if;
    if v_type <> 'platform_subdomain' and not public.platform_feature_enabled('site_builder.custom_domain') then
      raise exception 'custom domain is available from v3' using errcode = '42501';
    end if;
  end if;
  if exists (select 1 from public.site_project_domains d where d.domain = v_domain::citext and d.status <> 'removed') then
    raise exception 'domain is already connected to a site' using errcode = '23505';
  end if;

  if make_primary then
    update public.site_project_domains d set is_primary = false where d.site_project_id = v_p.id and d.is_primary;
  end if;

  insert into public.site_project_domains(site_project_id, workspace_id, domain, domain_type, apex_domain, subdomain_label,
    status, is_primary, verification_token, verified_at, created_by, updated_by)
  values (v_p.id, v_p.workspace_id, v_domain, v_type, v_preview ->> 'apex_domain', v_preview ->> 'subdomain_label',
    case when v_type = 'platform_subdomain' then 'verified' else 'pending' end::public.domain_status,
    make_primary, v_token, case when v_type = 'platform_subdomain' then now() end, auth.uid(), auth.uid())
  returning id into v_id;

  v_instr := public.generate_dns_instruction(v_domain);

  update public.site_dns_instructions i set is_current = false where i.domain_id = v_id and i.is_current;
  insert into public.site_dns_instructions(domain_id, site_project_id, domain, domain_type, recommended_domain, records, steps, warnings, generated_by)
  values (v_id, v_p.id, v_domain, v_type, v_instr ->> 'recommended_domain', v_instr -> 'records', v_instr -> 'steps', v_instr -> 'warnings', auth.uid());

  if v_type <> 'platform_subdomain' then
    insert into public.site_domain_verifications(domain_id, method, record_type, record_name, expected_value)
    values (v_id, 'dns_txt', 'TXT', v_instr #>> '{verification,record_name}', v_token);
  end if;
  insert into public.site_ssl_certificates(domain_id, status) values (v_id, case when v_type = 'platform_subdomain' then 'pending' else 'not_requested' end::public.ssl_status);

  perform public.write_audit_log('site_domain.add', 'site_project_domains', v_id, null,
    jsonb_build_object('domain', v_domain, 'domain_type', v_type), v_p.workspace_id, null);
  return jsonb_build_object('ok', true, 'domain_id', v_id) || jsonb_build_object('instruction', v_instr);
end $$;

-- =====================================================================
-- K. Commerce / Payment / Subscription
-- =====================================================================
create or replace function public.get_enabled_payment_methods() returns table(
  method_key text, provider public.payment_provider, method_type public.payment_method_type, display_name text, description text,
  supports_one_time boolean, supports_recurring boolean, supported_intervals public.billing_interval[],
  min_amount_cents bigint, max_amount_cents bigint, public_settings jsonb, sort_order int
)
language sql stable security definer set search_path = public, pg_temp as $$
  select m.method_key::text, m.provider, m.method_type, m.display_name, m.description,
         m.supports_one_time, m.supports_recurring, m.supported_intervals,
         m.min_amount_cents, m.max_amount_cents, m.public_settings, m.sort_order
  from public.commerce_payment_methods m
  where m.is_enabled
    and (
      (m.provider = 'bank_transfer' and exists (select 1 from public.commerce_bank_transfer_accounts b where b.is_enabled))
      or (m.provider in ('ecpay','linepay') and exists (
            select 1 from public.commerce_payment_provider_configs c
            where c.provider = m.provider and c.is_enabled and (m.provider_config_id is null or c.id = m.provider_config_id)))
    )
  order by m.sort_order, m.method_key
$$;

create or replace function public.get_bank_transfer_instructions(order_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare v_order public.commerce_orders;
begin
  select * into v_order from public.commerce_orders o where o.id = get_bank_transfer_instructions.order_id;
  if not found or not (v_order.customer_user_id = auth.uid() or public.is_admin() or public.is_service_role()) then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_order.status not in ('pending','awaiting_payment') then
    raise exception 'order is not awaiting payment' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'order_number', v_order.order_number, 'amount_twd', v_order.total_cents / 100, 'currency', v_order.currency,
    'accounts', coalesce((
      select jsonb_agg(jsonb_build_object('bank_code', b.bank_code, 'bank_name', b.bank_name, 'branch_name', b.branch_name,
               'account_name', b.account_name, 'account_number', b.account_number, 'deadline_at', v_order.created_at + make_interval(hours => b.transfer_deadline_hours),
               'instructions', b.instructions) order by b.sort_order)
      from public.commerce_bank_transfer_accounts b where b.is_enabled), '[]'::jsonb)
  );
end $$;

create or replace function public.mark_payment_success_and_issue_entitlement(
  order_id uuid, payment_id uuid default null, provider_trade_no text default null, note text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_order public.commerce_orders;
  v_payment public.commerce_payments;
  v_item record;
  v_plan_price public.subscription_plan_prices;
  v_plan public.subscription_plans;
  v_sub_id uuid;
  v_period_id uuid;
  v_ent_product uuid;
  v_code public.access_codes;
  v_purchase_id uuid;
  v_license_id uuid;
  v_codes jsonb := '[]'::jsonb;
  v_subs jsonb := '[]'::jsonb;
  v_licenses jsonb := '[]'::jsonb;
  v_step interval;
  i int;
begin
  if not (public.is_service_role() or public.is_admin()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;

  -- 鎖定訂單：webhook 重送 / 後台重複按鈕只會處理一次
  select * into v_order from public.commerce_orders o where o.id = mark_payment_success_and_issue_entitlement.order_id for update;
  if not found then
    raise exception 'order not found' using errcode = 'P0002';
  end if;
  if v_order.entitlements_issued_at is not null then
    return jsonb_build_object('ok', true, 'already_processed', true, 'order_id', v_order.id, 'order_number', v_order.order_number,
      'access_codes', coalesce((select jsonb_agg(jsonb_build_object('code', a.code, 'product_code', a.product_code, 'status', a.status) order by a.created_at)
                                from public.access_codes a where a.order_id = v_order.id), '[]'::jsonb));
  end if;
  if v_order.status not in ('pending','awaiting_payment','failed','paid') then
    raise exception 'order cannot be marked as paid in status %', v_order.status using errcode = '22023';
  end if;

  -- 付款列
  if mark_payment_success_and_issue_entitlement.payment_id is not null then
    select * into v_payment from public.commerce_payments p where p.id = mark_payment_success_and_issue_entitlement.payment_id and p.order_id = v_order.id for update;
    if not found then
      raise exception 'payment does not belong to order' using errcode = 'P0002';
    end if;
  else
    select * into v_payment from public.commerce_payments p where p.order_id = v_order.id order by p.created_at desc limit 1 for update;
  end if;
  if v_payment.id is null then
    insert into public.commerce_payments(order_id, provider, method_type, environment, status, amount_cents, currency, is_manual_mark, created_by)
    values (v_order.id, 'manual', 'manual',
            case when public.platform_feature_enabled('commerce.live_payments') then 'production' else 'sandbox' end::public.provider_environment,
            'pending', v_order.total_cents, v_order.currency, true, v_uid)
    returning * into v_payment;
  end if;

  update public.commerce_payments p
  set status = 'succeeded', paid_at = coalesce(p.paid_at, now()),
      provider_trade_no = coalesce(mark_payment_success_and_issue_entitlement.provider_trade_no, p.provider_trade_no),
      is_manual_mark = p.is_manual_mark or not public.is_service_role(),
      reviewed_by = case when public.is_service_role() then p.reviewed_by else v_uid end,
      reviewed_at = case when public.is_service_role() then p.reviewed_at else now() end
  where p.id = v_payment.id
  returning * into v_payment;

  insert into public.commerce_payment_transactions(payment_id, transaction_type, status, amount_cents, provider_transaction_id, actor_id, response_payload)
  values (v_payment.id, case when public.is_service_role() then 'charge' else 'manual_mark' end, 'succeeded', v_payment.amount_cents,
          v_payment.provider_trade_no, v_uid, jsonb_build_object('note', note));

  if v_order.status <> 'paid' then
    update public.commerce_orders o set status = 'paid', paid_at = now(), updated_by = v_uid where o.id = v_order.id;
  end if;

  update public.commerce_coupon_redemptions cr set status = 'applied' where cr.order_id = v_order.id and cr.status = 'reserved';
  update public.commerce_coupons c set redeemed_count = c.redeemed_count + 1
  where c.id = v_order.coupon_id and exists (select 1 from public.commerce_coupon_redemptions cr where cr.order_id = v_order.id and cr.coupon_id = c.id);

  for v_item in
    select oi.*, cp.entitlement_product_id as product_entitlement_id
    from public.commerce_order_items oi
    join public.commerce_products cp on cp.id = oi.product_id
    where oi.order_id = v_order.id
    order by oi.created_at, oi.id
  loop
    v_sub_id := null;
    v_plan := null;

    -- 訂閱（月繳 / 年繳）
    if v_item.billing_interval in ('month','year') then
      select * into v_plan_price from public.subscription_plan_prices spp
      where spp.id = v_item.subscription_plan_price_id or (v_item.subscription_plan_price_id is null and spp.commerce_product_price_id = v_item.product_price_id)
      limit 1;
      if not found then
        raise exception 'order item % is recurring but has no subscription plan price', v_item.id using errcode = 'P0002';
      end if;
      if v_order.customer_user_id is null then
        raise exception 'subscription orders require a registered customer' using errcode = '22023';
      end if;
      select * into v_plan from public.subscription_plans where id = v_plan_price.plan_id;
      v_step := case v_item.billing_interval when 'month' then make_interval(months => v_item.interval_count) else make_interval(years => v_item.interval_count) end;

      insert into public.customer_subscriptions(customer_user_id, workspace_id, plan_id, plan_price_id, initial_order_id, status,
        billing_interval, interval_count, current_period_start, current_period_end, auto_renew, renewal_status, next_billing_at, provider)
      values (v_order.customer_user_id, v_order.workspace_id, v_plan.id, v_plan_price.id, v_order.id, 'active',
        v_item.billing_interval, v_item.interval_count, now(), now() + v_step, v_plan_price.auto_renew_default,
        case when v_plan_price.auto_renew_default then 'auto' else 'manual' end, case when v_plan_price.auto_renew_default then now() + v_step end,
        v_payment.provider)
      returning id into v_sub_id;

      insert into public.subscription_periods(subscription_id, period_index, period_start, period_end, status, order_id, payment_id)
      values (v_sub_id, 1, now(), now() + v_step, 'paid', v_order.id, v_payment.id)
      returning id into v_period_id;

      insert into public.subscription_invoices(subscription_id, period_id, customer_user_id, order_id, payment_id, status, currency,
        subtotal_cents, discount_cents, tax_cents, total_cents, paid_at, buyer_name, buyer_tax_id)
      values (v_sub_id, v_period_id, v_order.customer_user_id, v_order.id, v_payment.id, 'paid', v_order.currency,
        v_item.unit_amount_cents * v_item.quantity, v_item.discount_cents, 0, v_item.total_cents, now(), v_order.buyer_name, v_order.buyer_tax_id);

      update public.commerce_payments p set customer_subscription_id = coalesce(p.customer_subscription_id, v_sub_id) where p.id = v_payment.id;
      v_subs := v_subs || jsonb_build_array(v_sub_id);
    end if;

    -- 付費版型
    if v_item.template_id is not null then
      if v_order.workspace_id is null then
        raise exception 'template purchase requires order.workspace_id' using errcode = '22023';
      end if;
      insert into public.site_template_purchases(template_id, workspace_id, user_id, order_id, order_item_id, amount_cents, currency, status, paid_at)
      values (v_item.template_id, v_order.workspace_id, v_order.customer_user_id, v_order.id, v_item.id, v_item.total_cents, v_order.currency, 'paid', now())
      on conflict (order_item_id) where order_item_id is not null do update set status = 'paid', paid_at = coalesce(site_template_purchases.paid_at, now())
      returning id into v_purchase_id;
      v_license_id := null;
      insert into public.site_template_licenses(template_id, license_scope, workspace_id, source_type, purchase_id, granted_by)
      values (v_item.template_id, 'workspace', v_order.workspace_id, 'purchase', v_purchase_id, v_uid)
      on conflict (template_id, workspace_id) where status = 'active' and license_scope = 'workspace' do nothing
      returning id into v_license_id;
      if v_license_id is not null then
        v_licenses := v_licenses || jsonb_build_array(v_license_id);
      end if;
    end if;

    -- 權限代碼（每個數量一組）
    v_ent_product := coalesce(v_item.entitlement_product_id, v_plan.entitlement_product_id, v_item.product_entitlement_id);
    if v_ent_product is not null then
      for i in 1..v_item.quantity loop
        v_code := public.issue_access_code(
          v_ent_product,
          case when v_sub_id is not null then 'subscription' else 'order' end,
          v_order.id, v_item.id, v_sub_id, v_order.customer_user_id, v_order.buyer_email, null,
          jsonb_build_object('order_number', v_order.order_number));
        v_codes := v_codes || jsonb_build_array(jsonb_build_object('code', v_code.code, 'product_code', v_code.product_code, 'status', v_code.status));
      end loop;
    end if;
  end loop;

  update public.commerce_orders o
  set entitlements_issued_at = now(), status = 'fulfilled', fulfilled_at = now(), updated_by = v_uid,
      admin_note = case when note is null then o.admin_note else concat_ws(E'\n', o.admin_note, note) end
  where o.id = v_order.id;

  perform public.write_audit_log('order.mark_paid_and_issue', 'commerce_orders', v_order.id,
    jsonb_build_object('status', v_order.status),
    jsonb_build_object('status', 'fulfilled', 'payment_id', v_payment.id, 'access_code_count', jsonb_array_length(v_codes)),
    v_order.workspace_id, case when public.is_service_role() then 'system' else 'admin' end);

  return jsonb_build_object('ok', true, 'already_processed', false, 'order_id', v_order.id, 'order_number', v_order.order_number,
    'payment_id', v_payment.id, 'access_codes', v_codes, 'subscriptions', v_subs, 'template_licenses', v_licenses);
end $$;

-- 續訂成功（webhook / 排程呼叫）：新增週期、延長訂閱與已兌換權限到期日
create or replace function public.record_subscription_renewal(subscription_id uuid, payment_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_sub public.customer_subscriptions;
  v_step interval;
  v_index int;
  v_start timestamptz;
  v_end timestamptz;
begin
  if not (public.is_service_role() or public.is_admin()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;
  select * into v_sub from public.customer_subscriptions s where s.id = record_subscription_renewal.subscription_id for update;
  if not found or v_sub.status in ('cancelled','expired') then
    raise exception 'subscription not renewable' using errcode = '22023';
  end if;
  if exists (select 1 from public.subscription_periods sp where sp.payment_id = record_subscription_renewal.payment_id) then
    return jsonb_build_object('ok', true, 'already_processed', true);
  end if;
  v_step := case v_sub.billing_interval when 'month' then make_interval(months => v_sub.interval_count) else make_interval(years => v_sub.interval_count) end;
  v_start := greatest(v_sub.current_period_end, now());
  v_end := v_start + v_step;
  select coalesce(max(period_index), 0) + 1 into v_index from public.subscription_periods sp where sp.subscription_id = v_sub.id;

  insert into public.subscription_periods(subscription_id, period_index, period_start, period_end, status, payment_id)
  values (v_sub.id, v_index, v_start, v_end, 'paid', record_subscription_renewal.payment_id);
  update public.customer_subscriptions s
  set status = case when s.cancel_at_period_end then 'cancel_scheduled' else 'active' end,
      current_period_start = v_start, current_period_end = v_end, retry_count = 0,
      renewal_status = case when s.auto_renew then 'auto' else s.renewal_status end,
      next_billing_at = case when s.auto_renew then v_end end
  where s.id = v_sub.id;
  update public.user_entitlements ue set expires_at = v_end, status = 'active'
  where ue.customer_subscription_id = v_sub.id and ue.status in ('active','expired');
  perform public.write_audit_log('subscription.renew', 'customer_subscriptions', v_sub.id,
    jsonb_build_object('current_period_end', v_sub.current_period_end), jsonb_build_object('current_period_end', v_end), v_sub.workspace_id, 'system');
  return jsonb_build_object('ok', true, 'subscription_id', v_sub.id, 'period_index', v_index, 'current_period_end', v_end);
end $$;

create or replace function public.request_subscription_cancellation(
  subscription_id uuid, cancel_type text default 'at_period_end', reason_code text default null, reason_text text default null
) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_sub public.customer_subscriptions; v_id uuid;
begin
  select * into v_sub from public.customer_subscriptions s where s.id = request_subscription_cancellation.subscription_id for update;
  if not found or not (v_sub.customer_user_id = auth.uid() or public.is_admin() or public.is_service_role()
                       or (v_sub.workspace_id is not null and public.has_workspace_role(v_sub.workspace_id, array['owner']))) then
    raise exception 'subscription not found' using errcode = 'P0002';
  end if;
  if v_sub.status not in ('active','trialing','past_due') then
    raise exception 'subscription cannot be cancelled in status %', v_sub.status using errcode = '22023';
  end if;
  if cancel_type = 'immediate' and not (public.is_admin() or public.is_service_role()) then
    raise exception 'immediate cancellation must be processed by Senying admin' using errcode = '42501';
  end if;

  insert into public.subscription_cancellations(subscription_id, requested_by, cancel_type, reason_code, reason_text, status, effective_at, processed_by, processed_at)
  values (v_sub.id, auth.uid(), cancel_type, reason_code, reason_text,
          case when cancel_type = 'immediate' then 'completed' else 'scheduled' end,
          case when cancel_type = 'immediate' then now() else v_sub.current_period_end end,
          case when cancel_type = 'immediate' then auth.uid() end, case when cancel_type = 'immediate' then now() end)
  returning id into v_id;

  if cancel_type = 'immediate' then
    update public.customer_subscriptions s set status = 'cancelled', cancelled_at = now(), ended_at = now(), auto_renew = false,
      renewal_status = 'disabled', next_billing_at = null where s.id = v_sub.id;
    update public.user_entitlements ue set status = 'expired', expires_at = now()
    where ue.customer_subscription_id = v_sub.id and ue.status = 'active';
  else
    update public.customer_subscriptions s set status = 'cancel_scheduled', cancel_at_period_end = true, cancelled_at = now(),
      auto_renew = false, renewal_status = 'disabled', next_billing_at = null where s.id = v_sub.id;
  end if;

  perform public.write_audit_log('subscription.cancel_request', 'customer_subscriptions', v_sub.id,
    jsonb_build_object('status', v_sub.status), jsonb_build_object('cancel_type', cancel_type), v_sub.workspace_id, null);
  return jsonb_build_object('ok', true, 'cancellation_id', v_id, 'effective_at', case when cancel_type = 'immediate' then now() else v_sub.current_period_end end);
end $$;

-- 排程（pg_cron / Edge Function）：代碼過期、訂閱到期、權限停用、版型授權與 AI 額度過期
create or replace function public.run_entitlement_expiry_job() returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare v_codes int; v_subs int; v_ents int; v_licenses int; v_credits int;
begin
  if not (public.is_service_role() or public.is_admin()) then
    raise exception 'admin or service role required' using errcode = '42501';
  end if;

  update public.access_codes set status = 'expired'
  where status in ('generated','issued') and expires_at is not null and expires_at <= now();
  get diagnostics v_codes = row_count;

  update public.customer_subscriptions s
  set status = case when s.cancel_at_period_end then 'cancelled' else 'expired' end::public.subscription_status,
      ended_at = now(), renewal_status = case when s.renewal_status = 'auto' then 'failed' else s.renewal_status end, next_billing_at = null
  from public.subscription_plan_prices spp
  where spp.id = s.plan_price_id
    and s.status in ('active','trialing','past_due','cancel_scheduled')
    and s.current_period_end + make_interval(days => case when s.cancel_at_period_end then 0 else spp.grace_period_days end) <= now();
  get diagnostics v_subs = row_count;

  update public.user_entitlements ue set status = 'expired'
  where ue.status = 'active'
    and ((ue.expires_at is not null and ue.expires_at <= now())
      or exists (select 1 from public.customer_subscriptions s where s.id = ue.customer_subscription_id and s.status in ('cancelled','expired')));
  get diagnostics v_ents = row_count;

  update public.site_template_licenses set status = 'expired'
  where status = 'active' and expires_at is not null and expires_at <= now();
  get diagnostics v_licenses = row_count;

  update public.ai_article_usage_credits c set status = 'expired'
  where c.status = 'active'
    and ((c.period_end is not null and c.period_end <= now())
      or exists (select 1 from public.user_entitlements ue where ue.id = c.user_entitlement_id and ue.status <> 'active'));
  get diagnostics v_credits = row_count;

  return jsonb_build_object('ok', true, 'access_codes_expired', v_codes, 'subscriptions_ended', v_subs,
    'entitlements_expired', v_ents, 'template_licenses_expired', v_licenses, 'ai_credits_expired', v_credits, 'ran_at', now());
end $$;

-- =====================================================================
-- L. SEO Article Generator
-- =====================================================================
create or replace function public.consume_ai_article_credits(generation_id uuid, credits integer default 1) returns jsonb
language plpgsql volatile security definer set search_path = public, pg_temp as $$
declare
  v_gen public.ai_article_generations;
  v_credit public.ai_article_usage_credits;
  v_quota_result jsonb;
  v_event_id uuid;
begin
  if credits is null or credits <= 0 then
    raise exception 'credits must be positive' using errcode = '22023';
  end if;
  select * into v_gen from public.ai_article_generations g where g.id = consume_ai_article_credits.generation_id for update;
  if not found then
    raise exception 'generation not found' using errcode = 'P0002';
  end if;
  if v_gen.credits_charged > 0 then
    return jsonb_build_object('ok', true, 'replayed', true, 'credits_charged', v_gen.credits_charged);
  end if;

  if v_gen.workspace_id is null then
    -- v1 內部使用：森映後台角色，不扣客戶額度，只記錄
    if not (public.is_service_role() or public.has_admin_role(array['owner','admin','editor','author']::public.cms_admin_role[])) then
      raise exception 'Senying staff role required' using errcode = '42501';
    end if;
    insert into public.ai_article_usage_events(generation_id, actor_user_id, event_type, credits, idempotency_key)
    values (v_gen.id, auth.uid(), 'consume', credits, 'ai.generation:' || v_gen.id::text)
    returning id into v_event_id;
  else
    if not (public.is_service_role() or public.is_admin() or public.can_access_ai_workspace(v_gen.workspace_id, array['owner','admin','editor'])) then
      raise exception 'AI article generator is not available for this workspace' using errcode = '42501';
    end if;
    select * into v_credit from public.ai_article_usage_credits c
    where c.workspace_id = v_gen.workspace_id and c.status = 'active'
      and c.period_start <= now() and (c.period_end is null or c.period_end > now())
      and c.credits_total - c.credits_used >= credits
    order by c.period_end nulls last, c.created_at
    limit 1
    for update;
    if not found then
      raise exception 'AI article credits exhausted' using errcode = 'P0001';
    end if;
    if v_credit.user_entitlement_id is not null then
      v_quota_result := public.consume_usage_quota(v_credit.user_entitlement_id, 'ai.article.generate', credits, 'ai.generation:' || v_gen.id::text);
    end if;
    update public.ai_article_usage_credits c
    set credits_used = c.credits_used + credits,
        status = case when c.credits_used + credits >= c.credits_total then 'exhausted' else c.status end
    where c.id = v_credit.id returning * into v_credit;
    insert into public.ai_article_usage_events(credit_id, generation_id, workspace_id, entitlement_usage_event_id, actor_user_id, event_type, credits, balance_after, idempotency_key)
    values (v_credit.id, v_gen.id, v_gen.workspace_id, (v_quota_result ->> 'usage_event_id')::uuid, auth.uid(), 'consume', credits,
            v_credit.credits_total - v_credit.credits_used, 'ai.generation:' || v_gen.id::text)
    returning id into v_event_id;
  end if;

  update public.ai_article_generations g set credits_charged = credits where g.id = v_gen.id;
  return jsonb_build_object('ok', true, 'replayed', false, 'usage_event_id', v_event_id, 'credits_charged', credits,
    'balance', case when v_credit.id is null then null else v_credit.credits_total - v_credit.credits_used end);
end $$;

-- =====================================================================
-- M. Function privileges
-- Supabase 預設會把 public schema 新函式 EXECUTE 授權給 anon / authenticated，這裡全部收回再逐一開放。
-- =====================================================================
do $$
declare
  f record;
  -- RLS policy / CHECK 會呼叫的 helper：anon、authenticated 都需要 EXECUTE（內部自行判斷身分，anon 一律 false）
  v_public text[] := array[
    'is_service_role','is_internal_context','current_admin_role','has_admin_role','is_admin','is_owner','is_cms_staff',
    'can_publish_content','is_publicly_visible','platform_feature_enabled',
    'current_workspace_role','is_workspace_member','has_workspace_role','site_project_workspace_id',
    'can_read_site_project','can_edit_site_project','can_manage_site_project','is_site_publicly_visible',
    'has_active_entitlement','workspace_has_feature','can_access_ai_workspace',
    'is_valid_secret_refs','jsonb_has_secret_like_keys','normalize_domain_name','normalize_access_code',
    'request_ip_hash','request_user_agent',
    'get_enabled_payment_methods','submit_site_form'
  ];
  -- 登入後可呼叫的業務函式（函式內再檢查角色）
  v_authenticated text[] := array[
    'redeem_access_code','transfer_access_code','revoke_access_code','generate_access_code','issue_access_code',
    'consume_usage_quota','create_workspace_from_access_code','create_workspace_invitation','accept_workspace_invitation',
    'can_create_site_project','can_workspace_use_template','can_use_template','create_site_project_from_template','publish_site_project',
    'generate_dns_instruction','add_site_project_domain',
    'get_bank_transfer_instructions','mark_payment_success_and_issue_entitlement','record_subscription_renewal',
    'request_subscription_cancellation','run_entitlement_expiry_job','consume_ai_article_credits',
    'workspace_active_owner_count'  -- guard_workspace_member_changes（security invoker）會以呼叫者身分執行
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')  -- 排除 extension 函式（citext 等）
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
    if f.proname = any(v_public) then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    elsif f.proname = any(v_authenticated) then
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;
  end loop;
end $$;

commit;
