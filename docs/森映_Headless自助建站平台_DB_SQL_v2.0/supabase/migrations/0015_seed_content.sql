-- =====================================================================
-- 0015_seed_content.sql
-- 初始資料（可重複執行；全部以 key / slug 查找，不寫死 UUID）
--   1. v1.0 官網 seed 沿用
--   2. 平台設定：feature flags（v1 階段）、DNS 占位設定（example.com，非正式網域）
--   3. Entitlement features / products / rules
--   4. Commerce 商品方案與價格（價格待業主確認：金額 0、is_active = false）
--   5. Subscription 方案（月繳 / 年繳，未啟用）
--   6. 金流 provider / payment methods（全部停用；只有 secret reference 名稱，沒有任何密鑰值）
--   7. 版型分類與 2 個免費草稿版型（SEO 形象官網、一頁式網頁）
--   8. DNS 教學頁草稿
--   9. 既有專案接入盤點（Hungjui / hero-booking / landlord-showcase / Mori 電商 / SEO 文章生產器）
-- 不含：真實 owner UUID、聯絡資訊、正式網域、金流商店代號與密鑰、銀行帳號。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. v1.0 seed
-- ---------------------------------------------------------------------
insert into public.cms_site_settings(setting_key, setting_value, is_public) values
('site.brand', jsonb_build_object('name','森映 Mori','tagline','把網站、App 和內容，做成真的能用的產品'), true),
('site.theme', jsonb_build_object('primary','#0F172A','secondary','#14B8A6','background','#F8FAFC','surface','#FFFFFF','text','#111827','muted','#64748B','border','#E2E8F0'), true),
('site.contact', jsonb_build_object('email', null, 'phone', null, 'address', null), true)
on conflict (setting_key) do nothing;

insert into public.cms_pages(slug, title, page_type, status, published_at) values
('home','首頁','home','published',now()),('about','關於森映','standard','draft',null),('contact','聯絡我們','contact','draft',null),('faq','常見問題','faq','draft',null),
('pricing','方案與價格','pricing','draft',null),('templates','網站版型','templates','draft',null)
on conflict (slug) do nothing;

insert into public.cms_navigation_menus(menu_key, name) values ('header','主選單'),('footer','頁尾選單') on conflict (menu_key) do nothing;
insert into public.cms_navigation_items(menu_id, label, url, sort_order)
select m.id, x.label, x.url, x.ord
from public.cms_navigation_menus m
cross join (values ('首頁','/',10),('產品與 App','/products',20),('解決方案','/solutions',30),('案例','/cases',40),('文章','/blog',50),('關於森映','/about',60),('聯絡我們','/contact',70)) x(label, url, ord)
where m.menu_key = 'header'
  and not exists (select 1 from public.cms_navigation_items i where i.menu_id = m.id and i.url = x.url);

insert into public.products(slug, name, short_description, product_type, status, published_at, sort_order) values
('brand-website','品牌官網','形象、內容與後台管理整合的品牌入口。','web','published',now(),10),
('badminton-platform','羽球排組平台','報名、排組、場次與球團管理平台。','platform','published',now(),20),
('mori-commerce','Mori 電商網站','商品、訂單、會員與內容管理的電商架構。','commerce','published',now(),30),
('tools-app','工具 App','解決單一需求、可持續迭代的工具型 App。','app','published',now(),40),
('ai-content','AI 內容與漫劇','以影音與連載內容累積品牌作品。','content','published',now(),50)
on conflict (slug) do nothing;

insert into public.services(slug, name, short_description, price_label, status, published_at, sort_order) values
('website','網站建置','品牌官網、企業網站與內容型網站。','基礎方案公開，客製需求另行評估','published',now(),10),
('app-mvp','App MVP 開發','把核心流程做成可測試、可上架的第一版產品。','依功能範圍評估','published',now(),20),
('seo-content','SEO 內容規劃','關鍵字、內容架構與持續發布流程。','提供基礎方案','published',now(),30),
('cms-system','CMS / 後台系統','讓前台內容、SEO 與資訊可自行管理。','依資料與權限範圍評估','published',now(),40)
on conflict (slug) do nothing;

insert into public.faqs(question, answer, category, sort_order, is_published)
select x.q, x.a, '首頁', x.ord, true
from (values
('專案一般需要多久？','時間取決於頁面、功能、資料整理與審核流程，確認需求後會提供分階段時程。',10),
('可以只做部分功能嗎？','可以，會先整理核心流程，再以 MVP 或分階段方式上線。',20),
('後台內容可以自行修改嗎？','可以，CMS 可管理頁面區塊、產品、服務、案例、文章、FAQ 與 SEO 資訊。',30),
('如何開始討論專案？','先提供目標、目前素材與希望解決的問題，再安排需求討論。',40)
) x(q, a, ord)
where not exists (select 1 from public.faqs f where f.question = x.q);

-- ---------------------------------------------------------------------
-- 2. 平台設定（非公開）
-- ---------------------------------------------------------------------
insert into public.cms_site_settings(setting_key, setting_value, is_public) values
('platform.release_phase', jsonb_build_object(
   'phase', 'v1',
   'v1', '模板制自助建站（SEO 形象官網、一頁式網頁）；每次購買 1 個網站；只建立網站資料與預覽，不公開發布；SEO 文章生產器內部使用；金流介面保留不串接',
   'v2', '森映平台子網域；依方案開放多網站；SEO 文章生產器開放客戶',
   'v3', '客戶自訂網域 / DNS / 轉址'), false),
('platform.feature_flags', jsonb_build_object(
   'site_builder.self_serve', true,
   'site_builder.public_publish', false,
   'site_builder.platform_subdomain', false,
   'site_builder.custom_domain', false,
   'ai_article_generator.customer_access', false,
   'template_marketplace.paid_templates', false,
   'commerce.checkout_enabled', false,
   'commerce.live_payments', false), false),
-- example.com 為 RFC 2606 保留網域，正式值由 owner 於後台設定
('platform.dns', jsonb_build_object(
   'cname_target', 'cname.sites.example.com',
   'apex_a_records', '[]'::jsonb,
   'platform_subdomain_suffix', 'sites.example.com',
   'verification_txt_prefix', '_syt-verify',
   'default_ttl', 3600,
   'is_placeholder', true), false),
('platform.access_code', jsonb_build_object(
   'format', 'SYT-{PRODUCT_CODE}-{YYYY}-{XXXXXX}',
   'alphabet', 'ABCDEFGHJKMNPQRSTUVWXYZ123456789',
   'product_codes', jsonb_build_object('SEO','SEO 形象官網','LP','一頁式網頁','ECOM','電商網站','DM','活動 DM / 宣傳頁','AI','SEO 文章生產器','CUSTOM','客製專案'),
   'redeem_rate_limit', '10 failures / 15 minutes per user'), false)
on conflict (setting_key) do nothing;

-- ---------------------------------------------------------------------
-- 3. Entitlements
-- ---------------------------------------------------------------------
insert into public.entitlement_features(feature_key, name, description, value_type, unit, sort_order) values
('site.create', '建立網站專案', '可建立的網站數量（v1 每次購買 1 個）', 'quota', 'site', 10),
('site.type.seo_website', 'SEO 形象官網', '可建立 SEO 形象官網類型網站', 'boolean', null, 20),
('site.type.landing_page', '一頁式網頁', '可建立一頁式網頁', 'boolean', null, 30),
('site.type.ecommerce', '電商網站', '可建立電商網站（v1 客製報價後由森映開通）', 'boolean', null, 40),
('site.type.dm_page', '活動 DM / 宣傳頁', '可建立活動 DM / 宣傳頁', 'boolean', null, 50),
('site.preview', '網站預覽', '可產生預覽連結', 'boolean', null, 60),
('site.platform_subdomain', '平台子網域', '可使用森映平台子網域發布（v2）', 'boolean', null, 70),
('site.custom_domain', '自訂網域', '可綁定客戶自訂網域（v3）', 'limit', 'domain', 80),
('template.free', '免費版型', '可套用免費版型', 'boolean', null, 90),
('template.premium', '方案限定版型', '可套用方案限定版型', 'boolean', null, 100),
('workspace.members', 'Workspace 成員數', 'Workspace 可加入的成員上限', 'limit', 'member', 110),
('ai.article.generate', 'SEO 文章生成', 'SEO 文章生產器生成額度', 'quota', 'article', 120),
('ai.article.export', 'SEO 文章匯出', '匯出 Markdown / HTML / WordPress HTML / JSON-LD', 'boolean', null, 130)
on conflict (feature_key) do nothing;

insert into public.entitlement_products(entitlement_key, product_code, name, description, default_duration_days, code_valid_days, metadata) values
('seo_website_v1', 'SEO', 'SEO 形象官網（v1）', '模板制 SEO 形象官網，每組代碼 1 個網站', null, 365, '{"pending_business_confirmation":["default_duration_days","code_valid_days"]}'),
('landing_page_v1', 'LP', '一頁式網頁（v1）', '模板制一頁式網頁，每組代碼 1 個網站', null, 365, '{"pending_business_confirmation":["default_duration_days","code_valid_days"]}'),
('ecommerce_custom', 'ECOM', '電商網站（客製）', 'v1 僅方案展示，實際建站走客製報價', null, null, '{"self_serve":false}'),
('dm_page_v1', 'DM', '活動 DM / 宣傳頁', '活動頁權限（v1 未開放自助）', null, 365, '{"self_serve":false}'),
('ai_article_generator', 'AI', 'SEO 文章生產器', 'v1 內部使用；v2 開放客戶', null, 365, '{"pending_business_confirmation":["quota_amount"]}'),
('custom_project', 'CUSTOM', '客製專案', '客製專案權限，由森映 admin 設定', null, null, '{"self_serve":false}')
on conflict (entitlement_key) do nothing;

insert into public.entitlement_feature_rules(entitlement_product_id, feature_id, is_enabled, limit_value, quota_amount, quota_period)
select ep.id, f.id, true, x.limit_value, x.quota_amount, x.quota_period
from (values
  ('seo_website_v1','site.create',null,1,'lifetime'),
  ('seo_website_v1','site.type.seo_website',null,null,'lifetime'),
  ('seo_website_v1','site.preview',null,null,'lifetime'),
  ('seo_website_v1','template.free',null,null,'lifetime'),
  ('seo_website_v1','workspace.members',3,null,'lifetime'),
  ('landing_page_v1','site.create',null,1,'lifetime'),
  ('landing_page_v1','site.type.landing_page',null,null,'lifetime'),
  ('landing_page_v1','site.preview',null,null,'lifetime'),
  ('landing_page_v1','template.free',null,null,'lifetime'),
  ('landing_page_v1','workspace.members',2,null,'lifetime'),
  ('ecommerce_custom','site.create',null,1,'lifetime'),
  ('ecommerce_custom','site.type.ecommerce',null,null,'lifetime'),
  ('ecommerce_custom','site.preview',null,null,'lifetime'),
  ('ecommerce_custom','workspace.members',5,null,'lifetime'),
  ('dm_page_v1','site.create',null,1,'lifetime'),
  ('dm_page_v1','site.type.dm_page',null,null,'lifetime'),
  ('dm_page_v1','site.preview',null,null,'lifetime'),
  ('ai_article_generator','ai.article.generate',null,30,'month'),
  ('ai_article_generator','ai.article.export',null,null,'lifetime'),
  ('custom_project','site.preview',null,null,'lifetime'),
  ('custom_project','workspace.members',10,null,'lifetime')
) x(entitlement_key, feature_key, limit_value, quota_amount, quota_period)
join public.entitlement_products ep on ep.entitlement_key = x.entitlement_key
join public.entitlement_features f on f.feature_key = x.feature_key
on conflict (entitlement_product_id, feature_id) do nothing;

-- ---------------------------------------------------------------------
-- 4. Commerce 商品方案（草稿；價格待確認）
-- ---------------------------------------------------------------------
insert into public.commerce_products(product_code, sku, slug, name, short_description, product_kind, site_type, is_self_serve, requires_quote, entitlement_product_id, status, sort_order, metadata)
select x.code::public.commerce_product_code, x.sku, x.slug, x.name, x.descr, x.kind, x.site_type::public.site_type, x.self_serve, x.quote, ep.id, 'draft', x.ord,
       jsonb_build_object('price_tbd', true)
from (values
  ('SEO','seo-website-plan','seo-website-plan','SEO 形象官網方案','模板制 SEO 形象官網，購買後取得權限代碼建立 1 個網站','site_plan','seo_website',true,false,'seo_website_v1',10),
  ('LP','landing-page-plan','landing-page-plan','一頁式網頁方案','模板制一頁式網頁，購買後取得權限代碼建立 1 個網站','site_plan','landing_page',true,false,'landing_page_v1',20),
  ('ECOM','ecommerce-website-quote','ecommerce-website-quote','電商網站（客製報價）','商品、金流、訂單與會員功能，依需求評估報價','custom_quote','ecommerce',false,true,'ecommerce_custom',30),
  ('DM','campaign-dm-page','campaign-dm-page','活動 DM / 宣傳頁','活動宣傳頁（v1 洽詢）','site_plan','dm_page',false,true,'dm_page_v1',40),
  ('AI','seo-article-generator','seo-article-generator','SEO 文章生產器','品牌資料、關鍵字、FAQ Schema 與多格式匯出（v2 開放）','ai_tool',null,false,false,'ai_article_generator',50),
  ('CUSTOM','custom-project-quote','custom-project-quote','客製專案','客製網站、系統與 App 開發','custom_quote',null,false,true,'custom_project',60)
) x(code, sku, slug, name, descr, kind, site_type, self_serve, quote, entitlement_key, ord)
join public.entitlement_products ep on ep.entitlement_key = x.entitlement_key
on conflict (sku) do nothing;

insert into public.commerce_product_prices(product_id, price_key, name, billing_interval, interval_count, currency, amount_cents, is_default, is_active, metadata)
select p.id, x.price_key, x.name, x.interval::public.billing_interval, 1, 'TWD', 0, x.is_default, false, jsonb_build_object('price_tbd', true)
from (values
  ('seo-website-plan','seo_website_one_time','一次購買','one_time',true),
  ('seo-website-plan','seo_website_monthly','月繳','month',false),
  ('seo-website-plan','seo_website_yearly','年繳','year',false),
  ('landing-page-plan','landing_page_one_time','一次購買','one_time',true),
  ('landing-page-plan','landing_page_monthly','月繳','month',false),
  ('landing-page-plan','landing_page_yearly','年繳','year',false),
  ('seo-article-generator','ai_article_monthly','月繳','month',true),
  ('seo-article-generator','ai_article_yearly','年繳','year',false)
) x(sku, price_key, name, interval, is_default)
join public.commerce_products p on p.sku = x.sku
on conflict (price_key) do nothing;

-- ---------------------------------------------------------------------
-- 5. Subscription 方案（未啟用）
-- ---------------------------------------------------------------------
insert into public.subscription_plans(plan_key, name, description, product_code, commerce_product_id, entitlement_product_id, site_type, max_site_projects, is_public, is_active, sort_order)
select x.plan_key, x.name, x.descr, x.code::public.commerce_product_code, p.id, ep.id, x.site_type::public.site_type, x.max_sites, false, false, x.ord
from (values
  ('seo_website_subscription','SEO 形象官網訂閱','月繳 / 年繳，含網站維運權限','SEO','seo-website-plan','seo_website_v1','seo_website',1,10),
  ('landing_page_subscription','一頁式網頁訂閱','月繳 / 年繳，含網站維運權限','LP','landing-page-plan','landing_page_v1','landing_page',1,20),
  ('ai_article_generator_subscription','SEO 文章生產器訂閱','月繳 / 年繳，依方案提供文章額度','AI','seo-article-generator','ai_article_generator',null,0,30)
) x(plan_key, name, descr, code, sku, entitlement_key, site_type, max_sites, ord)
join public.commerce_products p on p.sku = x.sku
join public.entitlement_products ep on ep.entitlement_key = x.entitlement_key
on conflict (plan_key) do nothing;

-- 綠界定期定額：月繳 PeriodType=M、Frequency=1、ExecTimes 上限 99；年繳 PeriodType=Y、ExecTimes 上限 9
insert into public.subscription_plan_prices(plan_id, commerce_product_price_id, billing_interval, interval_count, ecpay_period_type, ecpay_frequency, ecpay_exec_times, is_active)
select sp.id, pr.id, pr.billing_interval, pr.interval_count,
       case pr.billing_interval when 'month' then 'M' else 'Y' end, 1,
       case pr.billing_interval when 'month' then 99 else 9 end, false
from (values
  ('seo_website_subscription','seo_website_monthly'),('seo_website_subscription','seo_website_yearly'),
  ('landing_page_subscription','landing_page_monthly'),('landing_page_subscription','landing_page_yearly'),
  ('ai_article_generator_subscription','ai_article_monthly'),('ai_article_generator_subscription','ai_article_yearly')
) x(plan_key, price_key)
join public.subscription_plans sp on sp.plan_key = x.plan_key
join public.commerce_product_prices pr on pr.price_key = x.price_key
on conflict (commerce_product_price_id) do nothing;

insert into public.subscription_plan_features(plan_id, feature_id, is_enabled, limit_value, quota_amount, quota_period, display_label, sort_order)
select sp.id, r.feature_id, r.is_enabled, r.limit_value, r.quota_amount, r.quota_period, f.name, f.sort_order
from public.subscription_plans sp
join public.entitlement_feature_rules r on r.entitlement_product_id = sp.entitlement_product_id
join public.entitlement_features f on f.id = r.feature_id
on conflict (plan_id, feature_id) do nothing;

-- ---------------------------------------------------------------------
-- 6. 金流（全部停用；secret_refs 只放名稱，實際值存 Supabase Vault / Edge Function Secrets）
-- ---------------------------------------------------------------------
insert into public.commerce_payment_provider_configs(provider, environment, is_enabled, display_name, api_base_url, public_config, secret_refs, config_schema)
values
('ecpay', 'sandbox', false, '綠界科技（測試）', 'https://payment-stage.ecpay.com.tw',
  '{"notify_path":"/api/payments/ecpay/notify","client_back_path":"/checkout/result","payment_info_path":"/api/payments/ecpay/payment-info","period_notify_path":"/api/payments/ecpay/period-notify","encrypt_type":1,"language":"zh-TW"}',
  '{"hash_key":"vault:ecpay_sandbox_hash_key","hash_iv":"vault:ecpay_sandbox_hash_iv"}',
  '[{"key":"merchant_id","label":"特店編號 MerchantID","type":"text","required":true,"is_sensitive":false},
    {"key":"hash_key","label":"HashKey（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true},
    {"key":"hash_iv","label":"HashIV（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true},
    {"key":"notify_path","label":"付款結果通知路徑 ReturnURL","type":"path","required":true,"is_sensitive":false},
    {"key":"client_back_path","label":"返回商店路徑 ClientBackURL","type":"path","required":false,"is_sensitive":false}]'),
('ecpay', 'production', false, '綠界科技（正式）', 'https://payment.ecpay.com.tw',
  '{"notify_path":"/api/payments/ecpay/notify","client_back_path":"/checkout/result","payment_info_path":"/api/payments/ecpay/payment-info","period_notify_path":"/api/payments/ecpay/period-notify","encrypt_type":1,"language":"zh-TW"}',
  '{"hash_key":"vault:ecpay_production_hash_key","hash_iv":"vault:ecpay_production_hash_iv"}',
  '[{"key":"merchant_id","label":"特店編號 MerchantID","type":"text","required":true,"is_sensitive":false},
    {"key":"hash_key","label":"HashKey（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true},
    {"key":"hash_iv","label":"HashIV（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true}]'),
('linepay', 'sandbox', false, 'LINE Pay（測試）', 'https://sandbox-api-pay.line.me',
  '{"confirm_path":"/api/payments/linepay/confirm","cancel_path":"/checkout/result","currency":"TWD"}',
  '{"channel_secret":"vault:linepay_sandbox_channel_secret"}',
  '[{"key":"merchant_id","label":"Channel ID","type":"text","required":true,"is_sensitive":false},
    {"key":"channel_secret","label":"Channel Secret（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true}]'),
('linepay', 'production', false, 'LINE Pay（正式）', 'https://api-pay.line.me',
  '{"confirm_path":"/api/payments/linepay/confirm","cancel_path":"/checkout/result","currency":"TWD"}',
  '{"channel_secret":"vault:linepay_production_channel_secret"}',
  '[{"key":"merchant_id","label":"Channel ID","type":"text","required":true,"is_sensitive":false},
    {"key":"channel_secret","label":"Channel Secret（Vault 參照名稱）","type":"secret_ref","required":true,"is_sensitive":true}]'),
('bank_transfer', 'production', false, '銀行轉帳', null,
  '{"require_last5":true,"manual_review":true}', '{}',
  '[{"key":"accounts","label":"收款帳戶（commerce_bank_transfer_accounts）","type":"relation","required":true,"is_sensitive":false},
    {"key":"require_last5","label":"要求填寫匯款帳號後五碼","type":"boolean","required":false,"is_sensitive":false}]')
on conflict (provider, environment) do nothing;

insert into public.commerce_payment_methods(method_key, provider, method_type, provider_config_id, display_name, description, is_enabled,
  supports_one_time, supports_recurring, supported_intervals, payment_deadline_minutes, provider_method_code, config_schema, public_settings, sort_order)
select x.method_key, x.provider::public.payment_provider, x.method_type::public.payment_method_type, c.id, x.display_name, x.descr, false,
       x.one_time, x.recurring, x.intervals::public.billing_interval[], x.deadline, x.provider_code, x.schema::jsonb, x.settings::jsonb, x.ord
from (values
  ('ecpay_credit_card','ecpay','credit_card','信用卡','綠界信用卡一次付清',true,false,'{one_time}',null,'Credit',
   '[{"key":"allow_installments","label":"開放分期","type":"boolean"},{"key":"installment_options","label":"分期期數","type":"multi_select","options":[3,6,12]}]',
   '{"allow_installments":false}',10),
  ('ecpay_credit_card_recurring','ecpay','credit_card_recurring','信用卡定期定額','月繳 / 年繳自動扣款',false,true,'{month,year}',null,'Credit',
   '[{"key":"retry_notice","label":"扣款失敗通知","type":"boolean"}]','{"retry_notice":true}',20),
  ('ecpay_atm','ecpay','atm_virtual_account','ATM 虛擬帳號','取號後於期限內轉帳',true,false,'{one_time}',4320,'ATM',
   '[{"key":"expire_date_days","label":"繳費期限（天）","type":"number","min":1,"max":60}]','{"expire_date_days":3}',30),
  ('ecpay_webatm','ecpay','web_atm','網路 ATM','使用晶片讀卡機即時轉帳',true,false,'{one_time}',null,'WebATM','[]','{}',40),
  ('bank_transfer','bank_transfer','bank_transfer','銀行轉帳','轉帳後填寫後五碼，人工對帳',true,false,'{one_time}',4320,null,
   '[{"key":"require_last5","label":"要求填寫後五碼","type":"boolean"}]','{"require_last5":true}',50),
  ('linepay','linepay','linepay','LINE Pay','使用 LINE Pay 付款',true,false,'{one_time}',null,'linepay','[]','{}',60)
) x(method_key, provider, method_type, display_name, descr, one_time, recurring, intervals, deadline, provider_code, schema, settings, ord)
left join public.commerce_payment_provider_configs c
  on c.provider = x.provider::public.payment_provider
 and c.environment = case when x.provider = 'bank_transfer' then 'production' else 'sandbox' end::public.provider_environment
on conflict (method_key) do nothing;

-- ---------------------------------------------------------------------
-- 7. 版型分類與免費草稿版型
-- ---------------------------------------------------------------------
insert into public.site_template_categories(slug, name, description, sort_order) values
('seo-website','SEO 形象官網','適合品牌、服務業、在地店家的多頁式官網',10),
('landing-page','一頁式網頁','活動、單一服務或產品導購的一頁式網站',20),
('ecommerce','電商網站','商品、購物車與訂單（v1 客製報價）',30),
('campaign','活動 DM / 宣傳頁','短期活動與宣傳頁',40)
on conflict (slug) do nothing;

do $$
declare
  v_spec jsonb;
  v_template_id uuid;
  v_version_id uuid;
  v_page jsonb;
  v_section jsonb;
  v_field jsonb;
  v_field_row record;
  v_page_id uuid;
  v_section_id uuid;
begin
  for v_spec in select value from jsonb_array_elements($json$[
  {
    "template_key": "seo_starter", "slug": "seo-starter", "name": "SEO 形象官網｜標準版", "site_type": "seo_website", "category": "seo-website",
    "short_description": "首頁、關於、服務、聯絡與隱私權頁，內建 SEO 欄位與 LocalBusiness Schema",
    "astro_entry_path": "src/templates/seo-starter/index.astro",
    "theme_defaults": {"theme_variant": "default", "color_tokens": {"primary": "#0F172A", "secondary": "#14B8A6", "background": "#F8FAFC", "surface": "#FFFFFF", "text": "#111827"}, "typography": {"heading": "Noto Sans TC", "body": "Noto Sans TC"}},
    "default_content": {"pages": {"home": {"hero": {"heading": "在這裡寫下你的品牌主張", "description": "用一兩句話說明你提供什麼服務、適合誰。", "primary_cta": {"label": "聯絡我們", "href": "/contact"}}}}},
    "pages": [
      {"page_key": "home", "page_type": "home", "title": "首頁", "path": "/", "sort_order": 10,
       "default_seo": {"seo_title": "品牌名稱｜主要服務關鍵字", "meta_description": "用 80–160 字說明品牌服務、地區與特色。", "h1": "在這裡寫下你的品牌主張"},
       "sections": [
         {"section_key": "hero", "section_type": "hero", "name": "主視覺", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "heading", "label": "主標題（H1）", "field_type": "text", "is_required": true, "validation_schema": {"maxLength": 60}},
           {"field_key": "description", "label": "副標說明", "field_type": "textarea", "validation_schema": {"maxLength": 200}},
           {"field_key": "image", "label": "主視覺圖片", "field_type": "image", "help_text": "建議 1600×900，WebP"},
           {"field_key": "primary_cta", "label": "主要按鈕", "field_type": "button"}]},
         {"section_key": "services", "section_type": "feature_grid", "name": "服務項目", "sort_order": 20, "fields": [
           {"field_key": "title", "label": "區塊標題（H2）", "field_type": "text", "is_required": true},
           {"field_key": "items", "label": "服務卡片", "field_type": "repeater", "validation_schema": {"maxItems": 6, "item": {"title": "text", "description": "textarea", "icon": "text"}}}]},
         {"section_key": "faq", "section_type": "faq", "name": "常見問題", "sort_order": 30, "fields": [
           {"field_key": "title", "label": "區塊標題（H2）", "field_type": "text"},
           {"field_key": "items", "label": "問答", "field_type": "repeater", "help_text": "會自動輸出 FAQPage Schema", "validation_schema": {"maxItems": 10, "item": {"question": "text", "answer": "textarea"}}}]},
         {"section_key": "cta", "section_type": "cta_banner", "name": "行動呼籲", "sort_order": 40, "fields": [
           {"field_key": "heading", "label": "標題", "field_type": "text"},
           {"field_key": "button", "label": "按鈕", "field_type": "button"}]}]},
      {"page_key": "about", "page_type": "standard", "title": "關於我們", "path": "/about", "sort_order": 20,
       "default_seo": {"seo_title": "關於我們｜品牌名稱", "h1": "關於我們"},
       "sections": [
         {"section_key": "story", "section_type": "rich_text", "name": "品牌故事", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "heading", "label": "標題（H1）", "field_type": "text", "is_required": true},
           {"field_key": "body", "label": "內容", "field_type": "markdown"}]}]},
      {"page_key": "services", "page_type": "standard", "title": "服務項目", "path": "/services", "sort_order": 30,
       "default_seo": {"seo_title": "服務項目｜品牌名稱", "h1": "服務項目"},
       "sections": [
         {"section_key": "service_list", "section_type": "service_list", "name": "服務列表", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "heading", "label": "標題（H1）", "field_type": "text", "is_required": true},
           {"field_key": "items", "label": "服務", "field_type": "repeater", "validation_schema": {"maxItems": 12, "item": {"title": "text", "description": "markdown", "image": "image", "price_label": "text"}}}]}]},
      {"page_key": "contact", "page_type": "contact", "title": "聯絡我們", "path": "/contact", "sort_order": 40,
       "default_seo": {"seo_title": "聯絡我們｜品牌名稱", "h1": "聯絡我們"},
       "sections": [
         {"section_key": "contact_info", "section_type": "contact", "name": "聯絡資訊與表單", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "heading", "label": "標題（H1）", "field_type": "text", "is_required": true},
           {"field_key": "description", "label": "說明", "field_type": "textarea"},
           {"field_key": "map_embed_url", "label": "Google 地圖嵌入網址", "field_type": "link"}]}]},
      {"page_key": "privacy", "page_type": "legal", "title": "隱私權政策", "path": "/privacy", "sort_order": 90,
       "default_seo": {"seo_title": "隱私權政策｜品牌名稱", "h1": "隱私權政策"},
       "sections": [
         {"section_key": "legal_body", "section_type": "rich_text", "name": "條款內容", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "body", "label": "內容", "field_type": "markdown"}]}]}
    ]
  },
  {
    "template_key": "landing_basic", "slug": "landing-basic", "name": "一頁式網頁｜轉換版", "site_type": "landing_page", "category": "landing-page",
    "short_description": "主視覺、賣點、見證、FAQ 與表單集中在單一頁面",
    "astro_entry_path": "src/templates/landing-basic/index.astro",
    "theme_defaults": {"theme_variant": "default", "color_tokens": {"primary": "#0F172A", "secondary": "#14B8A6"}, "typography": {"heading": "Noto Sans TC", "body": "Noto Sans TC"}},
    "default_content": {"pages": {"home": {"hero": {"heading": "一句話說清楚你要賣的東西", "primary_cta": {"label": "立即詢問", "href": "#contact"}}}}},
    "pages": [
      {"page_key": "home", "page_type": "landing", "title": "首頁", "path": "/", "sort_order": 10,
       "default_seo": {"seo_title": "活動或產品名稱｜主要關鍵字", "meta_description": "用 80–160 字說明產品、優惠與行動。", "h1": "一句話說清楚你要賣的東西"},
       "sections": [
         {"section_key": "hero", "section_type": "hero", "name": "主視覺", "is_required": true, "sort_order": 10, "fields": [
           {"field_key": "heading", "label": "主標題（H1）", "field_type": "text", "is_required": true, "validation_schema": {"maxLength": 60}},
           {"field_key": "description", "label": "副標說明", "field_type": "textarea"},
           {"field_key": "image", "label": "主視覺圖片", "field_type": "image"},
           {"field_key": "primary_cta", "label": "主要按鈕", "field_type": "button"}]},
         {"section_key": "benefits", "section_type": "feature_grid", "name": "賣點", "sort_order": 20, "fields": [
           {"field_key": "title", "label": "區塊標題（H2）", "field_type": "text"},
           {"field_key": "items", "label": "賣點卡片", "field_type": "repeater", "validation_schema": {"maxItems": 6, "item": {"title": "text", "description": "textarea"}}}]},
         {"section_key": "testimonials", "section_type": "testimonials", "name": "顧客見證", "sort_order": 30, "fields": [
           {"field_key": "items", "label": "見證", "field_type": "repeater", "help_text": "請使用真實、可提供來源的見證", "validation_schema": {"maxItems": 6, "item": {"name": "text", "quote": "textarea"}}}]},
         {"section_key": "faq", "section_type": "faq", "name": "常見問題", "sort_order": 40, "fields": [
           {"field_key": "items", "label": "問答", "field_type": "repeater", "validation_schema": {"maxItems": 8, "item": {"question": "text", "answer": "textarea"}}}]},
         {"section_key": "contact", "section_type": "contact_form", "name": "詢問表單", "is_required": true, "sort_order": 50, "fields": [
           {"field_key": "heading", "label": "表單標題", "field_type": "text", "is_required": true},
           {"field_key": "anchor_id", "label": "錨點 ID", "field_type": "text", "is_customer_editable": false, "default_value": "contact"}]}]}
    ]
  }
  ]$json$::jsonb)
  loop
    insert into public.site_templates(template_key, slug, name, short_description, site_type, pricing_type, status, sort_order)
    values (v_spec ->> 'template_key', v_spec ->> 'slug', v_spec ->> 'name', v_spec ->> 'short_description',
            (v_spec ->> 'site_type')::public.site_type, 'free', 'draft', 10)
    on conflict (template_key) do nothing;
    select id into v_template_id from public.site_templates where template_key = (v_spec ->> 'template_key')::citext;

    insert into public.site_template_category_links(template_id, category_id)
    select v_template_id, c.id from public.site_template_categories c where c.slug = (v_spec ->> 'category')::citext
    on conflict do nothing;

    if exists (select 1 from public.site_template_versions where template_id = v_template_id and version = '1.0.0') then
      continue;
    end if;

    insert into public.site_template_versions(template_id, version, status, astro_entry_path, schema_json, default_content_json, theme_defaults_json, changelog)
    values (v_template_id, '1.0.0', 'draft', v_spec ->> 'astro_entry_path',
            jsonb_build_object('pages', v_spec -> 'pages'), v_spec -> 'default_content', v_spec -> 'theme_defaults', '初始版本（草稿，待設計審核後發布）')
    returning id into v_version_id;
    update public.site_templates set latest_version_id = v_version_id where id = v_template_id;

    for v_page in select value from jsonb_array_elements(v_spec -> 'pages') loop
      insert into public.site_template_pages(template_version_id, page_key, page_type, title, path, default_seo, sort_order)
      values (v_version_id, v_page ->> 'page_key', v_page ->> 'page_type', v_page ->> 'title', v_page ->> 'path',
              coalesce(v_page -> 'default_seo', '{}'::jsonb), (v_page ->> 'sort_order')::int)
      returning id into v_page_id;
      for v_section in select value from jsonb_array_elements(v_page -> 'sections') loop
        insert into public.site_template_sections(template_version_id, template_page_id, section_key, section_type, name, is_required, sort_order)
        values (v_version_id, v_page_id, v_section ->> 'section_key', v_section ->> 'section_type', v_section ->> 'name',
                coalesce((v_section ->> 'is_required')::boolean, false), (v_section ->> 'sort_order')::int)
        returning id into v_section_id;
        for v_field_row in select e.value as field, e.ordinality as ord from jsonb_array_elements(v_section -> 'fields') with ordinality e loop
          v_field := v_field_row.field;
          insert into public.site_template_fields(template_version_id, template_section_id, field_key, label, field_type, is_required,
            is_customer_editable, help_text, validation_schema, default_value, sort_order)
          values (v_version_id, v_section_id, v_field ->> 'field_key', v_field ->> 'label', (v_field ->> 'field_type')::public.site_field_type,
            coalesce((v_field ->> 'is_required')::boolean, false), coalesce((v_field ->> 'is_customer_editable')::boolean, true),
            v_field ->> 'help_text', coalesce(v_field -> 'validation_schema', '{}'::jsonb), v_field -> 'default_value',
            (v_field_row.ord * 10)::int);
        end loop;
      end loop;
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 8. DNS 教學頁（草稿，需人工確認各網域商介面後發布）
-- ---------------------------------------------------------------------
insert into public.site_dns_provider_guides(provider_key, provider_name, title, summary, body_markdown, supports_cname_flattening, supports_alias_record, sort_order) values
('generic', '一般網域商', '如何把自訂網域接到森映網站', '適用大多數網域註冊商的通用步驟',
 E'## 建議做法\n1. 優先使用 **www 子網域**（例如 www.你的網域.com），設定一筆 CNAME 即可。\n2. 在森映後台新增網域後，複製系統產生的 CNAME 與 TXT 記錄。\n3. 到網域商 DNS 管理頁新增記錄，儲存後回後台按「檢查 DNS」。\n\n## 裸網域（沒有 www）\n- 網域商支援 ALIAS / ANAME / CNAME Flattening：主機填 @，指向平台目標。\n- 不支援：使用系統提供的 A 記錄，或設定網址轉址到 www。\n\n## 注意\n- 不要刪除 MX 記錄，避免 Email 收不到信。\n- DNS 生效可能需要數分鐘到 48 小時。', false, false, 10),
('cloudflare', 'Cloudflare', 'Cloudflare DNS 設定教學', 'Cloudflare 支援 CNAME Flattening，可直接讓裸網域使用 CNAME',
 E'## 步驟\n1. 登入 Cloudflare → 選擇網域 → DNS → Records。\n2. Add record：Type 選 CNAME，Name 填 www，Target 填森映後台顯示的平台目標。\n3. 驗證期間 Proxy status 請先設為 **DNS only**（灰色雲朵）。\n4. 新增 TXT：Name 填後台顯示的驗證主機，Content 填驗證碼。\n5. 回森映後台按「檢查 DNS」，驗證與 SSL 完成後再視需要開啟 Proxy。', true, false, 20),
('godaddy', 'GoDaddy', 'GoDaddy DNS 設定教學', '使用 www CNAME，裸網域以 Forwarding 轉址到 www',
 E'## 步驟\n1. 登入 GoDaddy → 我的產品 → 網域 → DNS。\n2. 新增 CNAME：名稱 www，值填平台目標。\n3. 新增 TXT：名稱填驗證主機（不含網域本身），值填驗證碼。\n4. 裸網域：在「轉寄（Forwarding）」設定 301 永久轉址到 https://www.你的網域。\n5. 回森映後台按「檢查 DNS」。', false, false, 30),
('hinet', '中華電信 HiNet', '中華電信 HiNet 網域 DNS 設定教學', 'HiNet 網域管理介面設定 CNAME 與 TXT',
 E'## 步驟\n1. 登入中華電信域名管理系統 → 選擇網域 → DNS 設定。\n2. 新增 CNAME：主機名稱 www，指向平台目標。\n3. 新增 TXT：主機名稱填驗證主機，內容填驗證碼。\n4. 若介面不支援裸網域 CNAME，請使用 www 並設定轉址。\n5. 回森映後台按「檢查 DNS」。\n\n> 介面名稱可能隨系統更新而不同，發布前請再確認。', false, false, 40)
on conflict (provider_key) do nothing;

-- ---------------------------------------------------------------------
-- 9. 既有專案接入盤點（僅盤點資料；未讀取 .env；Mori 電商與 SEO 文章生產器為 pending audit）
-- ---------------------------------------------------------------------
insert into public.external_project_connections(connection_key, name, project_kind, framework, local_path_hint, has_git, has_env, has_supabase,
  status, audit_status, cms_integration_mode, audit_notes, metadata)
values
('hungjui_site', 'Hungjui 形象官網', 'brand_website', 'astro', 'D:\project\hungjui-site', true, true, false,
 'discovered', 'partially_audited', 'none',
 '來源：docs/project-audit/Hungjui_形象官網。Astro 5 + @astrojs/sitemap + sharp；內容在 src/data（site.json、products.ts、articles.ts）。important-paths 顯示 .env / .env.local 不存在、僅有 .env.example，HasEnv 需複核。',
 '{"source":"docs/project-audit","content_sources":["src/data/site.json","src/data/products.ts","src/data/articles.ts"],"has_wrangler_dir":true,"next_step":"建立 cms_mappings：pages / products / articles"}'),
('hero_booking', 'hero-booking（monorepo 根目錄）', 'booking_app', 'nextjs_monorepo', 'C:\Users\eric0\OneDrive\桌面\森映堂\hero-booking', true, false, false,
 'discovered', 'partially_audited', 'none',
 '來源：docs/project-audit/FOUND_PROJECTS_DETAILED.txt。根目錄 Framework unknown，Next.js app 位於 apps/web。.claude/worktrees 為開發工作樹，不列入接入。',
 '{"source":"docs/project-audit","apps":["apps/web"]}'),
('hero_booking_web', 'hero-booking / apps/web', 'booking_app', 'nextjs', 'C:\Users\eric0\OneDrive\桌面\森映堂\hero-booking\apps\web', null, true, true,
 'discovered', 'partially_audited', 'none',
 '來源：docs/project-audit/FOUND_PROJECTS_DETAILED.txt。Next.js、已使用 Supabase；Git 由 monorepo 根目錄管理。',
 '{"source":"docs/project-audit","parent_connection_key":"hero_booking"}'),
('landlord_showcase', 'landlord-showcase', 'showcase_app', 'nextjs', 'C:\Users\eric0\OneDrive\桌面\森映堂\landlord-system\docs\landlord-showcase-desktop-v1\landlord-showcase', true, true, true,
 'discovered', 'partially_audited', 'none',
 '來源：docs/project-audit/FOUND_PROJECTS_DETAILED.txt。Next.js、已使用 Supabase。',
 '{"source":"docs/project-audit"}'),
('mori_ecommerce_site', 'Mori 電商官網', 'ecommerce_website', 'unknown', null, null, null, null,
 'pending_audit', 'pending_audit', 'none',
 '本次盤點未明確找到專案路徑，不假設不存在。需人工確認正式專案位置後再盤點。',
 '{"candidate_paths_unconfirmed":["D:\\project\\e-commerce OS","D:\\project\\mori-website"],"candidate_note":"僅為唯讀列目錄觀察到的候選，尚未確認哪一個是 Mori 電商官網"}'),
('seo_content_os', 'SEO 文章生產器', 'seo_tool', 'unknown', 'D:\project\seo-content-os', null, null, null,
 'pending_audit', 'pending_audit', 'none',
 '可能路徑：D:\project\seo-content-os（使用者提供）。尚未完整盤點，框架、Supabase 與 schema 需確認後再與 0009 SEO 文章生產器資料表對應。',
 '{"path_source":"user_provided_possible_location","next_step":"盤點既有 supabase/migrations 與 0009 ai_article_* 的對應關係"}')
on conflict (connection_key) do nothing;

commit;
