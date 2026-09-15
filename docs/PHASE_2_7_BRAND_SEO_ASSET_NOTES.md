# Phase 2.7 Brand / SEO / Asset Finalization

## 1. 圖片轉檔（WebP / AVIF）

- runtime 圖片唯一清單：`apps/marketing/src/content/media.ts`（16 張 final PNG，每張新增 `role`：hero / card / background）。
- `pnpm images:optimize`（`scripts/image-optimize.mjs`）：
  - 與 PNG 同資料夾輸出語意檔名：`home-hero-platform-ui-final.webp` / `.avif`（原尺寸）、`-1080w` / `-640w`。
  - WebP q80、AVIF q55；原尺寸對原始 PNG 計算 PSNR，低於 34 dB 會自動提高品質（最多 q90），不以畫質換容量。
    目前只有 `promo-page-examples-a-final.png`（細節多的海報拼貼）AVIF 自動提高到 q71。
  - 產生 `apps/marketing/src/content/image-variants.generated.json`（ResponsiveImage 使用），來源大小與參數沒變時略過。
- **PNG 原檔全部保留**（`<img>` fallback），`docs/design` 原始素材未變動。
- 報告：`pnpm images:report` → `docs/design/IMAGE_OPTIMIZATION_REPORT.csv`、`docs/design/UNUSED_IMAGE_ASSETS.csv`（未使用圖片只列出，不刪除）。
- 預算：`pnpm perf:verify` → `docs/performance/PHASE_2_7_IMAGE_BUDGET.md`（規則在 `scripts/lib/image-pipeline.mjs`；超過預算要在 `BUDGET_EXCEPTIONS` 寫原因）。

新增或替換圖片流程：放入 `public/images/**`（小寫英數檔名）→ 加到 `media.ts`（實際寬高、role）→ `pnpm images:optimize` → `pnpm build` → `pnpm images:report` → `pnpm perf:verify`。
沒有 WebP / AVIF 的 PNG 在正式 build 會直接失敗（ResponsiveImage 檢查）。

## 2. ResponsiveImage

```html
<picture data-responsive-picture class="contents">
  <source type="image/avif" srcset="…-640w.avif 640w, …-1080w.avif 1080w, ….avif 1672w" sizes="…">
  <source type="image/webp" srcset="…" sizes="…">
  <img src="….png" width height alt loading fetchpriority decoding class data-responsive-image>
</picture>
```

- `picture` 使用 `display: contents`，版面與原本單一 `<img>` 相同（Phase 2.6B 版型、RWD 不受影響）。
- props：`src`、`alt`、`width`、`height`、`loading`（預設 lazy）、`fetchpriority`、`decoding`、`fit`、`class`、`sizes`、選用 `srcset`。
- `sizes`：`IMAGE_SIZES.halfColumn`（預設，Hero / 兩欄）、`IMAGE_SIZES.background`（CTA 背景，手機 200vw）、`coverSizes()`（object-cover 卡片依裁切比例放大 vw，避免直式卡片挑到太小的圖而模糊）。
- 首屏：Hero 圖 `loading="eager"` + `fetchpriority="high"`（每頁最多 1 張）；其他全部 lazy。

## 3. OG 圖

- 設定：`apps/marketing/src/content/ogImages.ts`（13 張：default、home、products、5 個產品、cases、blog、about、contact、solutions）。
- 產生：`pnpm og:generate [key…]`（`scripts/og-generate.mjs`）：HTML 樣板 → 本機 Chrome 截圖 1200×630 → sharp 壓縮（調色盤 PNG 需 PSNR ≥ 38 dB，否則保留全彩）。
  自動檢查文字不超出畫面、不壓到示意圖、主標最多 2 行、尺寸 1200×630。
- 視覺：深藍 / Teal 漸層、山稜線、品牌標誌、產品示意圖（1080w WebP 裁切放在右側框內，不是整張設計稿），沒有右側說明欄。
- 圖上文字只是縮圖視覺；SEO 內容仍是 HTML。
- 品牌名稱在產生時讀取全站設定預設值；**品牌名稱變更後需重新執行 `pnpm og:generate`**。
- `BaseLayout` 輸出 `og:image`、`og:image:type`、`og:image:width=1200`、`og:image:height=630`、`og:image:alt`、`twitter:card=summary_large_image`、`twitter:image`、`twitter:image:alt`。
- 頁面對應：首頁 / 產品總覽 / 5 個產品頁 / Cases / Blog / About / Contact / Solutions 用各自 OG；一頁式子頁用 landing-page；Checkout、法律頁、404 用 default。
- 舊的 `public/og/default-og.svg` placeholder 保留但不再使用。

## 4. Logo / Favicon（TEMPORARY BRAND ASSET）

**目前沒有正式商標設計。** `public/brand/` 內是暫用的字標 placeholder（山形標誌 + 系統字型「森映 / SEN YING」），每個 SVG 都標註 `TEMPORARY BRAND ASSET`，不可視為正式商標。

| 檔案 | 用途 |
|---|---|
| `sen-ying-logo.svg` | 字標，深色背景（白字） |
| `sen-ying-logo-dark.svg` | 字標，淺色背景（深色字） |
| `sen-ying-mark.svg` | 圖形標誌，含 `<symbol id="sen-ying-mark">`，Header / Footer 以 `<use>` 引用 |
| `favicon.svg` | favicon |
| `favicon-32.png` / `favicon-192.png` / `apple-touch-icon.png` | `pnpm brand:generate` 由 favicon.svg 產生 |
| `sen-ying-logo-512.png` | JSON-LD Organization logo（點陣圖） |

- 正式 Logo 交付後：替換 `public/brand/*.svg` → `pnpm brand:generate` → `pnpm og:generate`；或在後台 `/admin/cms/site-settings` 填 Logo / Favicon URL。
- `public/favicon.svg`（Phase 2.6C 預設設定與 migration 0016 seed 的 `favicon_url`）保留，圖形與 `/brand/favicon.svg` 相同。

## 5. 品牌單一來源（Site Settings → fallback）

`apps/marketing/src/lib/brand-runtime.ts`：`resolveBrandSettings(settings)` / `getBrandRuntime()`

| 欄位 | 來源 |
|---|---|
| `nameZh` / `nameEn` / `displayName` | `site.brand` name_zh / name_en → `BRAND` 常數 |
| `logoUrl` | `site.brand.logo_url`（站內路徑或 https）→ `/brand/sen-ying-logo.svg` |
| `faviconUrl` | `site.brand.favicon_url` → `/brand/favicon.svg` |
| `sameAs` | `site.socials`（`resolveSameAsUrls`） |
| `seo` | JSON-LD 用：name、description、logo（自訂 Logo 或 `/brand/sen-ying-logo-512.png`）、sameAs |

使用者：`BrandLockup.astro`（Header / Footer 共用）、`BaseLayout`（title、og:site_name、OG alt、favicon）、各頁 JSON-LD（`brand.seo`）。
`BRAND` 常數保留，只作 fallback 與 `@syt/seo` 預設值。後台其他顯示仍由全站設定表單控制。

- Header / Footer：全站設定有 Logo URL → 輸出該圖片（`data-brand-logo`，品牌文字保留給螢幕閱讀器）；否則 → `<use href="/brand/sen-ying-mark.svg#sen-ying-mark">` + HTML 品牌文字（版面與 Phase 2.6C 相同）。
- 全站設定只在 build 時讀取；變更後需重新 build 官網。

## 6. SEO metadata

- `formatPageTitle()`（`packages/seo/src/metadata.ts`）：
  - 首頁（`titleTemplate: 'home'`）：`森映 SEN YING｜網站設計、電商建置與 SEO 數位工具`
  - 其他頁：`SEO 形象官網｜模板建站、後台自行更新內容｜森映 SEN YING`
  - 已含完整品牌名稱時不重複加。`titleIsFull` 已移除。
- `resolvePageSeo(input, siteUrl, { brandName })`：`og:site_name` 使用 runtime 品牌。

## 7. JSON-LD

- `organizationJsonLd(siteUrl, brand)`：`@id`（`{site}/#organization`）、name、url、description、logo（絕對網址）、sameAs（有網址才輸出）。
- `webSiteJsonLd`：`@id`、publisher → Organization `@id`。
- `serviceJsonLd` / `softwareApplicationJsonLd` / `articleJsonLd` / `webPageJsonLd`：provider / publisher / isPartOf 使用 runtime 品牌名稱。
- BreadcrumbList、FAQPage 維持由 BaseLayout 自動加入。

## 8. sameAs

`resolveSameAsUrls(socials)`（`packages/database/src/site-settings.ts`）：

- 只取 Facebook / Instagram / Threads / YouTube / TikTok；LINE（加好友連結）、Email、電話不放。
- 必須 enabled、網址通過 `isSafeSocialUrl`、http / https、不是 placeholder（example.com 系列、localhost、路徑為 example / @example、含 placeholder）。
- 預設設定尚未提供正式社群網址 → 目前**不輸出 sameAs**。

## 9. Canonical / Site URL

- 唯一來源：`SITE_PUBLIC_URL`（`apps/marketing/src/lib/site.ts` → `resolveSiteUrlState`）。
- 未設定（本機 / 預覽 build）：`http://localhost:4321` fallback、輸出 `<meta name="syt-site-url" content="local-fallback">`、全站 noindex。
- `SITE_ALLOW_INDEXING=true` 時網址缺少、是 localhost 或不是 https → build 失敗（`siteUrlIndexingProblem`，`packages/seo/src/site-url.ts`）。
- `astro.config.mjs` 不再寫入 localhost（未設定時 `site` 為 undefined）；`ASTRO_OUT_DIR` 只給 `pnpm seo:verify` 的驗收 build 使用。
- `turbo.json` build env 新增 `SITE_ALLOW_INDEXING`、`SITE_SETTINGS_MOCK_PRESET`（避免快取誤用不同設定的 build）。

## 10. 驗收

| 指令 | 內容 | 服務 / RWD |
|---|---|---|
| `pnpm asset:verify` | 圖片 / OG / Logo / Favicon 24 項 | 靜態，無 |
| `pnpm seo:verify` | SEO 20 項；預設 build + 正式網址設定 build（`https://staging.senying.test`、允許索引，輸出到 `.phase27-report/production-dist`，檢查完刪除） | 靜態，無 |
| `pnpm perf:verify` | 圖片 / 頁面預算、產生預算報告；`--browser` 以 Chrome 實測首頁與 5 個產品頁 | 靜態；`--browser` 啟動 1 個前台服務 |
| `pnpm phase27:static` | asset → seo → perf | 無 |
| `pnpm phase27:verify` | asset → seo → perf → global-ui → mockup → ui → phase2 | 完整 RWD 一次 |

RWD / TIME_WAIT：

- 原本 `phase26c:verify` 會跑 5 次 RWD：global-ui / mockup / ui 各一次 `rwd:check marketing`，phase2:verify 內 phase1:verify 一次完整 `rwd:check`，最後再一次完整 `rwd:check`。
- `phase27:verify`：global-ui / mockup / ui 加 `--skip-build --skip-rwd`；`phase2:verify` 內的 `phase1:verify` 改為 `--skip-rwd`。
  完整 `rwd:check`（前台 19 頁 + 後台，6 種寬度）整輪只跑一次，涵蓋原本所有 marketing RWD，覆蓋率不變。
- 進入 RWD 前後輸出 TCP TIME_WAIT 數量；輸出出現 `ERR_NO_BUFFER_SPACE` 時標示為 `ENV FAIL`（本機 socket 耗盡，不是產品錯誤），並提示 `pnpm phase27:verify --from <step>`。

既有驗收規則調整（Phase 2.6 暫行規則 → Phase 2.7）：

- `ui-ux-check.mjs`：og:image 從「暫用頁面 final 圖、寬度不可為 1200」改為「對應的 1200×630 正式 OG 圖」；`<img>` 規則排除 `data-brand-logo`（全站設定 Logo），允許 `BrandLockup.astro` 輸出自訂 Logo。
- `mockup-layout-check.mjs`：`<img src>` 必須在 `/images` 的規則排除 `data-brand-logo`。

## 11. 尚未完成

- 正式 Logo / 商標設計（目前 TEMPORARY BRAND ASSET）。
- 正式社群網址（sameAs 目前不輸出）。
- Supabase migration 0016 仍未套用（本階段未連線任何 Supabase、未 push migration）。
- 文章 / 案例真實素材與文章頁。
- Lighthouse CI。
