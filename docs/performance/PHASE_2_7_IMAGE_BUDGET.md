# Phase 2.7 圖片效能預算

> 由 `pnpm perf:verify` 產生（`scripts/perf-check.mjs`），請勿手動編輯。圖片轉檔：`pnpm images:optimize`；OG：`pnpm og:generate`。

## 1. 總覽（runtime 圖片，原尺寸）

| 項目 | PNG 原檔 | WebP | AVIF |
|---|---:|---:|---:|
| 16 張 runtime 圖片合計 | 29396.8 KB | 1840.2 KB（-93.7%） | 1195.0 KB（-95.9%） |

- 最大 runtime 變體：`/images/cases/case-visual-final.webp`（194.0 KB）
- 最大原尺寸 AVIF：`/images/products/promo-page-design/promo-page-examples-a-final.avif`（165.6 KB）
- PNG 原檔保留在 `apps/marketing/public/images`，只作為 `<img>` fallback；支援 AVIF / WebP 的瀏覽器不會下載 PNG。

## 2. 預算規則（理想值，不以犧牲畫質為代價）

| 類別 | 預算 |
|---|---|
| Hero（role=hero） | 原尺寸 WebP ≤ 350.0 KB、AVIF ≤ 250.0 KB |
| 一般卡片（role=card） | 1080w WebP ≤ 200.0 KB |
| 縮圖（所有圖片 640w） | WebP ≤ 120.0 KB |
| 背景（role=background） | 原尺寸 WebP ≤ 300.0 KB |
| OG | PNG ≤ 300.0 KB |
| 頁面 | 首頁 HTML ≤ 200.0 KB、其他 ≤ 250.0 KB；首屏圖片 ≤ 250.0 KB；全頁圖片 ≤ 1200.0 KB |
| 畫質 | 原尺寸 WebP / AVIF 對原始 PNG 的 PSNR ≥ 34 dB，不足時自動提高編碼品質 |

## 3. 每張 runtime 圖片

| 圖片 | 類別 | 尺寸 | PNG | WebP 原尺寸 | AVIF 原尺寸 | WebP 1080w | WebP 640w | 品質（WebP / AVIF） | PSNR（WebP / AVIF） | 預算 |
|---|---|---|---:|---:|---:|---:|---:|---|---|---|
| `/images/backgrounds/mountain-bright-bg-final.png` | background | 1672×941 | 2056.0 KB | 131.1 KB | 90.3 KB | 72.0 KB | 31.5 KB | q80 / q55 | 37.88 / 37.41 dB | OK |
| `/images/backgrounds/mountain-dark-bg-final.png` | background | 1672×941 | 2008.9 KB | 106.8 KB | 73.8 KB | 55.4 KB | 21.3 KB | q80 / q55 | 38.08 / 38.15 dB | OK |
| `/images/blog/blog-visual-final.png` | card | 1448×1086 | 1739.1 KB | 103.9 KB | 61.3 KB | 73.4 KB | 36.3 KB | q80 / q55 | 39.67 / 38.68 dB | OK |
| `/images/cases/case-visual-final.png` | hero | 1448×1086 | 2294.4 KB | 194.0 KB | 114.9 KB | 134.3 KB | 62.7 KB | q80 / q55 | 36.56 / 35.02 dB | OK |
| `/images/hero/home-hero-platform-ui-final.png` | hero | 1672×941 | 1889.8 KB | 108.3 KB | 72.0 KB | 59.3 KB | 27.8 KB | q80 / q55 | 38.58 / 37.92 dB | OK |
| `/images/products/ecommerce-website/ecommerce-backup-a-final.png` | card | 1448×1086 | 1642.5 KB | 100.4 KB | 59.8 KB | 70.6 KB | 35.0 KB | q80 / q55 | 39.05 / 37.51 dB | OK |
| `/images/products/ecommerce-website/ecommerce-backup-b-final.png` | card | 1672×941 | 1568.0 KB | 87.5 KB | 53.0 KB | 50.7 KB | 25.7 KB | q80 / q55 | 39.5 / 38.07 dB | OK |
| `/images/products/ecommerce-website/ecommerce-website-hero-final.png` | hero | 1672×941 | 1568.0 KB | 87.5 KB | 53.0 KB | 50.7 KB | 25.7 KB | q80 / q55 | 39.5 / 38.07 dB | OK |
| `/images/products/landing-page/landing-page-hero-final.png` | hero | 1672×941 | 2117.3 KB | 151.1 KB | 96.6 KB | 79.3 KB | 34.0 KB | q80 / q55 | 37.45 / 36.5 dB | OK |
| `/images/products/promo-page-design/promo-page-design-hero-final.png` | hero | 1672×941 | 1809.0 KB | 116.5 KB | 67.8 KB | 64.3 KB | 29.6 KB | q80 / q55 | 37.67 / 35.82 dB | OK |
| `/images/products/promo-page-design/promo-page-examples-a-final.png` | card | 1448×1086 | 2149.7 KB | 180.6 KB | 165.6 KB | 122.0 KB | 56.1 KB | q80 / q71 | 35.71 / 34.57 dB | OK |
| `/images/products/promo-page-design/promo-page-examples-b-final.png` | card | 1672×941 | 1809.0 KB | 116.5 KB | 67.8 KB | 64.3 KB | 29.6 KB | q80 / q55 | 37.67 / 35.82 dB | OK |
| `/images/products/seo-article-generator/seo-article-generator-hero-final.png` | hero | 1672×941 | 1538.1 KB | 97.1 KB | 53.4 KB | 54.7 KB | 25.6 KB | q80 / q55 | 38.87 / 37.58 dB | OK |
| `/images/products/seo-website/seo-website-hero-final.png` | hero | 1672×941 | 1903.4 KB | 105.2 KB | 67.4 KB | 56.0 KB | 25.7 KB | q80 / q55 | 38.62 / 38.09 dB | OK |
| `/images/templates/template-showcase-devices-final.png` | hero | 1672×941 | 1682.2 KB | 75.9 KB | 50.0 KB | 42.2 KB | 19.6 KB | q80 / q55 | 39.81 / 38.99 dB | OK |
| `/images/ui-mockups/admin-dashboard-seo-score-final.png` | hero | 1672×941 | 1621.3 KB | 77.8 KB | 48.3 KB | 43.8 KB | 21.4 KB | q80 / q55 | 39.97 / 39.27 dB | OK |

## 4. 主要頁面圖片載入（依 sizes / srcset 推算瀏覽器選到的 AVIF）

| 頁面 | HTML | eager / lazy | 首屏：手機 390px @3x / 桌機 1440px @1x / 桌機 1440px @2x | 全頁：手機 390px @3x / 桌機 1440px @1x / 桌機 1440px @2x | 單張最大候選 | 舊版全頁 PNG |
|---|---:|---|---|---|---|---:|
| `/` | 93.3 KB | 1 / 7 | 72.0 KB / 37.5 KB / 72.0 KB | 371.2 KB / 222.0 KB / 371.2 KB | 96.6 KB | 14563.9 KB |
| `/products` | 94.5 KB | 1 / 6 | 50.0 KB / 26.6 KB / 50.0 KB | 462.0 KB / 182.3 KB / 306.1 KB | 96.6 KB | 12627.1 KB |
| `/products/seo-website` | 72.2 KB | 1 / 2 | 67.4 KB / 34.7 KB / 67.4 KB | 175.9 KB / 123.7 KB / 175.9 KB | 73.8 KB | 5815.8 KB |
| `/products/landing-page` | 79.7 KB | 1 / 2 | 96.6 KB / 49.1 KB / 96.6 KB | 219.5 KB / 142.9 KB / 219.5 KB | 96.6 KB | 6243.5 KB |
| `/products/ecommerce-website` | 82.2 KB | 1 / 3 | 53.0 KB / 30.3 KB / 53.0 KB | 198.8 KB / 139.4 KB / 177.4 KB | 73.8 KB | 6787.4 KB |
| `/products/promo-page-design` | 76.4 KB | 1 / 3 | 67.8 KB / 37.5 KB / 67.8 KB | 375.0 KB / 181.1 KB / 291.8 KB | 165.6 KB | 7776.6 KB |
| `/products/seo-article-generator` | 76.1 KB | 1 / 2 | 53.4 KB / 30.7 KB / 53.4 KB | 175.5 KB / 131.2 KB / 175.5 KB | 73.8 KB | 5168.3 KB |
| `/cases` | 88.6 KB | 1 / 1 | 114.9 KB / 78.1 KB / 114.9 KB | 188.6 KB / 151.8 KB / 188.6 KB | 114.9 KB | 4303.3 KB |
| `/blog` | 56.9 KB | 0 / 1 | 0.0 KB / 0.0 KB / 0.0 KB | 61.3 KB / 41.6 KB / 61.3 KB | 61.3 KB | 1739.1 KB |
| `/about` | 69.1 KB | 1 / 1 | 90.3 KB / 47.4 KB / 90.3 KB | 164.0 KB / 121.2 KB / 164.0 KB | 90.3 KB | 4064.9 KB |
| `/contact` | 49.4 KB | 0 / 0 | 0.0 KB / 0.0 KB / 0.0 KB | 0.0 KB / 0.0 KB / 0.0 KB | 0.0 KB | 0.0 KB |
| `/solutions` | 56.0 KB | 0 / 1 | 0.0 KB / 0.0 KB / 0.0 KB | 73.8 KB / 73.8 KB / 73.8 KB | 73.8 KB | 2008.9 KB |

首屏圖片（eager）：

- `/`：`/images/hero/home-hero-platform-ui-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/hero/home-hero-platform-ui-final.avif` 72.0 KB）
- `/products`：`/images/templates/template-showcase-devices-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/templates/template-showcase-devices-final.avif` 50.0 KB）
- `/products/seo-website`：`/images/products/seo-website/seo-website-hero-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/products/seo-website/seo-website-hero-final.avif` 67.4 KB）
- `/products/landing-page`：`/images/products/landing-page/landing-page-hero-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/products/landing-page/landing-page-hero-final.avif` 96.6 KB）
- `/products/ecommerce-website`：`/images/products/ecommerce-website/ecommerce-website-hero-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/products/ecommerce-website/ecommerce-website-hero-final.avif` 53.0 KB）
- `/products/promo-page-design`：`/images/products/promo-page-design/promo-page-design-hero-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/products/promo-page-design/promo-page-design-hero-final.avif` 67.8 KB）
- `/products/seo-article-generator`：`/images/products/seo-article-generator/seo-article-generator-hero-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/products/seo-article-generator/seo-article-generator-hero-final.avif` 53.4 KB）
- `/cases`：`/images/cases/case-visual-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/cases/case-visual-final.avif` 114.9 KB）
- `/blog`：無
- `/about`：`/images/backgrounds/mountain-bright-bg-final.png`（fetchpriority=high，sizes=`(min-width: 1024px) 50vw, 100vw`；手機 @3x 選 `/images/backgrounds/mountain-bright-bg-final.avif` 90.3 KB）
- `/contact`：無
- `/solutions`：無

## 5. OG 圖

| 檔案 | 大小 | 預算 |
|---|---:|---|
| `apps/marketing/public/images/og/about-og-1200x630.png` | 152.4 KB | OK |
| `apps/marketing/public/images/og/blog-og-1200x630.png` | 144.6 KB | OK |
| `apps/marketing/public/images/og/cases-og-1200x630.png` | 172.5 KB | OK |
| `apps/marketing/public/images/og/contact-og-1200x630.png` | 140.0 KB | OK |
| `apps/marketing/public/images/og/default-og-1200x630.png` | 105.4 KB | OK |
| `apps/marketing/public/images/og/ecommerce-website-og-1200x630.png` | 137.6 KB | OK |
| `apps/marketing/public/images/og/home-og-1200x630.png` | 150.8 KB | OK |
| `apps/marketing/public/images/og/landing-page-og-1200x630.png` | 158.2 KB | OK |
| `apps/marketing/public/images/og/products-og-1200x630.png` | 137.0 KB | OK |
| `apps/marketing/public/images/og/promo-page-design-og-1200x630.png` | 137.3 KB | OK |
| `apps/marketing/public/images/og/seo-article-generator-og-1200x630.png` | 142.9 KB | OK |
| `apps/marketing/public/images/og/seo-website-og-1200x630.png` | 147.8 KB | OK |
| `apps/marketing/public/images/og/solutions-og-1200x630.png` | 137.8 KB | OK |

## 6. 超過預算的項目與原因

- 無。所有 runtime 圖片與 OG 圖都在預算內。

## 7. Chrome 實測（`pnpm perf:verify --browser`）

量測時間：2026-09-15T15:33:06.603Z（Chrome 152.0.7977.83，本機靜態服務，捲動到頁尾觸發所有 lazy 圖片）

| 情境 | 頁面 | 首屏圖片 | 全頁圖片 | 格式 | 下載 PNG |
|---|---|---:|---:|---|---|
| 手機 390×844 @3x | `/` | 223.7 KB（5 張） | 340.5 KB（7 張） | image/avif | 無 |
| 手機 390×844 @3x | `/products/seo-website` | 67.4 KB（1 張） | 175.9 KB（3 張） | image/avif | 無 |
| 手機 390×844 @3x | `/products/landing-page` | 96.6 KB（1 張） | 170.3 KB（2 張） | image/avif | 無 |
| 手機 390×844 @3x | `/products/ecommerce-website` | 53.0 KB（1 張） | 198.8 KB（4 張） | image/avif | 無 |
| 手機 390×844 @3x | `/products/promo-page-design` | 233.4 KB（2 張） | 375.0 KB（4 張） | image/avif | 無 |
| 手機 390×844 @3x | `/products/seo-article-generator` | 53.4 KB（1 張） | 175.5 KB（3 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/` | 119.5 KB（6 張） | 222.0 KB（8 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/products/seo-website` | 34.7 KB（1 張） | 123.7 KB（3 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/products/landing-page` | 49.1 KB（1 張） | 142.9 KB（3 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/products/ecommerce-website` | 30.3 KB（1 張） | 139.4 KB（4 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/products/promo-page-design` | 90.0 KB（2 張） | 181.1 KB（4 張） | image/avif | 無 |
| 桌機 1440×900 @1x | `/products/seo-article-generator` | 57.4 KB（2 張） | 131.2 KB（3 張） | image/avif | 無 |

## 8. 方法說明

- 靜態分析讀取 `apps/marketing/dist` 的 HTML，解析 `<picture>` 的 `<source srcset sizes>`，以「寬度 ≥ 顯示寬度 × DPR 的最小版本」推算瀏覽器選擇（實際選擇可能因快取與瀏覽器策略略有差異）。
- 「全頁」假設所有 lazy 圖片都被捲動載入，是上限值。
- 未包含字型、CSS、JS；JS / CSS 預算由 `pnpm ui:verify` 檢查。尚未執行 Lighthouse CI。
