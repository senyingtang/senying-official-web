# Phase 2.6C SEN YING Brand + Global Floating Actions + Cart Badge + Mobile Navigation UX

## 品牌

- 正式公開品牌：中文「森映」、英文「SEN YING」（全大寫）。
- 預設值：`packages/shared/src/constants/brand.ts`（SEO title、Organization / WebSite JSON-LD）與 `packages/database/src/site-settings.ts`（官網 Header / Footer / 浮動快捷列）。
- 官網 Header / Footer 讀取全站設定（`site.brand`）。~~SEO metadata 與 JSON-LD 目前仍使用 `BRAND` 常數~~ → Phase 2.7 起 SEO title、og:site_name、JSON-LD、Logo、Favicon 都改由 `apps/marketing/src/lib/brand-runtime.ts` 讀取全站設定，`BRAND` 只作 fallback（見 `docs/PHASE_2_7_BRAND_SEO_ASSET_NOTES.md`）。
- 驗收：`pnpm global-ui:verify` 第 20 項掃描 marketing dist / src、admin src 與預渲染輸出、packages。
- Legacy 白名單（非公開、不 rename）：`supabase/**` 與 `docs/**` 內的 seed slug（`mori-commerce`、`mori_ecommerce_site`）、內部既有專案盤點與歷史規劃文件。

## 全站設定資料

| setting_key | 內容 | 公開 |
|---|---|---|
| `site.brand` | name_zh / name_en / footer_name / logo_url / favicon_url | 是 |
| `site.socials` | items[]：platform、label、url、enabled、sort_order、open_in_new_tab、show_on_desktop、show_on_mobile | 是 |
| `site.floating_actions` | enabled、default_collapsed、desktop_enabled、mobile_enabled、cart{enabled, href, label, show_badge} | 是 |

- 資料表：DB SQL v2.0 既有的 `cms_site_settings`（RLS：`site_public_read` 公開讀 is_public；`cms_site_settings_admin_manage` owner / admin 寫入；後台其他角色唯讀）。
- Migration：`supabase/migrations/0016_marketing_site_settings.sql`（同步到 DB SQL v2.0 規格包），只新增設定資料列、更新 seed 商品的公開名稱，不變更 schema。**尚未套用到任何 Supabase 專案，不可 push 到正式專案。**
- Repository：`SiteSettingsRepository`（`repos.siteSettings`）；mock 讀取 mock 設定、儲存不寫入；supabase 以使用者 session 讀寫（RLS）。
- 官網 build：`apps/marketing/src/lib/site-settings.ts`；mock 使用預設設定，supabase 以 anon key 讀取公開設定（`@syt/database/public-site-settings`），不使用 service role。
- 社群網址規則：只接受 https / http、mailto:（Email）、tel:（電話）與站內路徑；enabled 但網址空白不顯示；javascript: 等不顯示。

## 後台 `/admin/cms/site-settings`

- owner / admin：可修改；editor / viewer：唯讀（PermissionNotice + 表單停用）；author：forbidden。
- 寫入：`saveSiteSettingsAction` 在伺服器端再檢查 `adminRouteMode` 與 `canAdmin(role, 'cms_settings', 'update')`，再以 `validateMarketingSiteSettings` 驗證；mock 模式驗證通過但不寫入。
- 官網是靜態 build：設定變更後需要重新建置官網才會套用。

## Floating Actions

- 元件：`apps/marketing/src/components/FloatingActions.astro`；互動：`src/lib/floating-actions-client.ts`（原生 TypeScript，無框架）。
- 桌機 ≥ 1024px：右側 18px、垂直置中的 glass rail；收合後為「SY」compact 按鈕。1024–1439px 內容右側預留 6rem（`.syt-rail-safe`），避免 rail 蓋住內容。
- 收合偏好：`localStorage['syt-floating-actions-collapsed']`；inline script 在模組載入前套用，localStorage 不可用時忽略。
- 手機 < 1024px：右下單一按鈕 + bottom sheet（role="dialog"、aria-modal、ESC / backdrop / 關閉按鈕、focus trap、scroll lock、safe-area-inset-bottom）。頁尾底部預留 5.5rem。
- 官網維持 Sticky Header + 漢堡選單，不使用 persistent Bottom Navigation；目前沒有手機 sticky CTA，未來新增時需與右下按鈕保持間距。

## 購物車 Badge

- 介面：`src/lib/cart.ts`（`CartSummary`、`syt:cart-updated` 事件、`formatCartBadge`）、`src/lib/cart-store.ts`（`CartCountStore`、`BrowserLocalCartCountStore`）。
- `BrowserLocalCartCountStore` 只是 badge 的 UI bridge（`localStorage['syt-cart-count']`），不是購物車後端；正式購物車上線時替換 adapter。
- 規則：0 不顯示、1–99 顯示數字、≥ 100 顯示 99+；展開 rail 的購物車項目、收合的 compact 按鈕、手機按鈕都顯示 badge；bottom sheet 顯示「購物車 N 件」。
- `cartEnabled = false`（目前預設）時完全不輸出購物車 UI，即使 localStorage 有數量。
- **完整購物車商品資料流（商品、數量變更、結帳）尚未實作。**

## Portal 行動版導覽（只記錄方向，本階段未實作）

- 未來手機版 Bottom Navigation：首頁 / 網站 / 編輯 / 發布 / 更多。
- 「更多」開 Bottom Sheet：SEO / 表單 / 網域 / 付款 / 客服 / 設定。
- TODO 位置：`apps/admin/src/lib/navigation.ts`（portalNav 註解）。

## 驗收

- `pnpm global-ui:verify`（`scripts/global-ui-check.mjs`）：預設 build + 驗收 build（`SITE_SETTINGS_MOCK_PRESET=verification`，example.com 網址、購物車開啟，只輸出到 `.global-ui-report/verification-dist`，結束前重新 build 預設版本）。
- `pnpm phase26c:verify`：global-ui:verify → mockup:verify → ui:verify → phase2:verify。
