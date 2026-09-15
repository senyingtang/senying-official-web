# 森映 Design System（Phase 1）

## 色彩

| Token | Tailwind class | 色碼 | 用途 |
|---|---|---|---|
| navy black | `navy-black` | `#020617` | 前台 Hero / Footer 深底 |
| deep navy | `deep-navy` | `#0F172A` | Header、深色 CTA、後台側欄 |
| teal | `teal` | `#14B8A6` | 主要按鈕底色、重點 icon |
| teal strong | `teal-strong` | `#0F766E` | 白底上的青綠文字 / 邊框（對比 AA） |
| teal soft | `teal-soft` | `#F0FDFA` | 淺色強調底 |
| mist white | `mist-white` | `#F8FAFC` | 頁面背景 |
| surface | `surface` | `#FFFFFF` | 卡片 / 表單 |
| ink | `ink` | `#111827` | 主文字 |
| slate gray | `slate-gray` | `#64748B` | 次文字 |
| border gray | `border-gray` | `#E2E8F0` | 邊框 |
| success / warning / danger | `success` `warning` `danger`（文字用 `*-strong`） | `#10B981` `#F59E0B` `#EF4444` | 狀態 |

> 主要按鈕使用 teal 底 + navy-black 字。規劃書原本是 teal 底白字，但白字在 `#14B8A6` 上的對比不足 WCAG AA（約 2.5:1），改用深色字。

## RWD Breakpoints

| Tailwind | 寬度 | 對應裝置 |
|---|---:|---|
| （預設） | < 375 | 最小手機 |
| `xs:` | 375 | iPhone SE / mini |
| `sm:` | 430 | 大尺寸手機 |
| `md:` | 768 | 平板直向 |
| `lg:` | 1024 | 平板橫向 / 小筆電（後台側欄出現） |
| `xl:` | 1280 | 筆電 |
| `2xl:` | 1440 | 桌機 |

> 注意：已覆寫 Tailwind 預設 breakpoint（原 sm=640）。

## 元件原則

1. 行動優先：先寫手機樣式，再用 `md:` / `lg:` 往上加。
2. Grid 一律從 1 欄開始：`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`。
3. Flex 子元素加 `min-w-0`，長文字加 `break-words`，避免擠壓與溢出。
4. 按鈕 `max-w-full`，手機可 `w-full sm:w-auto`。
5. 表單欄位 `w-full min-w-0`，手機單欄，`md:` 以上才雙欄。
6. 表格外層 `overflow-x-auto`，只讓表格本身捲動，頁面不可出現水平捲軸。
7. Modal / Drawer：`max-h-[calc(100dvh-2rem)] overflow-y-auto`、寬度 `w-[calc(100%-2rem)] max-w-lg`。
8. 圖片：固定 `aspect-*` + `object-cover`，並寫 `width` / `height`。
9. 後台不加裝飾性漸層與插圖；前台保留品牌深色區塊。

## 共用 class（`src/variants.ts`）

- `buttonClass(variant, size)`：primary / secondary / dark / ghost / danger
- `cardClass`
- `inputClass`
- `badgeClass(tone)`
