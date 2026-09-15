# Phase 2.6B 森映官網 Mockup Layout Alignment

依 `docs/design/uiux-mockups/`（與 `docs/design/designer-handoff/` 內容相同）重構官網版型與區塊順序。設計稿右側「區塊說明」只作為版型規格，說明文字不放進正式網站；設計稿圖片不作為網站圖片來源。

## 版型對照

- 區塊順序與數量：`apps/marketing/src/content/mockupLayout.ts`（verification map，不會顯示在網站上）
- 產品頁區塊內容：`apps/marketing/src/content/productLayouts.ts`（sections 順序即頁面輸出順序）
- 首頁 / 產品總覽：`content/home.ts`、`content/productsOverview.ts`
- 驗收：`pnpm mockup:verify`（`scripts/mockup-layout-check.mjs`）比對 build 輸出的 `data-section` 順序

| 頁面 | 設計稿 | 區塊 |
|---|---|---|
| `/` | mockup-home-page.png | header → hero → brand-trust → featured-works → products → process → templates → cta → footer（+ faq） |
| `/products` | mockup-products-overview-page.png | header → hero → categories → product-cards → comparison → audience → quick-start → cta → footer（+ faq） |
| `/products/seo-website` | mockup-product-seo-website-page.png | hero → pain-points → solutions → process → industries → showcase → faq → cta → footer |
| `/products/landing-page` | mockup-product-landing-page.png | hero → scenarios → pain-points → modules → benefits → examples → process → faq → cta → footer |
| `/products/ecommerce-website` | mockup-product-ecommerce-website-page.png | hero → pain-points → solutions → features → process → industries → showcase → faq → cta → footer |
| `/products/promo-page-design` | mockup-product-promo-page-design-page.png | hero → featured-cases → scenarios → visual-benefits → services → process → style-examples → faq → cta → footer |
| `/products/seo-article-generator` | mockup-product-seo-article-generator-page.png | hero → pain-points → solutions → features → tool-ui → workflow → plans → faq → cta → footer |
| `/cases` | mockup-cases-page.png | hero → filters → search-sort → case-list → results → industries → pagination → cta → footer（+ faq） |
| `/blog` | mockup-blog-page.png | hero → categories → featured → posts → topics → subscribe → footer（+ faq） |
| `/checkout` | mockup-checkout-page.png | hero → plans → billing → payment-methods → access-code → order-summary → trust → faq → footer |

`（+ faq）`：設計稿沒有 FAQ，但 Phase 2.5 SEO 驗收要求每頁保留 FAQ 區塊與 FAQPage JSON-LD，以雙欄緊湊版放在 Final CTA 前，並在 mockupLayout.ts 的 `supplemental` 寫明原因。

## 共用元件（apps/marketing/src/components）

MockupAlignedHero、ProductHeroVisual、CategoryChips（+ ListFilter 漸進增強篩選 / 搜尋 / 排序）、DenseFeatureGrid、PainPointGrid、SolutionBand、ProcessTimeline、HorizontalShowcaseRail、PosterTile、ComparisonTable、IndustryCardGrid、ProofStatsBand、FinalCTA、SeoToolMock、IconGlyph、MountainBackdrop；Header / Footer / Section / SectionHeading / Breadcrumbs / FaqSection / FAQList / CaseCard / BlogCard 依設計稿調整。

## 不採用或改寫的設計稿內容

- 價格：設計稿的 NT$ 金額全部不採用，改為 `priceDisplay`（方案整理中 / 客製報價 / 開放前登記）與「正式價格以確認報價為準」。
- 成效數字：10,000+ 品牌用戶、99.9%、300%↑、98% 滿意度、+200% 等未經證實的數字全部移除；首頁信任列改為產品事實，Cases 成果區保留版面、數值改為整理中並標示「示意版面，正式案例數據待確認」。
- 客戶 logo 與客戶名稱：首頁品牌信任區改為「品牌類型」placeholder；作品 / 版型卡標示示意畫面、版型示意或設計示意。
- Checkout：付款方式、卡號欄位與「確認付款並開通」不採用；清楚標示目前尚未開放正式付款、付款流程為示意、銀行轉帳 / 綠界 / LINE Pay 為預留，付款按鈕停用並提供預約討論；不寫未確認的退款承諾。
- SEO 文章生產器：標示內部工具、依方案開放、AI 草稿需人工審稿、不保證排名。
- 電商網站：加上「目前第一版以展示與客製討論為主，正式金流串接依專案需求確認。」
- Blog：文章尚未發布，卡片標示即將發布、不連到不存在的文章頁；電子報表單為展示版本（停用送出）。
- 設計稿右側說明欄（區塊說明、設計重點、色彩規範）只作參考，不放進正式官網。

## 尚未處理

- 未使用的舊元件與內容（ComparisonSection、HeroProductMockup、MockAdminPanel、MockSeoArticleCard、PricingPreview、StatStrip、TemplatePreviewGrid、MockTemplateCard、content/hero.ts、content/templates.ts）尚未刪除，可在下一階段確認後清理。
- 案例、作品、版型卡的真實畫面需取得授權後替換。
- 1200×630 OG 圖、WebP / AVIF（Phase 2.7）。
- Header 搜尋目前導向部落格文章篩選，全站搜尋尚未實作。
