begin;
insert into public.cms_site_settings(setting_key,setting_value,is_public) values
('site.brand',jsonb_build_object('name','森映 Mori','tagline','把網站、App 和內容，做成真的能用的產品'),true),
('site.theme',jsonb_build_object('primary','#0F172A','secondary','#14B8A6','background','#F8FAFC','surface','#FFFFFF','text','#111827','muted','#64748B','border','#E2E8F0'),true),
('site.contact',jsonb_build_object('email',null,'phone',null,'address',null),true)
on conflict(setting_key) do nothing;

insert into public.cms_pages(slug,title,page_type,status,published_at) values
('home','首頁','home','published',now()),('about','關於森映','standard','draft',null),('contact','聯絡我們','contact','draft',null),('faq','常見問題','faq','draft',null)
on conflict(slug) do nothing;

insert into public.cms_navigation_menus(menu_key,name) values('header','主選單'),('footer','頁尾選單') on conflict(menu_key) do nothing;
with m as(select id from public.cms_navigation_menus where menu_key='header')
insert into public.cms_navigation_items(menu_id,label,url,sort_order) select m.id,x.label,x.url,x.ord from m cross join (values
('首頁','/',10),('產品與 App','/products',20),('解決方案','/solutions',30),('案例','/cases',40),('文章','/blog',50),('關於森映','/about',60),('聯絡我們','/contact',70)) x(label,url,ord)
on conflict do nothing;

insert into public.products(slug,name,short_description,product_type,status,published_at,sort_order) values
('brand-website','品牌官網','形象、內容與後台管理整合的品牌入口。','web','published',now(),10),
('badminton-platform','羽球排組平台','報名、排組、場次與球團管理平台。','platform','published',now(),20),
('mori-commerce','Mori 電商網站','商品、訂單、會員與內容管理的電商架構。','commerce','published',now(),30),
('tools-app','工具 App','解決單一需求、可持續迭代的工具型 App。','app','published',now(),40),
('ai-content','AI 內容與漫劇','以影音與連載內容累積品牌作品。','content','published',now(),50)
on conflict(slug) do nothing;

insert into public.services(slug,name,short_description,price_label,status,published_at,sort_order) values
('website','網站建置','品牌官網、企業網站與內容型網站。','基礎方案公開，客製需求另行評估','published',now(),10),
('app-mvp','App MVP 開發','把核心流程做成可測試、可上架的第一版產品。','依功能範圍評估','published',now(),20),
('seo-content','SEO 內容規劃','關鍵字、內容架構與持續發布流程。','提供基礎方案','published',now(),30),
('cms-system','CMS / 後台系統','讓前台內容、SEO 與資訊可自行管理。','依資料與權限範圍評估','published',now(),40)
on conflict(slug) do nothing;

insert into public.faqs(question,answer,category,sort_order,is_published) values
('專案一般需要多久？','時間取決於頁面、功能、資料整理與審核流程，確認需求後會提供分階段時程。','首頁',10,true),
('可以只做部分功能嗎？','可以，會先整理核心流程，再以 MVP 或分階段方式上線。','首頁',20,true),
('後台內容可以自行修改嗎？','可以，CMS 可管理頁面區塊、產品、服務、案例、文章、FAQ 與 SEO 資訊。','首頁',30,true),
('如何開始討論專案？','先提供目標、目前素材與希望解決的問題，再安排需求討論。','首頁',40,true)
on conflict do nothing;
commit;
