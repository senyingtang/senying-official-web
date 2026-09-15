-- =====================================================================
-- 森映 Headless 自助建站電商平台 DB SQL v2.0
-- 0001_extensions_and_enums.sql
-- v1.0 enum 全數沿用（名稱與值不變），v2.0 新增 commerce / subscription /
-- entitlement / workspace / site builder / template / domain / AI / external enum。
-- 所有 enum 以 duplicate_object 保護，可安全重複執行。
-- =====================================================================
begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

-- ---------------------------------------------------------------------
-- v1.0 沿用
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- v2.0 Commerce / Checkout
-- ---------------------------------------------------------------------
-- 產品代碼：同時用於 access code 前綴 SYT-{CODE}-{YYYY}-{XXXXXX}
do $$ begin
  create type public.commerce_product_code as enum ('SEO','LP','ECOM','DM','AI','CUSTOM');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.billing_interval as enum ('one_time','month','year');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.checkout_session_status as enum ('open','completed','expired','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('pending','awaiting_payment','paid','fulfilled','cancelled','refunded','partially_refunded','failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending','processing','awaiting_transfer','succeeded','failed','cancelled','expired','refunded','partially_refunded');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_provider as enum ('ecpay','linepay','bank_transfer','manual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method_type as enum ('credit_card','credit_card_recurring','atm_virtual_account','web_atm','bank_transfer','linepay','manual');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.provider_environment as enum ('sandbox','production');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.refund_status as enum ('requested','approved','processing','succeeded','failed','rejected','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.webhook_processing_status as enum ('received','processing','processed','failed','ignored');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- v2.0 Subscription / Entitlement / Access Code
-- ---------------------------------------------------------------------
do $$ begin
  create type public.subscription_status as enum ('incomplete','trialing','active','past_due','cancel_scheduled','cancelled','expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.invoice_status as enum ('draft','open','paid','void','uncollectible');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.access_code_status as enum ('generated','issued','redeemed','expired','revoked');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.entitlement_status as enum ('active','suspended','expired','revoked');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- v2.0 Workspace / Site Builder / Template
-- ---------------------------------------------------------------------
do $$ begin
  create type public.workspace_member_role as enum ('owner','admin','editor','viewer');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.invitation_status as enum ('pending','accepted','revoked','expired');
exception when duplicate_object then null; end $$;
-- seo_website：SEO 形象官網（v1 自助）；landing_page：一頁式（v1 自助）；ecommerce：電商（v1 僅方案展示＋客製報價）；dm_page：活動 DM
do $$ begin
  create type public.site_type as enum ('seo_website','landing_page','ecommerce','dm_page');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.site_project_status as enum ('draft','preview','published','suspended','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.site_content_state as enum ('draft','published');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.site_field_type as enum ('text','textarea','rich_text','markdown','image','gallery','link','button','number','boolean','select','color','repeater','json');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.template_pricing_type as enum ('free','paid','plan_restricted','private');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.template_license_status as enum ('active','expired','revoked');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- v2.0 Domain / DNS / Deployment
-- ---------------------------------------------------------------------
do $$ begin
  create type public.domain_type as enum ('platform_subdomain','custom_subdomain','custom_apex');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.domain_status as enum ('pending','verifying','verified','active','failed','removed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.dns_record_type as enum ('CNAME','TXT','A','AAAA','ALIAS');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.ssl_status as enum ('not_requested','pending','provisioning','active','failed','expired');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.deployment_status as enum ('queued','building','ready','failed','cancelled','skipped');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- v2.0 SEO Article Generator / External Projects
-- ---------------------------------------------------------------------
do $$ begin
  create type public.ai_generation_status as enum ('queued','running','succeeded','failed','cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.ai_content_status as enum ('draft','in_review','approved','published','rejected','archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.ai_export_format as enum ('markdown','html','wordpress_html','json_ld');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.external_connection_status as enum ('pending_audit','discovered','connected','syncing','paused','disconnected','error');
exception when duplicate_object then null; end $$;

commit;
