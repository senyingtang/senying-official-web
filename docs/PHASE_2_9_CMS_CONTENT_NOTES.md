# Phase 2.9：官網 CMS 內容工作流

本階段把官網的 **文章（Blog）** 與 **案例（Cases）** 從靜態檔案搬進 CMS，補上後台 CRUD、內容頁路由、全站搜尋，
並修正 `DATA_SOURCE=supabase` 時 `/admin/dashboard` 會整頁失敗的問題。

Marketing 仍然是 **Astro static build**（`output: 'static'`）：後台儲存後必須重新建置官網才會反映，後台會顯示「網站內容狀態」。

---

## 1. 資料模型（沿用 DB SQL v2.0，只補欄位）

沒有建立第二套 CMS schema。`0017_cms_content_completion.sql` 只補上缺少的欄位與一組重建狀態資料表：

| 資料表 | 0017 新增 | 說明 |
|---|---|---|
| `blog_posts` | `author_name`、`cover_image_url` | 既有 `cover_asset_id` 保留，未來可指向 `cms_assets` |
| `case_studies` | `industry`、`service_type`、`content`、`cover_image_url`、`gallery`、`is_sample`、`display_status` | `summary` 作為需求摘要、`challenge` / `solution` / `result` 沿用 |
| `seo_metadata` | `og_image_url` | per-entity SEO 只有這一套，內容表不另開 SEO 欄位 |
| `marketing_rebuild_requests` | （新表） | 官網重建請求與狀態；RLS：後台成員可讀、editor 以上可提出、owner / admin 可更新 |

其他一律沿用既有資料表：`blog_categories`、`cms_pages`、`cms_navigation_menus` / `cms_navigation_items`、`audit_logs`、`cms_site_settings`。

### 狀態

後台使用 4 種狀態：`draft` / `scheduled` / `published` / `archived`（DB enum 另有 `review`，讀取時併入 `draft`）。
前台可見條件與 DB `public.is_publicly_visible()` 相同：`status = 'published'` 且 `published_at <= now()` 且（`scheduled_at` 為空或已到）。

### 成效數據

`case_studies.result`（成果說明）預設留空。seed 沒有任何成效數字，
`cms_content_rls.sql` 也會檢查「seed 案例不得包含成果數據」。前台在沒有成果時顯示
「成效數據取得客戶同意並完成統計後才會公開」，不放未經確認的百分比或金額。

---

## 2. Repository

介面定義在 `packages/database/src/repositories.ts`，實作分為 mock 與 supabase：

```
Marketing（Astro build）
  → apps/marketing/src/lib/cms.ts
    → mock：createMockRepositories()
    → supabase：createPublicCmsReaders()（anon key，只讀已發布內容，不使用 service role）

Admin（Next.js）
  → requireAdminPage() → repos.cmsBlog / repos.cmsCases / repos.cmsStructure / repos.marketingRebuild
    → mock：記憶體（persisted = false）
    → supabase：使用者 session client，寫入範圍由 RLS 決定
```

- `CmsBlogRepository`：`listPublished` / `getPublishedBySlug` / `listAdmin` / `getById` / `listCategories` / `create` / `update` / `publish` / `unpublish` / `archive` / `countsByStatus`
- `CmsCaseRepository`：同上（沒有分類，改為產業 / 服務類型）
- `CmsStructureRepository`：`listPages` / `listNavigation` / `updateNavigationItem`
- `MarketingRebuildTrigger`：`getStatus` / `trigger(reason)`

Astro 頁面與 Next.js 頁面都不直接寫 Supabase query。

---

## 3. 後台

| 路由 | 內容 |
|---|---|
| `/admin/cms/blog` | 文章列表：搜尋、狀態 filter、分類 filter、狀態統計、發布 / 取消發布 / 下架、網站內容狀態 |
| `/admin/cms/blog/new`、`/admin/cms/blog/[id]` | Markdown 編輯（編輯 / 預覽切換）、SEO 欄位、發布設定 |
| `/admin/cms/cases` | 案例列表：搜尋、狀態 / 產業 / 精選 filter、排序、發布 / 下架 |
| `/admin/cms/cases/new`、`/admin/cms/cases/[id]` | 案例內容、問題 / 做法 / 成果、相簿、SEO |
| `/admin/cms/pages` | 官網固定頁的 route、SEO 來源、索引狀態、對應的 `cms_pages` 資料列 |
| `/admin/cms/navigation` | Header / Footer 選單：label、連結、排序、啟用、另開新視窗 |
| `/admin/cms/seo` | 固定頁索引狀態 + 文章 / 案例的 SEO 覆寫狀況 |

### 權限

UI 的 `disabled` 不是安全控制：Server Action 會再檢查一次角色，資料庫 RLS 是最後防線。

| 角色 | 文章 | 案例 | 選單 |
|---|---|---|---|
| owner / admin | CRUD + 發布 | CRUD + 發布 | 可修改 |
| editor | CRUD + 發布 | CRUD + 發布 | 唯讀 |
| author | 只能建立 / 編輯自己的未發布文章（RLS `posts_author_*`） | 不可進入 | 唯讀 |
| viewer | 唯讀 | 唯讀 | 唯讀 |
| customer（非後台成員） | 不可進入，也讀不到未發布內容 | 同左 | 同左 |

### SEO 的單一來源

- 固定頁（首頁、產品頁、關於、聯絡…）的 title / description / canonical / JSON-LD 寫在 Astro 頁面裡，是唯一來源；
  `/admin/cms/pages` 與 `/admin/cms/seo` 只顯示狀態，不提供重複的編輯欄位。
- 逐篇內容（文章 / 案例）的 SEO 覆寫存在 `seo_metadata`，於各自的編輯頁填寫，留空時自動使用標題與摘要。

---

## 4. Dashboard graceful degradation

`/admin/dashboard` 的每個區塊各自以 `safeLoad()` 載入（`apps/admin/src/lib/safe-load.ts`）：

- 已完成的 repository（平台統計、官網內容、全站設定、網站內容狀態）顯示 **真實資料**
- 尚未接上 Supabase 的模組（Commerce 訂單、訂閱、部署紀錄）會丟出 `NotImplementedInPhaseError`，
  改以 `ModuleUnavailable`（「尚未啟用」）呈現，不會讓整頁 500，也**不使用假數字**
- 權限不足或查詢失敗顯示各自的原因，其他區塊照常運作

---

## 5. Markdown 與內容安全

`packages/shared/src/utils/markdown.ts`：

- **先把整份原始碼 HTML escape，再只產生白名單標籤**（`h2` `h3` `p` `ul` `ol` `li` `blockquote` `a` `img` `strong` `em` `code` `pre` `hr`），
  因此 `<script>`、`<iframe>`、`on*=` 只會以純文字輸出，不需要另外接 sanitizer，也不會有「漏掉某個標籤」的風險
- 連結與圖片網址採白名單（https / http / `mailto:` / `tel:` / 站內路徑 / `#錨點`），其餘降級為純文字
- 後台儲存前另有 `findUnsafeContentPatterns()`：內容含 `<script>`、`<iframe>`、`javascript:`、`on*=` 等直接拒絕儲存
- 後台預覽與前台輸出使用同一個 `renderMarkdown()`

---

## 6. 前台

| 路由 | 說明 |
|---|---|
| `/blog` | 精選文章 + 文章列表 + 熱門主題，全部由 repository 驅動；沒有文章時顯示 Empty State，build 不會失敗 |
| `/blog/[slug]` | 標題、發布日期、分類、封面、內文、麵包屑、相關文章、CTA、Article JSON-LD |
| `/cases` | 案例列表（服務類型 chip 篩選、搜尋、排序） |
| `/cases/[slug]` | 產業、服務類型、封面、內容、問題、做法、成果（有才顯示）、相簿、麵包屑、相關案例、CTA、CreativeWork JSON-LD |
| `/search` | 全站搜尋（noindex，不進 sitemap） |
| `/search-index.json` | build 時產生的搜尋索引 |

`getStaticPaths` 只取得已發布內容，**草稿 / 未到期排程 / 已下架不會產生任何 HTML**，也不會進入 sitemap 或搜尋索引。

### 搜尋

- 索引在 build 時產生：已發布文章、已發布案例、產品頁（5 個產品 + 4 個一頁式範例）、主要行銷頁面
- 不收錄 `/admin`、`/portal`、`/checkout`（noindex）、`/api`，也不收錄任何未發布內容
- `/search` 的結果清單在 build 時就輸出：沒有 JavaScript 時顯示完整索引，有 JavaScript 時輸入 2 個字元以上才開始比對
- 比對完全在瀏覽器端，**不會把每次鍵盤輸入送到伺服器**；沒有結果時顯示「找不到符合的內容」
- Header 的搜尋入口（桌機與手機）都指向 `/search`

---

## 7. Rebuild 狀態

Phase 2.9 不做真正的部署，只建立介面與狀態流程：

- 後台儲存內容 → `MarketingRebuildTrigger.trigger(reason)` 寫入 `marketing_rebuild_requests`（`pending`），不會阻塞表單
- `getStatus()` 比較「最後內容更新時間」（`blog_posts` / `case_studies` 的 `updated_at`）與「最後建置完成時間」
- 後台顯示：已同步 / 需要重新建置 / 建置中 / 建置失敗
- Phase 3.1 會把 `trigger()` 換成 GitHub Actions 或 deploy provider webhook，**介面不變**

---

## 8. Audit

內容寫入會寫 `audit_logs`：`cms.blog.create` / `update` / `publish` / `unpublish` / `archive`、`cms.case.*`、`cms.navigation.update`。

`metadata` 只記錄 id / slug / 變更欄位名稱與狀態，`before_data` / `after_data` 留空 —— **不存整篇內容全文**。

---

## 9. Seed 內容

`0017` 的 seed 全部是可公開的既有官網內容或明確標示的示範內容：

- **文章**：3 篇「示範文章」，摘要與內文開頭都標示示範（`new-site-seo-first-3-months`、`brand-site-structure`、`custom-domain-dns`）
- **案例**：官網既有的 8 筆案例 / 版型示意原文搬進 CMS，文字未改寫，沒有新增任何成效數字；
  版型示意以 `is_sample = true` 標記，前台顯示「非客戶專案」
- **分類**：官網 7 個分類
- **選單**：Header 對齊現行設計（產品服務 / 案例作品 / 部落格 / 價格方案 / 關於我們），Footer 為法律連結

Mock 模式另外有 draft / scheduled（2099 年）/ archived 各一筆，用來驗證未發布內容不會進入 build。

> `mori-ecommerce` 改名為 `brand-ecommerce-site`：`Mori` 是舊品牌名稱，不應該出現在公開網址（`seo:verify` 第 18 項會檢查）。

---

## 10. 驗收

| 指令 | 內容 |
|---|---|
| `pnpm cms:verify` | 30 項：repository（mock / supabase）、anon 讀寫邊界、5 種角色權限、slug 唯一、sanitize、audit、build 輸出、未發布內容不進 build、metadata / Breadcrumb / JSON-LD、搜尋索引、Admin（supabase 模式）Dashboard 與 CMS 頁面 |
| `pnpm cms-integration:verify` | 建立草稿 → public 讀不到 → 發布 → public 讀得到 → Marketing build → 內容頁 + 搜尋索引 → 下架 → 重新 build → 消失 → 清除（含 rebuild 狀態流程） |
| `pnpm search:verify` | 12 項：`/search` 與 `/search-index.json`、索引內容與 build 輸出一致、不含 private content、Header 入口、執行時行為與類型篩選 |
| `pnpm phase29:verify` | 16 步一鍵驗收（完整 RWD 只跑一次） |

`supabase/tests/cms_content_rls.sql` 在 `pnpm db:smoke` 內執行（全程 rollback）。

### 對既有驗收的調整

Phase 2.6B / 2.7 有兩項假設「文章尚未發布」，Phase 2.9 已經不成立，因此更新：

- `mockup:verify` 第 18 項：原本要求「文章卡不可有連結」，改為「每張文章卡都要連到已建置的 `/blog/<slug>`」
- `ui:verify` `/blog` 必要內容：`即將發布` → `閱讀約`
- `ui:verify` raw `<img>` 例外新增 `ContentImage.astro`（CMS 圖片網址由後台填寫，沒有預先產生的 WebP / AVIF 變體，仍必須有 width / height）
- RWD matrix：88 → 97 routes（新增 3 個前台路由與 6 個後台路由），582 checks

---

## 11. 尚未完成（Phase 3 之後）

- 正式 Supabase 專案、正式部署（Cloudflare / GitHub Actions）
- Commerce（訂單、購物車、金流）、訂閱扣款
- 客戶自助建站 Portal 的內容編輯
- 固定頁的區塊層編輯（`cms_page_sections`）
- 媒體庫上傳（目前封面與相簿為網址欄位）
- AI SEO 文章生產器正式生成
