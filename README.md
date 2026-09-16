# 森映 Headless 自助建站電商平台

- Phase 1：monorepo 架構、Astro 前台、Next.js 後台、Design System 與 Supabase 資料邊界。
- Phase 2：Supabase Auth 邊界、官方後台 / 客戶後台權限保護、Repository 切換（mock / supabase）、權限代碼兌換流程。
- Phase 2.5 / 2.6 / 2.6B：官網前台 UI/UX、final 圖片接入、依設計稿（docs/design/uiux-mockups）重構版型與區塊順序。
- Phase 2.6C：正式品牌「森映 / SEN YING」、全站浮動快捷列與購物車 badge、手機 bottom sheet、官方後台全站設定（/admin/cms/site-settings）。

**預設 `DATA_SOURCE=mock`：不連線任何 Supabase 專案，登入使用 mock 示範帳號，後台畫面使用 mock 資料。**

| 層 | 技術 | 位置 |
|---|---|---|
| 前台（SEO 官網、產品頁、方案 / 結帳入口、未來客戶網站模板） | Astro 7 + Tailwind CSS 4 | `apps/marketing` |
| 後台（森映官方後台 `/admin`、客戶自助建站後台 `/portal`） | Next.js 16 App Router + React 19 + Tailwind CSS 4 | `apps/admin` |
| 資料 / 服務 | Supabase（Auth、Postgres、Storage、RLS、Edge Functions） | `supabase/`（DB SQL v2.0 複本） |

## 目錄

```txt
SYT_Official_Website/
├─ apps/
│  ├─ marketing/          Astro 前台
│  └─ admin/              Next.js 後台（/admin、/portal）
│     └─ src/
│        ├─ proxy.ts      Next.js 16 proxy：只做 session cookie 粗檢
│        ├─ lib/auth/     server guard、登入 / 登出、mock session cookie
│        └─ lib/supabase/ 使用者 session client（server.ts）、service role（service-role.ts，server-only）
├─ packages/
│  ├─ config/             ESLint flat config
│  ├─ database/           資料來源設定、repository 介面、mock / supabase repository、RPC 邊界
│  ├─ ui/                 Design tokens、Tailwind v4 theme、共用 class
│  ├─ seo/                metadata、JSON-LD、sitemap / robots helper
│  ├─ auth/               角色、路由權限規則、guard 判斷（純函式）、登入導回路徑
│  └─ shared/             共用型別、常數、權限代碼（含兌換狀態）與 DNS 規則、utils
├─ supabase/              DB SQL v2.0 migrations / tests 逐位元複本
├─ scripts/               DB 同步檢查、結構驗收、Phase 2 權限驗收、RWD 自動檢查
├─ docs/                  規格文件（v1.0、DB SQL v2.0、Phase 2 權限說明、project-audit）
├─ package.json / pnpm-workspace.yaml / turbo.json / tsconfig.base.json / eslint.config.mjs
└─ .env.example
```

## 需求

- Node.js ≥ 22.12（開發環境 24.13；`phase2:auth` 直接載入 `.ts` 需要 Node 22.18+ / 24 的 type stripping）
- pnpm 12（`corepack enable` 或全域安裝）
- Google Chrome（`pnpm rwd:check`、`pnpm phase2:auth` 使用）

## 開始

```bash
pnpm install
cp .env.example apps/marketing/.env        # 只填本機值
cp .env.example apps/admin/.env.local      # 只填本機值（DATA_SOURCE=mock 不需要任何 Supabase env）

pnpm dev:marketing   # http://localhost:4321
pnpm dev:admin       # http://localhost:3000（/admin/login、/portal/login）
```

## 指令

| 指令 | 說明 |
|---|---|
| `pnpm lint` | ESLint（全部 workspace） |
| `pnpm typecheck` | `astro check`、`next typegen && tsc`、各 package `tsc --noEmit` |
| `pnpm build` | Astro 靜態輸出 + Next.js production build |
| `pnpm check` | lint → typecheck → build |
| `pnpm db:verify-sync` | 檢查 `supabase/` 與 docs 內 DB SQL v2.0 是否一致 |
| `pnpm phase1:structure` | Phase 1 結構驗收：依 Astro / Next.js 真實路由規則比對原始碼（含 route groups、`[siteId]`、`getStaticPaths`），有 build output 時一併比對 |
| `pnpm rwd:check` | 一條指令完成 RWD 驗收：缺 build 時自動 build → 自動啟動前後台 → 以 mock 帳號登入 → 檢查 375 / 430 / 768 / 1024 / 1280 / 1440px → 自動關閉服務 |
| `pnpm rwd:check:with-server` | 同上，但強制重新 build |
| `pnpm rwd:serve` | 只啟動驗收用前後台服務（DATA_SOURCE=mock），手動檢視，Ctrl+C 關閉 |
| `pnpm phase1:verify` | 依序執行 structure → db:verify-sync → lint → typecheck → build → structure（含 build output）→ rwd:check（`--skip-rwd` 略過最後的 rwd:check，供 phase2:verify 使用） |
| `pnpm phase2:auth` | Phase 2 權限驗收：guard 覆蓋、service role 邊界、DATA_SOURCE 切換、兌換流程、角色 / workspace runtime 測試、env leak、正式密鑰掃描、phase1:structure、rwd:check |
| `pnpm phase2:verify` | 依序執行 phase1:verify（--skip-rwd）→ phase2:auth → lint → typecheck → build → rwd:check，最後列出每一步結果；完整 RWD（前台 + 後台）只在最後跑一次 |
| `pnpm ui:verify` | 官網前台 UI/UX 驗收：每頁 SEO / 結構、首頁與產品頁必要內容、文案、安全、效能、final 圖片接入規則（見 `docs/PHASE_2_6_IMAGE_NOTES.md`）、Hero runtime、RWD |
| `pnpm mockup:verify` | Phase 2.6B 設計稿版型驗收：依 `apps/marketing/src/content/mockupLayout.ts` 比對 10 個頁面的區塊順序與數量、Header / Hero / Final CTA、比較表、Checkout 付款提示、Cases 成效數字、Blog 連結、圖片來源、密鑰、RWD（見 `docs/PHASE_2_6B_MOCKUP_LAYOUT_NOTES.md`） |
| `pnpm phase26b:verify` | 依序執行 mockup:verify → ui:verify → phase2:verify |
| `pnpm global-ui:verify` | Phase 2.6C 全站 UI 驗收：SEN YING 品牌、浮動快捷列收合 / 展開與 localStorage、社群連結來自全站設定、購物車 badge（0 / 1 / 12 / 99 / 99+）、手機 bottom sheet、遮擋、Admin 全站設定、RWD（見 `docs/PHASE_2_6C_GLOBAL_UI_NOTES.md`） |
| `pnpm phase26c:verify` | 依序執行 global-ui:verify → mockup:verify → ui:verify → phase2:verify |
| `pnpm images:optimize` | Phase 2.7 圖片轉檔：`media.ts` 的 runtime PNG → WebP / AVIF（原尺寸 + 1080w / 640w），PSNR 畫質保護，產生 `image-variants.generated.json`；PNG 原檔保留 |
| `pnpm images:report` | 產生 `docs/design/IMAGE_OPTIMIZATION_REPORT.csv` 與 `UNUSED_IMAGE_ASSETS.csv`（需要 build output） |
| `pnpm og:generate` | 依 `apps/marketing/src/content/ogImages.ts` 以本機 Chrome 產生 1200×630 OG 圖（`public/images/og`） |
| `pnpm brand:generate` | 由 `public/brand/favicon.svg` 產生 favicon / apple-touch-icon / JSON-LD logo PNG |
| `pnpm asset:verify` | Phase 2.7 圖片 / OG / Logo / Favicon 驗收（24 項，靜態 build output） |
| `pnpm seo:verify` | Phase 2.7 SEO 驗收（20 項）：預設 build + 正式網址設定驗收 build（輸出到 `.phase27-report/`，不覆蓋 dist） |
| `pnpm perf:verify` | Phase 2.7 圖片效能預算，產生 `docs/performance/PHASE_2_7_IMAGE_BUDGET.md`；`--browser` 另以 Chrome 實測下載量 |
| `pnpm phase27:static` | targeted：asset:verify → seo:verify → perf:verify（不啟動服務、無 RWD） |
| `pnpm phase27:verify` | final full：asset → seo → perf → global-ui → mockup → ui（後三者 `--skip-build --skip-rwd`）→ phase2:verify；整輪完整 RWD 只跑一次，可用 `--from <step>` 從某一步重跑（見 `docs/PHASE_2_7_BRAND_SEO_ASSET_NOTES.md`） |
| `pnpm supabase:start` / `supabase:stop` / `supabase:status` | 本機 Supabase（`supabase/config.toml`，544xx port）；status 只顯示 URL，key 遮罩 |
| `pnpm db:reset:local` | `supabase db reset --local`，依序套用 0001 ~ 0017 |
| `pnpm db:types` | 從本機 Supabase 產生 `packages/database/src/generated/supabase.ts` |
| `pnpm db:smoke` | 本機 DB smoke：migrations、cms_site_settings seed、7 支 SQL smoke test（含 `cms_content_rls.sql`）、PostgREST + GoTrue 角色寫入權限 |
| `pnpm site-settings:verify` | Phase 2.8 真實整合：Admin（DATA_SOURCE=supabase）表單寫入 → DB → repository round trip → Marketing build（輸出 `.phase28-report/supabase-dist`）→ dist → rollback |
| `pnpm local-env:verify` | .gitignore 涵蓋 .env.local、service role 不進 build、repo 無正式 key、報告不含完整 key |
| `pnpm dev:admin:supabase` / `build:marketing:supabase` | 以本機 Supabase 連線資訊（即時讀取、不寫檔）啟動後台 / build 官網 |
| `pnpm phase28:verify` | db:verify-sync → db:smoke → site-settings:verify → local-env:verify → phase27:verify（含 phase2:verify，完整 RWD 一次），見 `docs/PHASE_2_8_SUPABASE_SITE_SETTINGS_NOTES.md` |
| `pnpm cms:verify` | Phase 2.9 CMS 內容驗收（30 項）：Blog / Case repository、anon 讀寫邊界、5 種角色權限、slug 唯一、sanitize、audit、build 輸出、未發布內容不進 build、metadata / Breadcrumb / JSON-LD、搜尋索引、Admin（supabase 模式）Dashboard 與 CMS 頁面 |
| `pnpm cms-integration:verify` | Phase 2.9 真實整合：建立草稿 → public 讀不到 → 發布 → Marketing build → 內容頁 + 搜尋索引 → 下架 → 重新 build → 消失 → 清除（含 rebuild 狀態流程） |
| `pnpm search:verify` | Phase 2.9 全站搜尋驗收（12 項）：`/search`、`/search-index.json`、索引與 build 輸出一致、不含 draft / admin / portal / checkout、Header 入口、執行時行為與類型篩選 |
| `pnpm phase29:verify` | db:verify-sync → db:smoke → build → cms:verify → cms-integration:verify → search:verify → site-settings:verify → local-env:verify → asset / seo / perf / global-ui / mockup / ui → phase2:verify（完整 RWD 一次）→ git:verify，見 `docs/PHASE_2_9_CMS_CONTENT_NOTES.md` |
| `pnpm git:verify` | Phase 2.8.1 Git baseline：main 分支、origin 為官方 repo、working tree clean、.env / .next / dist / supabase/.temp 被 ignore、tracked 檔案無 secret、HEAD 與 GitHub origin/main 一致 |
| `pnpm rwd:report:verify` | 確認最近一次完整 RWD 報告為 582 checks / 0 failures（`phase28:verify` / `phase29:verify` 的 `--skip-rwd` 使用，避免同一輪重跑 RWD） |

RWD 檢查說明：

- 前台服務直接 serve `apps/marketing/dist`（行為同 `astro preview`；Astro 7 的 preview 在非 TTY 會轉為背景 daemon，無法自動關閉，所以不使用）。後台使用 `next start`，並固定 `DATA_SOURCE=mock`。
- 後台頁面以 mock 示範帳號登入後檢查（owner / viewer / customer / outsider），並驗證最終網址：被導回登入頁或 forbidden 視為失敗。
- 驗收服務預設 port 4410（前台）/ 3310（後台），刻意避開開發常用的 4321 / 3000，避免和本機其他專案的 dev server 互相干擾；被占用時自動往上找空閒 port，不會關閉其他程式（可用 `MARKETING_PORT` / `ADMIN_PORT` 指定）。
- 只檢查單一 app：`pnpm rwd:check marketing` / `pnpm rwd:check admin`；報告在 `.rwd-report/`。
- 已有服務時可指定 `MARKETING_URL` / `ADMIN_URL`，腳本就不會自行啟動該服務（ADMIN_URL 必須是 mock 模式）。
- Chrome 不在預設路徑時設定 `CHROME_PATH`；並行數 `RWD_CONCURRENCY`（預設 1，可改 2）；同一 app + 帳號 + 寬度共用 browser context，暫時性 socket 錯誤（ERR_NO_BUFFER_SPACE 等）才重試一次，重試紀錄寫入報告。

## 登入與權限（Phase 2）

詳細說明見 `docs/PHASE_2_AUTH_AND_PERMISSION_NOTES.md`。

| 模式 | 行為 |
|---|---|
| `DATA_SOURCE=mock`（預設） | 登入頁顯示示範帳號按鈕；session 為 HMAC 簽章的 httpOnly cookie；資料來自 mock repository |
| `DATA_SOURCE=supabase` | 必須有 `PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`，缺少時明確失敗（不改用 mock）；Supabase Auth + RLS + RPC |

Mock 示範帳號（僅 mock 模式，email 為 example.com 保留網域）：

| 帳號 | 身分 |
|---|---|
| `owner@` / `admin@` / `editor@` / `author@` / `viewer@example.com` | 官方後台五種角色 |
| `customer@example.com` | 客戶後台：示範工作區（`demo-seo-site`、`demo-landing-page`） |
| `other-customer@example.com` | 客戶後台：其他工作區（驗證跨 workspace 隔離） |
| `outsider@example.com` | 已登入但沒有後台角色、沒有工作區 |

保護分層：

1. `apps/admin/src/proxy.ts`：`/admin/*`、`/portal/*` 沒有 session cookie → 導向登入頁（只看 cookie 是否存在）。
2. layout guard：`requireAdminSession()`（admin_profiles 角色）/ `requirePortalSession()`（已登入）。
3. page guard：每頁 `requireAdminPage(route)`、`requirePortalPage(route)`、`requireSiteAccess(siteId, route)`，並回傳綁定使用者範圍的 repository。

公開頁：`/`、`/admin/login`、`/portal/login`、`/portal/redeem-code`（可開啟，送出兌換時才要求登入）、整個 Astro 前台。

## 測試

目前的驗證方式（尚未導入 Vitest / Playwright Test 框架，驗收腳本直接使用 playwright-core）：

- `pnpm lint`、`pnpm typecheck`、`pnpm build`
- `pnpm phase2:auth`（權限與兌換流程 runtime 測試）
- `pnpm rwd:check`（版面自動檢查）
- `pnpm cms:verify` / `pnpm cms-integration:verify` / `pnpm search:verify`（Phase 2.9 CMS 內容與搜尋，需本機 `supabase start`）
- 資料庫：`supabase/tests/*.sql`（DB SQL v2.0 smoke tests，需本機 `supabase start`）

## 環境變數與安全

- `.env.example` 只保留空白值（`DATA_SOURCE=mock` 除外），不可提交正式 key、正式專案 ref、正式金流資訊或正式網域。
- `PUBLIC_*` 會進入瀏覽器，只能放 Supabase anon key 等公開值。
- `SUPABASE_SERVICE_ROLE_KEY` 只在 `apps/admin/src/lib/supabase/service-role.ts`（`server-only`）讀取；proxy、client component、Astro 前台都不讀取。Phase 2 沒有任何頁面使用 service role。
- 一般查詢一律使用「使用者 session」client（anon key + Auth cookie），資料範圍由 RLS 決定。
- `AUTH_COOKIE_SECRET` 只用於 mock 登入 cookie 簽章。
- 金流密鑰只放 Supabase Vault / Edge Function Secrets，後台只填參照名稱（`vault:<name>`）。
- 正式網址由 `SITE_PUBLIC_URL`、`ADMIN_PUBLIC_URL`、`PLATFORM_SUBDOMAIN_ROOT` 提供，程式碼不寫死網域。
- 前台預設輸出 `noindex`，只有 `SITE_ALLOW_INDEXING=true` 才允許搜尋引擎收錄（避免 staging 被索引）。
- `SITE_ALLOW_INDEXING=true` 時 `SITE_PUBLIC_URL` 必須是 https 且不是 localhost，否則前台 build 直接失敗；未設定網址的本機 / 預覽 build 會使用 `http://localhost:4321` fallback，並輸出 `<meta name="syt-site-url" content="local-fallback">` 與 noindex。
- 後台一律回應 `X-Robots-Tag: noindex`。

## 平台階段

| 階段 | 範圍 |
|---|---|
| v1（目前） | 模板制自助建站（SEO 形象官網、一頁式網頁）、每組權限代碼 1 個網站、只預覽不公開發布、SEO 文章生產器內部使用、金流保留介面 |
| v2 | 平台子網域、依方案多網站、文章生產器開放客戶 |
| v3 | 自訂網域 / DNS / 轉址 |

## 相關文件

- `docs/PHASE_2_AUTH_AND_PERMISSION_NOTES.md`
- `docs/PHASE_2_6_IMAGE_NOTES.md`
- `docs/PHASE_2_6B_MOCKUP_LAYOUT_NOTES.md`
- `docs/PHASE_2_6C_GLOBAL_UI_NOTES.md`
- `docs/PHASE_2_7_BRAND_SEO_ASSET_NOTES.md`
- `docs/PHASE_2_8_SUPABASE_SITE_SETTINGS_NOTES.md`
- `docs/PHASE_2_9_CMS_CONTENT_NOTES.md`
- `docs/performance/PHASE_2_7_IMAGE_BUDGET.md`
- `docs/森映品牌官網_CMS與SEO規劃_v1.0.md`
- `docs/森映品牌官網_整體架構設計_v1.0.md`
- `docs/森映_Headless自助建站平台_DB_SQL_v2.0/`（DB、RLS、權限代碼、金流、訂閱、版型、DNS、SEO 文章生產器規格）
- `packages/ui/DESIGN_SYSTEM.md`
- `packages/database/README.md`
