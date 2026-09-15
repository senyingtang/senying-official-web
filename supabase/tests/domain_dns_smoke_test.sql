-- =====================================================================
-- domain_dns_smoke_test.sql
-- DNS 指示產生（custom_subdomain / custom_apex / .com.tw / 平台子網域 / 正規化 / 無效網域）、
-- 版本階段限制（v3 才開放自訂網域）、新增網域後的驗證資料、主要網域唯一、客戶不可自行標記驗證、跨 workspace 不外洩。
-- 本機 / 可丟棄 Supabase，以 postgres 執行，全程 rollback。
-- =====================================================================
begin;

create function pg_temp.new_user(p_label text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := p_label || '.' || substr(v::text, 1, 8) || '@test.invalid';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at) values (v, v_email, 'authenticated', 'authenticated', now(), now());
  perform set_config('test.' || p_label, v::text, true);
  return v;
end $$;
create function pg_temp.login(p_label text) returns void language plpgsql as $$
declare v text := current_setting('test.' || p_label);
begin
  perform set_config('request.jwt.claim.sub', v, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v, 'role', 'authenticated')::text, true);
end $$;
create function pg_temp.logout() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claim.role', '', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- ---------------------------------------------------------------------
-- 1. 指示產生（service context）
-- ---------------------------------------------------------------------
do $$
declare v jsonb;
begin
  -- www 子網域（建議做法）
  v := public.generate_dns_instruction('www.client.com');
  if v ->> 'domain_type' <> 'custom_subdomain' or v ->> 'apex_domain' <> 'client.com' or v ->> 'subdomain_label' <> 'www' then
    raise exception 'FAIL www classification: %', v;
  end if;
  if not exists (select 1 from jsonb_array_elements(v -> 'records') r where r ->> 'type' = 'CNAME' and r ->> 'host' = 'www' and (r ->> 'required')::boolean) then
    raise exception 'FAIL www CNAME record missing';
  end if;
  if not exists (select 1 from jsonb_array_elements(v -> 'records') r where r ->> 'type' = 'TXT' and r ->> 'host' = '_syt-verify.www') then
    raise exception 'FAIL TXT verification record missing';
  end if;
  if v ->> 'recommended_domain' <> 'www.client.com' then raise exception 'FAIL recommended domain'; end if;
  if not (v ->> 'is_placeholder_target')::boolean then raise exception 'FAIL placeholder target not flagged'; end if;
  if jsonb_array_length(v -> 'steps') < 4 then raise exception 'FAIL steps missing'; end if;

  -- 裸網域：建議 www、ALIAS / CNAME Flattening、警告不可 CNAME
  v := public.generate_dns_instruction('client.com');
  if v ->> 'domain_type' <> 'custom_apex' or v ->> 'recommended_domain' <> 'www.client.com' then raise exception 'FAIL apex classification: %', v; end if;
  if not exists (select 1 from jsonb_array_elements(v -> 'records') r where r ->> 'type' = 'ALIAS' and r ->> 'host' = '@') then raise exception 'FAIL ALIAS record missing'; end if;
  if not exists (select 1 from jsonb_array_elements(v -> 'records') r where r ->> 'type' = 'CNAME' and r ->> 'host' = 'www') then raise exception 'FAIL apex www suggestion missing'; end if;
  if not exists (select 1 from jsonb_array_elements_text(v -> 'warnings') w where w like '%CNAME%') then raise exception 'FAIL apex CNAME warning missing'; end if;

  -- 台灣二級網域
  v := public.generate_dns_instruction('shop.client.com.tw');
  if v ->> 'domain_type' <> 'custom_subdomain' or v ->> 'apex_domain' <> 'client.com.tw' or v ->> 'subdomain_label' <> 'shop' then raise exception 'FAIL .com.tw subdomain: %', v; end if;
  v := public.generate_dns_instruction('client.com.tw');
  if v ->> 'domain_type' <> 'custom_apex' then raise exception 'FAIL .com.tw apex: %', v; end if;

  -- 正規化
  v := public.generate_dns_instruction('  HTTPS://WWW.Client.com/about?x=1 ');
  if v ->> 'domain' <> 'www.client.com' then raise exception 'FAIL normalization: %', v; end if;

  -- 平台子網域（占位後綴 sites.example.com）
  v := public.generate_dns_instruction('demo.sites.example.com');
  if v ->> 'domain_type' <> 'platform_subdomain' or jsonb_array_length(v -> 'records') <> 0 then raise exception 'FAIL platform subdomain: %', v; end if;

  -- 無效網域
  begin perform public.generate_dns_instruction('localhost'); raise exception 'FAIL localhost accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.generate_dns_instruction('com.tw'); raise exception 'FAIL public suffix accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.generate_dns_instruction('bad_domain.com'); raise exception 'FAIL underscore accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.generate_dns_instruction(''); raise exception 'FAIL empty accepted'; exception when invalid_parameter_value then null; end;

  raise notice 'PASS generate_dns_instruction classification / records / warnings';
end $$;

-- ---------------------------------------------------------------------
-- 2. 準備 workspace 與網站
-- ---------------------------------------------------------------------
select pg_temp.new_user('owner_a'), pg_temp.new_user('owner_b');
do $$
declare ws_a uuid := gen_random_uuid(); ws_b uuid := gen_random_uuid(); p_a uuid := gen_random_uuid(); p_b uuid := gen_random_uuid();
begin
  insert into public.customer_workspaces(id, slug, name, owner_user_id) values
    (ws_a, 'dns-a-' || substr(md5(ws_a::text), 1, 8), 'DNS A', current_setting('test.owner_a')::uuid),
    (ws_b, 'dns-b-' || substr(md5(ws_b::text), 1, 8), 'DNS B', current_setting('test.owner_b')::uuid);
  insert into public.customer_workspace_members(workspace_id, user_id, role) values
    (ws_a, current_setting('test.owner_a')::uuid, 'owner'), (ws_b, current_setting('test.owner_b')::uuid, 'owner');
  insert into public.customer_site_projects(id, workspace_id, name, slug, site_type) values
    (p_a, ws_a, 'DNS Site A', 'site-dns-a', 'seo_website'), (p_b, ws_b, 'DNS Site B', 'site-dns-b', 'landing_page');
  insert into public.customer_site_publish_settings(site_project_id) values (p_a), (p_b);
  perform set_config('test.p_a', p_a::text, true);
  perform set_config('test.p_b', p_b::text, true);
end $$;

-- ---------------------------------------------------------------------
-- 3. 版本階段：自訂網域未開放（v3）
-- ---------------------------------------------------------------------
select pg_temp.login('owner_a');
set local role authenticated;
do $$
begin
  begin
    perform public.add_site_project_domain(current_setting('test.p_a')::uuid, 'www.client-a.com', true);
    raise exception 'FAIL custom domain allowed before v3';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.add_site_project_domain(current_setting('test.p_a')::uuid, 'client-a.sites.example.com', true);
    raise exception 'FAIL platform subdomain allowed before v2';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.site_project_domains(site_project_id, workspace_id, domain, domain_type, apex_domain, subdomain_label, verification_token)
    select id, workspace_id, 'www.direct-insert.com', 'custom_subdomain', 'direct-insert.com', 'www', 'syt-verify=' || md5('x')
    from public.customer_site_projects where id = current_setting('test.p_a')::uuid;
    raise exception 'FAIL customer inserted domain directly';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS release phase gating for domains';
end $$;
reset role;
select pg_temp.logout();

-- 開啟 v2 / v3 旗標（僅此交易）
update public.cms_site_settings
set setting_value = setting_value || '{"site_builder.custom_domain": true, "site_builder.platform_subdomain": true}'::jsonb
where setting_key = 'platform.feature_flags';

-- ---------------------------------------------------------------------
-- 4. 新增網域：驗證資料、DNS 指示保存、SSL 狀態、重複網域、主要網域
-- ---------------------------------------------------------------------
select pg_temp.login('owner_a');
set local role authenticated;
do $$
declare v jsonb; v_id uuid; v_sub uuid; n int;
begin
  v := public.add_site_project_domain(current_setting('test.p_a')::uuid, 'WWW.Client-A.com', true);
  v_id := (v ->> 'domain_id')::uuid;
  if (select domain::text from public.site_project_domains where id = v_id) <> 'www.client-a.com' then raise exception 'FAIL stored domain not normalized'; end if;
  if (select status from public.site_project_domains where id = v_id) <> 'pending' then raise exception 'FAIL new custom domain should be pending'; end if;
  if (select verification_token from public.site_project_domains where id = v_id) !~ '^syt-verify=[a-z0-9]{32}$' then raise exception 'FAIL token format'; end if;
  if (v #>> '{instruction,verification,value}') is distinct from (select verification_token from public.site_project_domains where id = v_id) then
    raise exception 'FAIL instruction does not contain domain token';
  end if;
  if (select count(*) from public.site_dns_instructions where domain_id = v_id and is_current) <> 1 then raise exception 'FAIL dns instruction not stored'; end if;
  if (select record_name from public.site_domain_verifications where domain_id = v_id) <> '_syt-verify.www.client-a.com' then raise exception 'FAIL verification record name'; end if;
  if (select status from public.site_ssl_certificates where domain_id = v_id) <> 'not_requested' then raise exception 'FAIL ssl status'; end if;

  v := public.add_site_project_domain(current_setting('test.p_a')::uuid, 'client-a.sites.example.com', false);
  v_sub := (v ->> 'domain_id')::uuid;
  if (select status from public.site_project_domains where id = v_sub) <> 'verified' then raise exception 'FAIL platform subdomain should be verified'; end if;

  begin
    perform public.add_site_project_domain(current_setting('test.p_a')::uuid, 'www.client-a.com');
    raise exception 'FAIL duplicate domain accepted';
  exception when unique_violation then null;
  end;

  begin
    update public.site_project_domains set status = 'active', verified_at = now(), activated_at = now() where id = v_id;
    raise exception 'FAIL customer marked domain active';
  exception when insufficient_privilege then null;
  end;

  update public.site_project_domains set www_redirect = 'apex_to_www' where id = v_id;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL owner cannot change redirect preference'; end if;

  perform set_config('test.domain_a', v_id::text, true);
  perform set_config('test.domain_sub', v_sub::text, true);
  raise notice 'PASS add domain / verification / guards';
end $$;
reset role;
select pg_temp.logout();

do $$
begin
  begin
    update public.site_project_domains set is_primary = true where id = current_setting('test.domain_sub')::uuid;
    raise exception 'FAIL two primary domains accepted';
  exception when unique_violation then null;
  end;
  raise notice 'PASS single primary domain per site';
end $$;

-- ---------------------------------------------------------------------
-- 5. 跨 workspace：看不到網域與驗證碼
-- ---------------------------------------------------------------------
select pg_temp.login('owner_b');
set local role authenticated;
do $$
declare v jsonb;
begin
  if exists (select 1 from public.site_project_domains) then raise exception 'FAIL owner_b can see domains of A'; end if;
  if exists (select 1 from public.site_dns_instructions) then raise exception 'FAIL owner_b can see dns instructions of A'; end if;
  v := public.generate_dns_instruction('www.client-a.com');
  if v ->> 'domain_id' is not null or (v #>> '{verification,value}') is not null then raise exception 'FAIL token leaked to other workspace: %', v; end if;
  begin
    perform public.add_site_project_domain(current_setting('test.p_a')::uuid, 'www.hijack.com');
    raise exception 'FAIL owner_b added domain to site A';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.site_domain_check_logs(domain_id, check_type, result) values (current_setting('test.domain_a')::uuid, 'txt', 'pass');
    raise exception 'FAIL customer wrote domain check log';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS domain data isolated between workspaces';
end $$;
reset role;

-- 6. 客戶移除網域：狀態 removed、取消 primary，網域可被重新使用
select pg_temp.login('owner_a');
set local role authenticated;
do $$
begin
  update public.site_project_domains set status = 'removed' where id = current_setting('test.domain_a')::uuid;
  if (select is_primary or removed_at is null from public.site_project_domains where id = current_setting('test.domain_a')::uuid) then raise exception 'FAIL removed domain state'; end if;
  perform public.add_site_project_domain(current_setting('test.p_a')::uuid, 'www.client-a.com', true);
  raise notice 'PASS removed domain can be re-added';
end $$;
reset role;

rollback;
