-- =====================================================================
-- 0017_cms_content_completion.sql（Phase 2.9）
--
-- 目的：補齊官網 CMS 內容工作流所需的欄位與資料，不重建第二套 CMS schema。
--   1. blog_posts：author_name、cover_image_url（既有 cover_asset_id 保留，未來可指向 cms_assets）
--   2. case_studies：industry、service_type、content、cover_image_url、gallery、is_sample、display_status
--   3. seo_metadata：og_image_url（per-entity SEO 仍然只有這一套，不在內容表另開 SEO 欄位）
--   4. marketing_rebuild_requests：官網靜態重建請求與狀態（Phase 3.1 由 deploy provider webhook 接手）
--   5. seed：blog_categories（官網 7 個分類）、Header / Footer 選單對齊現行設計、
--            3 篇「示範文章」與官網既有 8 筆案例（文字沿用現有官網內容，不新增任何成效數字）
--
-- 全檔以 add column if not exists / create ... if not exists / on conflict 撰寫，可重複執行。
-- 只在本機 Supabase 驗證，不 link、不 push 任何遠端專案。
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. blog_posts
-- ---------------------------------------------------------------------
alter table public.blog_posts add column if not exists author_name text;
alter table public.blog_posts add column if not exists cover_image_url text;
do $$ begin
  alter table public.blog_posts add constraint blog_posts_author_name_len check (author_name is null or length(author_name) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.blog_posts add constraint blog_posts_cover_image_url_shape check (cover_image_url is null or cover_image_url ~ '^(/[^/]|https://)');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. case_studies
-- ---------------------------------------------------------------------
alter table public.case_studies add column if not exists industry text;
alter table public.case_studies add column if not exists service_type text;
alter table public.case_studies add column if not exists content text;
alter table public.case_studies add column if not exists cover_image_url text;
alter table public.case_studies add column if not exists gallery jsonb not null default '[]'::jsonb;
-- is_sample：版型 / 設計示意，不是客戶專案；前台必須明確標示，避免把示意當成實際案例
alter table public.case_studies add column if not exists is_sample boolean not null default false;
-- display_status：案例目前狀態文字（案例整理中 / 內部使用中 / 版型示意…），不是成效數據
alter table public.case_studies add column if not exists display_status text;
do $$ begin
  alter table public.case_studies add constraint case_studies_gallery_is_array check (jsonb_typeof(gallery) = 'array');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.case_studies add constraint case_studies_cover_image_url_shape check (cover_image_url is null or cover_image_url ~ '^(/[^/]|https://)');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.case_studies add constraint case_studies_industry_len check (industry is null or length(industry) <= 200);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.case_studies add constraint case_studies_service_type_len check (service_type is null or length(service_type) <= 200);
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 3. seo_metadata：純網址形式的 OG 圖（og_image_id 指向 cms_assets，兩者擇一）
-- ---------------------------------------------------------------------
alter table public.seo_metadata add column if not exists og_image_url text;
do $$ begin
  alter table public.seo_metadata add constraint seo_metadata_og_image_url_shape check (og_image_url is null or og_image_url ~ '^(/[^/]|https://)');
exception when duplicate_object then null; end $$;

create index if not exists idx_blog_posts_status_published on public.blog_posts(status, published_at desc);
create index if not exists idx_case_studies_status_sort on public.case_studies(status, sort_order);
create index if not exists idx_case_studies_industry on public.case_studies(industry);
create index if not exists idx_seo_metadata_entity on public.seo_metadata(entity_type, entity_id);

-- ---------------------------------------------------------------------
-- 4. marketing_rebuild_requests（官網重建狀態）
-- ---------------------------------------------------------------------
create table if not exists public.marketing_rebuild_requests(
  id uuid primary key default gen_random_uuid(),
  reason text not null check (length(reason) between 1 and 300),
  status text not null default 'pending' check (status in ('pending','building','synced','failed')),
  requested_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_marketing_rebuild_requests_created on public.marketing_rebuild_requests(created_at desc);
-- 外鍵欄位必須有索引（schema_smoke_test 會檢查）
create index if not exists idx_marketing_rebuild_requests_requested_by on public.marketing_rebuild_requests(requested_by);

drop trigger if exists trg_marketing_rebuild_requests_updated_at on public.marketing_rebuild_requests;
create trigger trg_marketing_rebuild_requests_updated_at before update on public.marketing_rebuild_requests
  for each row execute function public.set_updated_at();

alter table public.marketing_rebuild_requests enable row level security;
-- 後台成員可讀；可發布內容的角色（owner / admin / editor）可以提出重建請求；只有 owner / admin 可以更新狀態
drop policy if exists marketing_rebuild_staff_read on public.marketing_rebuild_requests;
create policy marketing_rebuild_staff_read on public.marketing_rebuild_requests for select to authenticated using (public.is_cms_staff());
drop policy if exists marketing_rebuild_editor_insert on public.marketing_rebuild_requests;
create policy marketing_rebuild_editor_insert on public.marketing_rebuild_requests for insert to authenticated
  with check (public.can_publish_content() and requested_by = auth.uid() and status = 'pending');
drop policy if exists marketing_rebuild_admin_update on public.marketing_rebuild_requests;
create policy marketing_rebuild_admin_update on public.marketing_rebuild_requests for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists marketing_rebuild_admin_delete on public.marketing_rebuild_requests;
create policy marketing_rebuild_admin_delete on public.marketing_rebuild_requests for delete to authenticated using (public.is_admin());

-- ---------------------------------------------------------------------
-- 5-1. blog_categories：官網 7 個分類
-- ---------------------------------------------------------------------
insert into public.blog_categories(slug, name, description, sort_order, is_active) values
('seo','SEO 優化','網站架構、關鍵字與結構化資料。',10,true),
('web-design','網站設計','頁面規劃、版型選擇與上線前檢查。',20,true),
('content-marketing','內容行銷','活動頁、文章與社群內容的安排。',30,true),
('tools','數位工具','後台操作、網域設定與文章生產器。',40,true),
('brand','品牌經營','品牌介紹、服務說明與長期經營。',50,true),
('case-sharing','案例分享','專案做法與整理方式。',60,true),
('insights','產業觀點','電商、金流與數位行銷的觀察。',70,true)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order, is_active = true;

-- ---------------------------------------------------------------------
-- 5-2. Header / Footer 選單：對齊現行官網設計（產品服務 / 案例作品 / 部落格 / 價格方案 / 關於我們）
-- ---------------------------------------------------------------------
do $$
declare v_header uuid; v_footer uuid;
begin
  select id into v_header from public.cms_navigation_menus where menu_key = 'header';
  select id into v_footer from public.cms_navigation_menus where menu_key = 'footer';

  -- 0015 seed 中不在現行設計內的主選單項目改為停用（保留資料，不刪除）
  update public.cms_navigation_items set is_active = false
   where menu_id = v_header and url in ('/', '/solutions', '/contact');

  -- 現行設計的 5 個主選單項目
  update public.cms_navigation_items set label = '產品服務', sort_order = 10, is_active = true where menu_id = v_header and url = '/products';
  update public.cms_navigation_items set label = '案例作品', sort_order = 20, is_active = true where menu_id = v_header and url = '/cases';
  update public.cms_navigation_items set label = '部落格',   sort_order = 30, is_active = true where menu_id = v_header and url = '/blog';
  update public.cms_navigation_items set label = '關於我們', sort_order = 50, is_active = true where menu_id = v_header and url = '/about';
  insert into public.cms_navigation_items(menu_id, label, url, sort_order, is_active)
  select v_header, '價格方案', '/checkout', 40, true
  where not exists (select 1 from public.cms_navigation_items where menu_id = v_header and url = '/checkout');

  insert into public.cms_navigation_items(menu_id, label, url, sort_order, is_active)
  select v_footer, x.label, x.url, x.ord, true
  from (values ('服務條款','/legal/terms',10),('隱私權政策','/legal/privacy',20)) x(label, url, ord)
  where not exists (select 1 from public.cms_navigation_items i where i.menu_id = v_footer and i.url = x.url);
end $$;

-- ---------------------------------------------------------------------
-- 5-3. 示範文章（3 篇；摘要與內文開頭都標示「示範」，方便日後整批移除）
-- ---------------------------------------------------------------------
insert into public.blog_posts(slug, title, excerpt, content, category_id, author_name, status, published_at, is_featured)
select x.slug, x.title, x.excerpt, x.content, c.id, '森映編輯台', 'published'::public.cms_publish_status, x.published_at, x.is_featured
from (values
(
  'new-site-seo-first-3-months',
  '新網站怎麼開始做 SEO？前 3 個月的內容安排',
  '示範文章：從頁面架構、網址規則到第一批文章主題，整理新網站前 3 個月可以先完成的事。',
  $md$> 這是示範文章，用來展示文章版面與後台編輯流程。

## 先確認頁面架構與網址

新網站上線前先決定頁面清單與網址規則，之後改網址要處理轉址，成本比一開始想清楚高。

- 首頁、服務頁、案例頁、文章列表、聯絡頁先各自對應一組網址
- 網址使用小寫英文與連字號，例如 `/products/seo-website`
- 同一個主題只保留一個頁面，避免自己的頁面互相競爭

## 第一批文章主題怎麼選

先寫客人詢問時最常問的問題，這些問題本來就有人在搜尋，也最容易寫得具體。

1. 服務流程與時程
2. 價格怎麼估、包含哪些項目
3. 上線後要自己維護哪些內容

## 內部連結怎麼安排

文章寫完後，從文章連回對應的服務頁，服務頁也列出相關文章。連結文字直接寫頁面主題，不要用「點這裡」。

> 前 3 個月的重點是把架構與主題整理好，而不是一次寫很多篇。$md$,
  'seo', timestamptz '2025-08-12 02:00:00+00', true
),
(
  'brand-site-structure',
  '品牌官網怎麼規劃？首頁、服務頁到案例頁的架構',
  '示範文章：先想清楚訪客要找什麼，再決定頁面順序與每一頁要回答的問題。',
  $md$> 這是示範文章，用來展示文章版面與後台編輯流程。

## 首頁要先講哪件事

首頁第一屏回答三件事：你是誰、你提供什麼、下一步要做什麼。其他內容往下排。

## 服務頁怎麼分

一個服務一頁，內容包含服務範圍、流程、時程與常見問題。不要把所有服務塞在同一頁，訪客與搜尋引擎都不容易判斷這頁在講什麼。

## 案例頁放什麼

- 產業與需求：這個客戶原本遇到什麼問題
- 做法：用了哪些頁面與功能
- 使用產品：對應到你的哪一個方案

成效數字要有實際統計與客戶同意才公開，還沒確認前就先留白。$md$,
  'web-design', timestamptz '2025-08-20 02:00:00+00', false
),
(
  'custom-domain-dns',
  '自訂網域怎麼設定？CNAME、TXT 驗證與 www 網址',
  '示範文章：把網域指到網站前，先分清楚根網域與 www 網址的差別。',
  $md$> 這是示範文章，用來展示文章版面與後台編輯流程。

## CNAME 與 TXT 紀錄

- **CNAME**：把 `www` 指到平台提供的網址
- **TXT**：證明網域是你的，驗證通過後才會簽發憑證

## 為什麼建議先用 www

根網域（例如 `example.com`）不能設定 CNAME，需要改用平台支援的其他方式。先用 `www` 上線，再把根網域轉址過去，流程比較單純。

## 設定後多久生效

DNS 更新需要時間，通常幾分鐘到數小時。生效前網站可能時好時壞，屬於正常現象。$md$,
  'tools', timestamptz '2025-08-28 02:00:00+00', false
)) as x(slug, title, excerpt, content, category_slug, published_at, is_featured)
join public.blog_categories c on c.slug = x.category_slug
on conflict (slug) do nothing;

insert into public.seo_metadata(entity_type, entity_id, seo_title, meta_description)
select 'blog_post', p.id, '新網站 SEO 怎麼開始？前 3 個月的內容安排',
       '新網站前 3 個月的 SEO 安排：頁面架構與網址規則、第一批文章主題怎麼選、內部連結怎麼配置。示範文章。'
from public.blog_posts p where p.slug = 'new-site-seo-first-3-months'
on conflict (entity_type, entity_id) do nothing;

-- ---------------------------------------------------------------------
-- 5-4. 官網既有案例（文字沿用 apps/marketing 原內容；成效欄位一律留空）
-- ---------------------------------------------------------------------
insert into public.case_studies(slug, title, client_name, summary, challenge, solution, content, industry, service_type, is_sample, display_status, status, published_at, is_featured, sort_order)
select x.slug, x.title, x.client_name, x.summary, x.challenge, x.solution,
       '## 需求背景' || E'\n\n' || x.challenge || E'\n\n' || '## 做法' || E'\n\n' || x.solution || E'\n\n' || '## 使用產品' || E'\n\n' || '- ' || x.service_type,
       x.industry, x.service_type, x.is_sample, x.display_status, 'published'::public.cms_publish_status, timestamptz '2025-08-01 02:00:00+00', x.is_featured, x.sort_order
from (values
('hungjui-brand-site','Hungjui 形象官網','Hungjui','需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。','需要一個清楚介紹品牌與服務的官網，上線後也能自行更新內容。','以 SEO 形象官網架構整理首頁、服務、關於與聯絡頁，每頁設定獨立的 SEO 欄位與 FAQ。','品牌形象官網','SEO 形象官網',false,'案例整理中',true,10),
('brand-ecommerce-site','品牌電商官網','電商品牌客戶','商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。','商品展示、購物流程與訂單管理，需要整合在品牌自己的網站。','規劃商品分類、結帳流程與訂單後台，並預留綠界與 LINE Pay 的串接方式。','品牌電商','電商網站',false,'案例整理中',true,20),
('seo-article-generator','SEO 文章生產器','森映內部工具','文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。','文章產出速度不穩定，每篇的標題、段落結構與 FAQ 格式也不一致。','把品牌資料、關鍵字與語氣設定整理成流程，產出含 FAQ Schema 的文章草稿，再由人工審稿。','內容經營','SEO 文章生產器',false,'內部使用中',true,30),
('booking-event-pages','預約 / 活動頁','示範版型','預約和報名都靠私訊，時段與人數要一筆一筆整理。','預約和報名都靠私訊，時段與人數要一筆一筆整理。','以一頁式網頁版型示範預約表單與活動報名流程，資料集中在後台表單紀錄。','美業預約 · 活動報名','一頁式網頁',true,'示範案例',true,40),
('sample-lodging-site','山景旅宿官網版型','版型示意','房型、交通與預約資訊分散在社群，旅客很難一次看懂。','房型、交通與預約資訊分散在社群，旅客很難一次看懂。','以形象官網版型整理房型介紹、周邊景點與預約入口。','旅宿觀光','SEO 形象官網',true,'版型示意',false,50),
('sample-festival-dm','節慶活動 DM 視覺','設計示意','同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。','同一檔活動需要社群圖、活動頁與印刷 DM，資訊要一致。','先整理活動資訊，再延伸社群、網頁與印刷尺寸。','百貨零售','活動 DM / 宣傳頁',true,'設計示意',false,60),
('sample-course-landing','課程招生一頁式版型','版型示意','課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。','課程資訊、講師介紹與報名方式，要讓學員在手機上看懂。','以課程招生頁型安排大綱、講師、FAQ 與報名表單。','教育培訓','一頁式網頁',true,'版型示意',false,70),
('sample-select-shop','生活選物電商版型','版型示意','商品規格多，希望分類清楚、手機也好瀏覽。','商品規格多，希望分類清楚、手機也好瀏覽。','以電商版型規劃商品分類、規格說明與購物車入口。','生活居家','電商網站',true,'版型示意',false,80)
) as x(slug, title, client_name, summary, challenge, solution, industry, service_type, is_sample, display_status, is_featured, sort_order)
on conflict (slug) do nothing;

commit;
