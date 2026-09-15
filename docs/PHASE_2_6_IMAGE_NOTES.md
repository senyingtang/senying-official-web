# Phase 2.6：官網 final 圖片接入說明

> 範圍：`apps/marketing`。圖片唯一來源為 `docs/design/IMAGE_SELECTION_PLAN.csv` 的 `WebPath`。
> 本階段未連線 Supabase、未推 migration、未填正式 key、未部署。

## 1. 規則

- 圖片檔在 `apps/marketing/public/images/**`，前台只引用 `/images/...-final.png`。
- 集中管理在 `apps/marketing/src/content/media.ts`（label、src、alt、實際 width / height、purpose）。
- 一律透過 `ResponsiveImage.astro` 輸出 `<img>`（外框樣式用 `ImageFrame.astro`）：
  - build 時檢查 src 只能是小寫英數的 `/images/...`，擋下 `docs/design`、Windows 路徑、Downloads、空格與中文檔名。
  - 必填 alt、width、height；預設 `loading="lazy"`、`decoding="async"`。
  - 純裝飾背景使用空 alt，並自動加 `aria-hidden`。
- 圖片只做視覺輔助：H1、H2、內文、CTA、FAQ 與 JSON-LD 都保留文字。

## 2. 接入位置

| 圖片 | 頁面 / 區塊 | loading |
|---|---|---|
| home_hero | 首頁 Hero 右側（手機在文字下方） | eager + fetchpriority high |
| template_showcase | 首頁「版型商店預告」橫幅 | lazy |
| admin_dashboard_seo_score | 首頁「SEO 文章生產器」區塊 | lazy |
| background_dark | ContactCTA 背景（首頁、解決方案、案例、關於），深色 overlay | lazy |
| background_bright | 關於頁 Hero 右側 | eager + high |
| seo_website_hero | /products/seo-website Hero | eager + high |
| landing_page_hero | /products/landing-page Hero；一頁式子頁 og:image | eager + high |
| ecommerce_hero | /products/ecommerce-website Hero | eager + high |
| ecommerce_backup_a | /products/ecommerce-website「電商版型」區塊 | lazy |
| ecommerce_backup_b | /products「網站產品」分類橫幅 | lazy |
| promo_page_hero | /products/promo-page-design Hero | eager + high |
| promo_page_examples_a | /products/promo-page-design「視覺延伸」區塊 | lazy |
| promo_page_examples_b | /products「設計產品」分類 | lazy |
| seo_article_generator_hero | /products/seo-article-generator Hero | eager + high |
| blog_visual | /blog Hero 右側 | eager + high |
| case_visual | /cases Hero 右側 | eager + high |

## 3. 發現的狀況

- `ecommerce_backup_b` 與 `ecommerce_hero` 的檔案內容完全相同（SHA-256 一致）。
- `promo_page_examples_b` 與 `promo_page_hero` 的檔案內容完全相同（SHA-256 一致）。
- 為避免同一頁出現兩張一樣的圖，兩張 B 圖改放在 `/products` 產品目錄的分類區塊。
- `apps/marketing/public/images/` 內仍有未使用的非 final 原始檔（例如 `ui-mockups/01-mockup-*.png`、`*-hero.png`）。它們會被複製進 `dist`，但沒有任何頁面引用。
  - 建議確認後移出 `public`（本階段未刪除任何檔案）。

## 4. TODO

- [ ] **正式上線前製作 1200×630 OG 圖**。
  - 目前首頁、產品頁、Blog、Cases、一頁式子頁的 og:image 暫用對應 final 圖（1672×941 或 1448×1086，meta 標示實際尺寸）。
  - 其他頁面使用 `/og/default-og.svg` placeholder。
- [ ] **Phase 2.7：圖片壓縮與 WebP / AVIF 轉換**。
  - 目前 final 圖為 PNG，約 1.5–2.3 MB。
  - 可加 `srcset` / `sizes` 提供手機小尺寸。
  - 轉檔後把 `ui:verify` 的單張圖片預算從 2.5 MB 收緊。
- [ ] 清理 `public/images` 內未使用的非 final 原始檔。
- [ ] 案例頁取得授權後，替換為實際客戶畫面（目前 case_visual 為示意拼貼）。
