-- =====================================================================
-- access_code_smoke_test.sql
-- 權限代碼：格式、唯一性、禁止人工建立、付款成功發放（冪等）、轉讓、兌換、重複兌換、撤銷、過期、
--           暴力猜測限制、workspace 建立、額度扣除（含冪等與超額）、訂閱到期停用權限。
-- 本機 / 可丟棄 Supabase，以 postgres 執行，全程 rollback。
--
-- 併發兌換（手動驗證）：開兩個 psql session，各自 begin 後以不同使用者呼叫 redeem_access_code(同一代碼)，
-- 第二個 session 會等待第一個 commit，之後回傳 {"ok":false,"result":"already_redeemed"}。
-- 另有 uq_access_code_redemptions_one_success 唯一索引作最後防線。
-- =====================================================================
begin;

create function pg_temp.new_user(p_label text) returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid(); v_email text := p_label || '.' || substr(v::text, 1, 8) || '@test.invalid';
begin
  insert into auth.users(id, email, aud, role, created_at, updated_at) values (v, v_email, 'authenticated', 'authenticated', now(), now());
  perform set_config('test.' || p_label, v::text, true);
  perform set_config('test.' || p_label || '_email', v_email, true);
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

select pg_temp.new_user('admin'), pg_temp.new_user('buyer'), pg_temp.new_user('friend'), pg_temp.new_user('stranger');
insert into public.admin_profiles(user_id, display_name, role) values (current_setting('test.admin')::uuid, 'Test Owner', 'owner');

-- ---------------------------------------------------------------------
-- 1. 產生器：格式、無效產品代碼、唯一性、禁止人工建立
-- ---------------------------------------------------------------------
do $$
declare
  v_code text; v_codes text[] := '{}'; i int; v_ent uuid;
begin
  foreach v_code in array array['SEO','LP','ECOM','DM','AI','CUSTOM'] loop
    v_code := public.generate_access_code(v_code);
    if v_code !~ '^SYT-(SEO|LP|ECOM|DM|AI|CUSTOM)-[0-9]{4}-[A-HJKMNP-Z1-9]{6}$' then
      raise exception 'FAIL invalid generated format: %', v_code;
    end if;
  end loop;
  if split_part(public.generate_access_code('lp'), '-', 2) <> 'LP' then raise exception 'FAIL product code not normalized'; end if;
  if split_part(public.generate_access_code('SEO'), '-', 3) <> to_char(now() at time zone 'Asia/Taipei', 'YYYY') then raise exception 'FAIL year segment'; end if;

  begin
    perform public.generate_access_code('XYZ');
    raise exception 'FAIL invalid product code accepted';
  exception when invalid_parameter_value then null;
  end;

  select id into v_ent from public.entitlement_products where entitlement_key = 'seo_website_v1';
  for i in 1..200 loop
    v_codes := v_codes || (public.issue_access_code(v_ent, 'admin_grant')).code::text;
  end loop;
  if (select count(distinct c) from unnest(v_codes) c) <> 200 then raise exception 'FAIL duplicate codes issued'; end if;
  if exists (select 1 from public.access_codes where code::text !~ '^SYT-SEO-[0-9]{4}-[A-HJKMNP-Z1-9]{6}$') then raise exception 'FAIL stored code format'; end if;

  begin
    insert into public.access_codes(code, product_code, code_year, entitlement_product_id)
    values ('SYT-SEO-2026-AAAAAA', 'SEO', 2026, v_ent);
    raise exception 'FAIL manual access code insert accepted';
  exception when insufficient_privilege then null;
  end;
  begin
    perform set_config('syt.access_code_generator', 'on', true);
    insert into public.access_codes(code, product_code, code_year, entitlement_product_id)
    values ('SYT-SEO-2026-AAAAA0', 'SEO', 2026, v_ent);  -- 0 不在字元集
    raise exception 'FAIL invalid alphabet accepted';
  exception when check_violation then
    perform set_config('syt.access_code_generator', 'off', true);
  end;
  raise notice 'PASS generator format / uniqueness / manual insert blocked';
end $$;

-- ---------------------------------------------------------------------
-- 2. 付款成功 → 發放代碼（冪等）
-- ---------------------------------------------------------------------
do $$
declare v_order uuid; v_sub_order uuid;
begin
  insert into public.commerce_orders(customer_user_id, buyer_email, status, subtotal_cents, total_cents)
  values (current_setting('test.buyer')::uuid, current_setting('test.buyer_email'), 'awaiting_payment', 0, 0) returning id into v_order;
  insert into public.commerce_order_items(order_id, product_id, product_price_id, product_code, sku, product_name, billing_interval, quantity, unit_amount_cents, total_cents)
  select v_order, p.id, pr.id, p.product_code, p.sku, p.name, pr.billing_interval, 1, pr.amount_cents, pr.amount_cents
  from public.commerce_products p join public.commerce_product_prices pr on pr.product_id = p.id
  where p.sku = 'seo-website-plan' and pr.price_key = 'seo_website_one_time';

  insert into public.commerce_orders(customer_user_id, buyer_email, status, subtotal_cents, total_cents)
  values (current_setting('test.buyer')::uuid, current_setting('test.buyer_email'), 'awaiting_payment', 0, 0) returning id into v_sub_order;
  insert into public.commerce_order_items(order_id, product_id, product_price_id, product_code, sku, product_name, billing_interval, quantity, unit_amount_cents, total_cents)
  select v_sub_order, p.id, pr.id, p.product_code, p.sku, p.name, pr.billing_interval, 1, pr.amount_cents, pr.amount_cents
  from public.commerce_products p join public.commerce_product_prices pr on pr.product_id = p.id
  where p.sku = 'seo-website-plan' and pr.price_key = 'seo_website_monthly';

  perform set_config('test.order', v_order::text, true);
  perform set_config('test.sub_order', v_sub_order::text, true);
end $$;

select pg_temp.login('stranger');
set local role authenticated;
do $$
begin
  begin
    perform public.mark_payment_success_and_issue_entitlement(current_setting('test.order')::uuid);
    raise exception 'FAIL customer marked payment success';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS customer cannot mark payment success';
end $$;
reset role;

select pg_temp.login('admin');
set local role authenticated;
do $$
declare v1 jsonb; v2 jsonb; v3 jsonb;
begin
  v1 := public.mark_payment_success_and_issue_entitlement(current_setting('test.order')::uuid);
  if jsonb_array_length(v1 -> 'access_codes') <> 1 then raise exception 'FAIL expected 1 access code, got %', v1; end if;
  if (v1 #>> '{access_codes,0,status}') <> 'issued' then raise exception 'FAIL code should be issued'; end if;
  v2 := public.mark_payment_success_and_issue_entitlement(current_setting('test.order')::uuid);
  if not (v2 ->> 'already_processed')::boolean or (v2 #>> '{access_codes,0,code}') <> (v1 #>> '{access_codes,0,code}') then
    raise exception 'FAIL mark paid is not idempotent: %', v2;
  end if;
  if (select status from public.commerce_orders where id = current_setting('test.order')::uuid) <> 'fulfilled' then raise exception 'FAIL order not fulfilled'; end if;
  if (select count(*) from public.commerce_payments where order_id = current_setting('test.order')::uuid and status = 'succeeded') <> 1 then raise exception 'FAIL payment row'; end if;

  v3 := public.mark_payment_success_and_issue_entitlement(current_setting('test.sub_order')::uuid);
  if jsonb_array_length(v3 -> 'subscriptions') <> 1 then raise exception 'FAIL subscription not created: %', v3; end if;

  perform set_config('test.code', v1 #>> '{access_codes,0,code}', true);
  perform set_config('test.sub_code', v3 #>> '{access_codes,0,code}', true);
  perform set_config('test.subscription', v3 #>> '{subscriptions,0}', true);
  raise notice 'PASS payment success issues access codes idempotently (one-time + monthly)';
end $$;
reset role;

-- ---------------------------------------------------------------------
-- 3. 可見性與轉讓（未兌換前）
-- ---------------------------------------------------------------------
select pg_temp.login('stranger');
set local role authenticated;
do $$
begin
  if exists (select 1 from public.access_codes) then raise exception 'FAIL stranger can see buyer codes'; end if;
  begin
    perform public.transfer_access_code(current_setting('test.code'), current_setting('test.stranger_email'));
    raise exception 'FAIL stranger transferred buyer code';
  exception when no_data_found then null;
  end;
  raise notice 'PASS non-holder cannot see or transfer code';
end $$;
reset role;

select pg_temp.login('buyer');
set local role authenticated;
do $$
declare v jsonb;
begin
  if (select count(*) from public.access_codes) <> 2 then raise exception 'FAIL buyer should see 2 codes'; end if;
  v := public.transfer_access_code(lower(current_setting('test.code')), current_setting('test.friend_email'));
  if not (v ->> 'ok')::boolean then raise exception 'FAIL transfer'; end if;
  if exists (select 1 from public.access_codes where code = current_setting('test.code')::citext) then raise exception 'FAIL buyer still sees transferred code'; end if;
  raise notice 'PASS holder can transfer before redemption (input normalized)';
end $$;
reset role;

-- ---------------------------------------------------------------------
-- 4. 兌換 + 建立 workspace（冪等）；重複兌換 / 兌換後轉讓被拒
-- ---------------------------------------------------------------------
select pg_temp.login('friend');
set local role authenticated;
do $$
declare v jsonb; v2 jsonb; v_ws uuid;
begin
  if (select count(*) from public.access_codes) <> 1 then raise exception 'FAIL friend should see transferred code'; end if;
  v := public.create_workspace_from_access_code(current_setting('test.code'), '朋友的工作區');
  if not (v ->> 'ok')::boolean or v ->> 'workspace_id' is null then raise exception 'FAIL create workspace: %', v; end if;
  v_ws := (v ->> 'workspace_id')::uuid;
  if public.current_workspace_role(v_ws) <> 'owner' then raise exception 'FAIL redeemer is not workspace owner'; end if;
  if not public.has_active_entitlement(auth.uid(), 'site.type.seo_website') then raise exception 'FAIL entitlement not active'; end if;
  if not public.can_create_site_project(v_ws) then raise exception 'FAIL can_create_site_project should be true'; end if;
  if (select quota_limit from public.entitlement_usage_quotas q join public.user_entitlements ue on ue.id = q.user_entitlement_id
      where ue.workspace_id = v_ws and q.usage_key = 'site.create') <> 1 then raise exception 'FAIL site.create quota should be 1'; end if;

  v2 := public.create_workspace_from_access_code(current_setting('test.code'));
  if v2 ->> 'result' <> 'already_exists' or (v2 ->> 'workspace_id')::uuid <> v_ws then raise exception 'FAIL not idempotent: %', v2; end if;

  begin
    perform public.transfer_access_code(current_setting('test.code'), current_setting('test.buyer_email'));
    raise exception 'FAIL redeemed code transferred';
  exception when invalid_parameter_value then null;
  end;

  -- v1：每組代碼 1 個網站 → 扣完後不可再建
  perform public.consume_usage_quota((select id from public.user_entitlements where workspace_id = v_ws), 'site.create', 1, 'test-site-1');
  if public.can_create_site_project(v_ws) then raise exception 'FAIL quota exhausted but can create'; end if;
  v2 := public.consume_usage_quota((select id from public.user_entitlements where workspace_id = v_ws), 'site.create', 1, 'test-site-1');
  if not (v2 ->> 'replayed')::boolean then raise exception 'FAIL idempotency replay'; end if;
  begin
    perform public.consume_usage_quota((select id from public.user_entitlements where workspace_id = v_ws), 'site.create', 1, 'test-site-2');
    raise exception 'FAIL quota exceeded not raised';
  exception when raise_exception then
    if sqlerrm not like 'quota exceeded%' then raise; end if;
  end;

  perform set_config('test.friend_ws', v_ws::text, true);
  raise notice 'PASS redeem + workspace + quota (v1: 1 site per code)';
end $$;
reset role;

select pg_temp.login('stranger');
set local role authenticated;
do $$
declare v jsonb; i int;
begin
  v := public.redeem_access_code(current_setting('test.code'));
  if v ->> 'result' <> 'already_redeemed' then raise exception 'FAIL second redeem: %', v; end if;
  v := public.redeem_access_code('not-a-code');
  if v ->> 'result' <> 'invalid_format' then raise exception 'FAIL invalid format: %', v; end if;
  v := public.redeem_access_code('SYT-SEO-2026-ZZZZZZ');
  if v ->> 'result' not in ('not_found') then raise exception 'FAIL not found: %', v; end if;
  if exists (select 1 from public.user_entitlements) then raise exception 'FAIL stranger got an entitlement'; end if;
  if exists (select 1 from public.access_code_redemptions where attempted_code_sha256 is null) then raise exception 'FAIL attempt hash missing'; end if;
  -- 暴力猜測：15 分鐘內累計 10 次失敗後回傳 rate_limited
  for i in 1..7 loop
    perform public.redeem_access_code('SYT-SEO-2026-ZZZZZ' || substr('ABCDEFGH', i, 1));
  end loop;
  v := public.redeem_access_code('SYT-SEO-2026-ZZZZZX');
  if v ->> 'result' <> 'rate_limited' then raise exception 'FAIL rate limit: %', v; end if;
  raise notice 'PASS already_redeemed / invalid_format / not_found / rate_limited';
end $$;
reset role;

-- API 直接修改兌換欄位被拒（即使是 owner / admin）
select pg_temp.login('admin');
set local role authenticated;
do $$
begin
  begin
    update public.access_codes set redeemed_by_user_id = current_setting('test.stranger')::uuid where code = current_setting('test.code')::citext;
    raise exception 'FAIL admin rebound redeemed code';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.access_codes set status = 'issued' where code = current_setting('test.code')::citext;
    raise exception 'FAIL admin reverted redeemed code';
  exception when insufficient_privilege then null;
  end;
  raise notice 'PASS redeemed code is immutable';
end $$;
reset role;
select pg_temp.logout();

-- ---------------------------------------------------------------------
-- 5. 撤銷 / 過期
-- ---------------------------------------------------------------------
do $$
declare v_ent uuid; c_revoked public.access_codes; c_expired public.access_codes;
begin
  select id into v_ent from public.entitlement_products where entitlement_key = 'landing_page_v1';
  c_revoked := public.issue_access_code(v_ent, 'admin_grant', null, null, null, current_setting('test.stranger')::uuid);
  perform public.revoke_access_code(c_revoked.code::text, 'test revoke');
  c_expired := public.issue_access_code(v_ent, 'admin_grant', null, null, null, current_setting('test.stranger')::uuid, null, now() + interval '1 second');
  update public.access_codes set expires_at = now() - interval '1 minute' where id = c_expired.id;
  perform set_config('test.revoked_code', c_revoked.code::text, true);
  perform set_config('test.expired_code', c_expired.code::text, true);
  delete from public.access_code_redemptions where user_id = current_setting('test.stranger')::uuid; -- 清掉上一段的失敗次數
end $$;

select pg_temp.login('stranger');
set local role authenticated;
do $$
declare v jsonb;
begin
  v := public.redeem_access_code(current_setting('test.revoked_code'));
  if v ->> 'result' <> 'revoked' then raise exception 'FAIL revoked: %', v; end if;
  v := public.redeem_access_code(current_setting('test.expired_code'));
  if v ->> 'result' <> 'expired' then raise exception 'FAIL expired: %', v; end if;
  if (select status from public.access_codes where code = current_setting('test.expired_code')::citext) <> 'expired' then raise exception 'FAIL status not expired'; end if;
  raise notice 'PASS revoked / expired codes cannot be redeemed';
end $$;
reset role;

-- ---------------------------------------------------------------------
-- 6. 訂閱代碼：權限到期日 = current_period_end；到期後排程停用
-- ---------------------------------------------------------------------
select pg_temp.login('buyer');
set local role authenticated;
do $$
declare v jsonb;
begin
  v := public.redeem_access_code(current_setting('test.sub_code'));
  if not (v ->> 'ok')::boolean then raise exception 'FAIL subscription code redeem: %', v; end if;
  if (v ->> 'expires_at')::timestamptz is distinct from (select current_period_end from public.customer_subscriptions where id = current_setting('test.subscription')::uuid) then
    raise exception 'FAIL subscription entitlement expiry mismatch';
  end if;
  if not public.has_active_entitlement(auth.uid(), 'site.create') then raise exception 'FAIL subscription entitlement inactive'; end if;
  if (select count(*) from public.customer_subscriptions) <> 1 then raise exception 'FAIL buyer cannot see own subscription'; end if;
  raise notice 'PASS subscription code bound to billing period';
end $$;
reset role;
select pg_temp.logout();

do $$
declare v jsonb;
begin
  update public.customer_subscriptions set current_period_start = now() - interval '2 months', current_period_end = now() - interval '10 days'
  where id = current_setting('test.subscription')::uuid;
  v := public.run_entitlement_expiry_job();
  if (select status from public.customer_subscriptions where id = current_setting('test.subscription')::uuid) <> 'expired' then raise exception 'FAIL subscription not expired: %', v; end if;
  if exists (select 1 from public.user_entitlements where customer_subscription_id = current_setting('test.subscription')::uuid and status = 'active') then
    raise exception 'FAIL entitlement still active after subscription expiry';
  end if;
  if public.has_active_entitlement(current_setting('test.buyer')::uuid, 'site.create') then raise exception 'FAIL has_active_entitlement after expiry'; end if;
  raise notice 'PASS subscription expiry disables entitlements';
end $$;

-- ---------------------------------------------------------------------
-- 7. 月額度自動滾動（AI 文章 30 篇 / 月）
-- ---------------------------------------------------------------------
do $$
declare c public.access_codes; v jsonb; v_ent uuid;
begin
  c := public.issue_access_code((select id from public.entitlement_products where entitlement_key = 'ai_article_generator'), 'admin_grant',
                                null, null, null, current_setting('test.friend')::uuid);
  perform pg_temp.login('friend');
  v := public._redeem_access_code_internal(c.code::text, current_setting('test.friend')::uuid);
  v_ent := (v ->> 'user_entitlement_id')::uuid;
  perform pg_temp.logout();
  v := public.consume_usage_quota(v_ent, 'ai.article.generate', 30);
  if (v ->> 'remaining')::int <> 0 then raise exception 'FAIL AI quota remaining: %', v; end if;
  begin
    perform public.consume_usage_quota(v_ent, 'ai.article.generate', 1);
    raise exception 'FAIL AI quota exceeded not raised';
  exception when raise_exception then
    if sqlerrm not like 'quota exceeded%' then raise; end if;
  end;
  -- 模擬進入下個月：舊週期結束
  update public.entitlement_usage_quotas set period_start = now() - interval '1 month 1 day', period_end = now() - interval '1 day'
  where user_entitlement_id = v_ent;
  v := public.consume_usage_quota(v_ent, 'ai.article.generate', 1);
  if (v ->> 'quota_used')::int <> 1 then raise exception 'FAIL monthly quota did not roll over: %', v; end if;
  raise notice 'PASS monthly quota rollover';
end $$;

-- ---------------------------------------------------------------------
-- 8. 刪除帳號：外鍵 set null 不被 guard 誤擋；已兌換代碼的兌換者不可硬刪除（restrict）
-- ---------------------------------------------------------------------
select pg_temp.new_user('issuer'), pg_temp.new_user('leaver');
insert into public.admin_profiles(user_id, display_name, role) values (current_setting('test.issuer')::uuid, 'Test Issuer', 'admin');
select pg_temp.login('issuer');
set local role authenticated;
do $$
begin
  perform public.issue_access_code((select id from public.entitlement_products where entitlement_key = 'dm_page_v1'), 'admin_grant',
                                   null, null, null, current_setting('test.leaver')::uuid);
end $$;
reset role;
select pg_temp.logout();

do $$
begin
  delete from auth.users where id = current_setting('test.leaver')::uuid;
  if exists (select 1 from public.access_codes where issued_to_user_id = current_setting('test.leaver')::uuid) then raise exception 'FAIL holder not cleared'; end if;
  delete from auth.users where id = current_setting('test.issuer')::uuid;
  if exists (select 1 from public.access_codes where created_by = current_setting('test.issuer')::uuid) then raise exception 'FAIL created_by not cleared'; end if;
  begin
    delete from auth.users where id = current_setting('test.buyer')::uuid;  -- 已兌換訂閱代碼、仍有訂閱帳務紀錄
    raise exception 'FAIL redeemer hard-deleted';
  exception when foreign_key_violation then null;
  end;
  raise notice 'PASS account deletion: holder / issuer cleared, redeemer protected by restrict';
end $$;

rollback;
