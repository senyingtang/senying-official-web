# 森映品牌官網 CMS 與 SEO 規劃書 v1.0

> 文件用途：作為森映品牌官網的產品規格、CMS 後台規劃、資料庫 SQL 規範、前台 UI/UX 與 SEO 頁面內容規劃依據。  
> 適用專案：森映品牌官網 / Mori Brand Website / Mori App Hub / 森映產品與服務入口  
> 建議技術方向：Next.js + Supabase/PostgreSQL + CMS Admin + Vercel

---

## 0. 本次確認方向

### 0.1 品牌定位

選擇：**C. 產品 + 服務混合型品牌**

森映品牌官網不只是一個形象網站，而是森映後續所有數位產品、App、內容、服務、案例與商業合作的母站。

它需要同時承接：

- 品牌形象
- 產品入口
- App Hub
- 網站建置服務
- App MVP 開發服務
- SEO 內容規劃服務
- CMS / 後台系統開發服務
- 電商網站展示
- 羽球排組平台展示
- AI 內容 / AI 漫劇展示
- 文章 SEO 流量
- 合作詢問轉換

---

### 0.2 視覺色系

已確認採用：**深藍黑 × 青綠 × 霧白**

| 類型 | 色碼 | 用途 |
|---|---:|---|
| Primary 主色 | `#0F172A` | Header、Footer、深色 CTA、重要區塊背景 |
| Secondary 副色 | `#14B8A6` | CTA、按鈕、重點文字、icon、連結 hover |
| Background 背景 | `#F8FAFC` | 頁面主背景 |
| Surface 卡片 | `#FFFFFF` | 卡片、表單、CMS 區塊 |
| Text 主文字 | `#111827` | 標題與主要內容 |
| Muted Text 次文字 | `#64748B` | 說明文字、meta、輔助資訊 |
| Border 邊框 | `#E2E8F0` | 卡片、表格、表單分隔線 |
| Success 成功 | `#10B981` | 成功狀態、上線狀態 |
| Warning 警示 | `#F59E0B` | 草稿、待審、提醒 |
| Error 錯誤 | `#EF4444` | 錯誤、刪除、下架提示 |

---

### 0.3 CMS 架構

選擇：**C. 混合式 CMS**

規劃方式：

- 首頁、產品頁、解決方案頁、案例頁：使用「區塊式 CMS」管理。
- 文章、FAQ、一般頁面：使用「整頁式 CMS」管理。
- SEO Meta、OG、Schema、CTA、FAQ：獨立資料表管理，可重複掛載到不同頁面。

---

### 0.4 後台角色

選擇：**C. owner / admin / editor / author / viewer**

| 角色 | 說明 |
|---|---|
| owner | 最高權限，可管理所有設定、角色、站點、SEO、刪除資料 |
| admin | 可管理內容、頁面、產品、案例、文章與大部分後台功能 |
| editor | 可編輯頁面、產品、案例、文章、FAQ，但不可調整系統設定 |
| author | 只能新增與編輯自己撰寫的文章 |
| viewer | 只能查看後台資料與報表，不能修改 |

---

### 0.5 服務價格策略

選擇：**B. 公開基礎方案，不公開客製價格**

前台呈現方式：

- 顯示基礎服務方向與「起始價格」或「適合對象」。
- 客製專案不直接列死價格，改以「取得初步建議」「預約討論」「索取報價」作為 CTA。

---

### 0.6 第一版主選單

選擇：**B. 首頁 / 產品與 App / 解決方案 / 案例 / 文章 / 關於森映 / 聯絡我們**

建議 Header：

```txt
首頁｜產品與 App｜解決方案｜案例｜文章｜關於森映｜聯絡我們｜預約討論
```

---

## 1. 森映品牌官網核心定位

### 1.1 網站角色

森映品牌官網是森映所有數位作品的母站，負責把不同產品與服務集中展示，並建立品牌信任。

它不是單純介紹公司，而是要完成以下任務：

1. 讓訪客快速理解森映正在做什麼。
2. 展示已完成或正在發展的產品。
3. 呈現網站、App、SEO、CMS、系統開發等服務能力。
4. 建立文章內容中心，長期累積 SEO 流量。
5. 承接合作詢問、專案詢問與 App / 產品導流。
6. 未來可作為 Mori Account、App Hub、作品展示與內容 IP 的入口。

---

### 1.2 首頁主軸文案方向

避免使用以下制式語氣：

- 專注於
- 致力於
- 打造全方位解決方案
- 賦能企業
- 提供一站式服務
- 引領數位轉型

建議使用自然、直接、像真人說話的品牌語氣。

### 首頁 H1 建議

```txt
把網站、App 和內容，做成真的能用的產品
```

### 首頁副標建議

```txt
森映把品牌官網、App、內容與後台整理成可上線、可管理、可持續經營的數位產品。
```

### CTA 建議

```txt
預約討論
探索解決方案
查看案例
```

---

## 2. 網站資訊架構 Sitemap

### 2.1 第一版 Sitemap

```txt
/
首頁

/products
產品與 App

/products/brand-website
品牌官網

/products/badminton-platform
羽球排組平台

/products/mori-commerce
Mori 電商網站

/products/tools-app
工具 App

/products/ai-content
AI 內容與漫劇

/solutions
解決方案

/solutions/website
網站建置

/solutions/app-mvp
App MVP 開發

/solutions/seo-content
SEO 內容規劃

/solutions/cms-system
CMS / 後台系統

/cases
案例

/cases/[slug]
案例詳細頁

/blog
文章

/blog/category/[slug]
文章分類頁

/blog/[slug]
文章詳細頁

/about
關於森映

/contact
聯絡我們

/faq
常見問題
```

---

### 2.2 第二版可擴充 Sitemap

```txt
/app-hub
森映 App Hub

/app-hub/[slug]
單一 App 介紹頁

/ai-drama
AI 漫劇作品集

/ai-drama/[slug]
AI 漫劇作品詳細頁

/resources
資源中心

/resources/templates
範本下載

/resources/guides
教學指南

/pricing
服務方案

/mori-account
Mori Account 介紹
```

---

## 3. 前台 UI/UX 風格規範

### 3.1 整體風格

風格關鍵字：

- 乾淨
- 現代
- SaaS 感
- 產品化
- 品牌可信任
- 可擴充
- 不過度科技冷感

---

### 3.2 Layout 規範

| 項目 | 建議 |
|---|---|
| 最大寬度 | `1200px` 或 `1280px` |
| 桌機 Section Padding | 上下 `72px - 96px` |
| 手機 Section Padding | 上下 `48px - 64px` |
| 卡片圓角 | `16px - 24px` |
| Button 圓角 | `10px - 14px` |
| Card Shadow | 柔和陰影，不使用厚重黑影 |
| Header | 深色背景 + Sticky |
| Footer | 深藍黑背景 + 多欄資訊 |

---

### 3.3 Typography 建議

```txt
中文：Noto Sans TC / 思源黑體
英文：Inter / system-ui
數字：Inter / tabular-nums
```

### 字級建議

| 元件 | 桌機 | 手機 |
|---|---:|---:|
| H1 | 48px - 64px | 34px - 42px |
| H2 | 32px - 40px | 28px - 32px |
| H3 | 22px - 28px | 20px - 24px |
| Body | 16px - 18px | 16px |
| Small | 14px | 13px - 14px |

---

### 3.4 Button 樣式

#### Primary Button

```txt
背景：#14B8A6
文字：#FFFFFF
Hover：#0D9488
用途：預約討論、送出表單、主要 CTA
```

#### Secondary Button

```txt
背景：透明 / 白色
邊框：#14B8A6
文字：#0F766E
Hover 背景：#F0FDFA
用途：探索解決方案、查看案例
```

#### Dark Button

```txt
背景：#0F172A
文字：#FFFFFF
Hover：#1E293B
用途：深色 CTA 區塊
```

---

### 3.5 Card 規範

卡片可用於：產品、服務、案例、文章、FAQ、Dashboard mock。

```txt
背景：#FFFFFF
邊框：1px solid #E2E8F0
圓角：20px
Padding：24px
陰影：0 12px 30px rgba(15, 23, 42, 0.06)
Hover：上移 2px + shadow 增強
```

---

## 4. 首頁區塊規劃

### 4.1 首頁 Section 順序

```txt
1. Hero 主視覺
2. 信任指標 / 特點短列
3. 產品與 App 概覽
4. 解決方案
5. 精選案例
6. 文章 / 洞察
7. 常見問題
8. CTA Banner
9. Footer
```

---

### 4.2 Hero Section

#### H1

```txt
把網站、App 和內容，做成真的能用的產品
```

#### Description

```txt
森映把品牌官網、App、內容與後台整理成可上線、可管理、可持續經營的數位產品。
```

#### CTA

- 預約討論
- 探索解決方案

#### 右側視覺建議

使用 Dashboard-style mock 卡片：

- 專案總覽
- 網站流量
- 聯絡表單
- 專案進度
- 最近動態
- 技術支援

這能讓訪客感覺森映不是只做展示型網站，而是能處理資料、後台與產品營運。

---

### 4.3 產品與 App 概覽

建議卡片：

| 名稱 | 描述 |
|---|---|
| 品牌官網 | 打造專業品牌形象，清楚傳遞服務與價值 |
| 羽球排組平台 | 場次建立、報名候補、球團管理與 App 化延伸 |
| 電商網站 | 商品展示、金流串接、訂單與庫存管理 |
| 工具 App | 以小型工具、遊戲或效率功能累積下載與使用者 |
| AI 內容 | 文章、影片、短劇與內容資產管理 |

---

### 4.4 解決方案

| 名稱 | SEO 關鍵字 | 描述 |
|---|---|---|
| 網站建置 | 網站建置、品牌官網、形象網站 | 從品牌網站、RWD 頁面到後台管理，讓網站能上線也能被維護 |
| App MVP 開發 | App 開發、MVP 開發、iOS Android App | 用最小可行產品快速驗證功能與市場反應 |
| SEO 內容規劃 | SEO 服務、SEO 內容、關鍵字規劃 | 透過頁面架構、文章主題與內部連結累積搜尋流量 |
| CMS / 後台系統 | CMS 系統、後台系統、客製化系統 | 讓頁面、產品、案例、文章與表單都能從後台調整 |

---

### 4.5 精選案例

第一版建議至少放：

1. 羽球排組平台
2. Mori 電商網站
3. 森映品牌官網

案例頁應呈現：

- 專案背景
- 遇到的問題
- 解決方式
- 技術架構
- 成果指標
- 延伸計畫
- CTA

---

### 4.6 文章 / 洞察

首頁顯示最新 3 篇文章。

建議分類：

- 網站建置
- App 開發
- SEO 內容
- CMS 後台
- AI 內容
- 羽球平台營運
- 品牌經營

---

### 4.7 FAQ

首頁先顯示 4 題：

1. 專案一般需要多久時間？
2. 可以只開發部分功能嗎？
3. 後台系統是否容易操作？
4. 如何開始一個專案？

---

### 4.8 CTA Banner

#### Heading

```txt
準備好打造下一個好產品了嗎？
```

#### Description

```txt
與森映聊聊你的想法，我們會先整理需求、評估範圍，再一起決定最適合的做法。
```

#### Button

- 預約討論
- 了解服務流程

---

## 5. 各分頁 SEO 規劃

---

## 5.1 首頁 `/`

### SEO Title

```txt
森映 Mori｜網站、App、內容與後台系統開發
```

### Meta Description

```txt
森映把品牌官網、App、內容與後台整理成可上線、可管理、可持續經營的數位產品，協助品牌建立網站、App、SEO 內容與 CMS 系統。
```

### H1

```txt
把網站、App 和內容，做成真的能用的產品
```

### H2 建議

```txt
產品與 App 概覽
解決方案
精選案例
文章與洞察
常見問題
```

### 主要關鍵字

```txt
森映
森映 Mori
網站建置
App 開發
SEO 內容規劃
CMS 後台系統
數位產品開發
```

### CTA

```txt
預約討論
探索解決方案
查看案例
```

### Schema

- Organization
- WebSite
- BreadcrumbList
- FAQPage

---

## 5.2 產品與 App `/products`

### SEO Title

```txt
產品與 App｜森映 Mori 數位產品與工具入口
```

### Meta Description

```txt
查看森映的品牌官網、羽球排組平台、電商網站、工具 App 與 AI 內容作品，了解每個產品如何連接網站、App、後台與內容營運。
```

### H1

```txt
森映產品與 App
```

### 頁面內容區塊

1. 產品總覽 Hero
2. 產品分類篩選
3. 品牌官網
4. 羽球排組平台
5. Mori 電商網站
6. 工具 App
7. AI 內容與漫劇
8. 產品 Roadmap
9. CTA

### 主要關鍵字

```txt
App 產品
工具 App
羽球 App
排組系統
電商網站
AI 內容
品牌官網
```

---

## 5.3 羽球排組平台 `/products/badminton-platform`

### SEO Title

```txt
羽球排組平台｜臨打報名、候補通知與球團管理系統
```

### Meta Description

```txt
森映羽球排組平台提供場次建立、球友報名、候補通知、LINE 綁定與未來 App 化功能，協助球團減少文字接龍與人工管理成本。
```

### H1

```txt
羽球排組平台，讓臨打報名不用再靠文字接龍
```

### H2 建議

```txt
為什麼需要羽球排組平台
核心功能
LINE 綁定與候補通知
免費建立場次與廣告獎勵
未來 App 化規劃
適合哪些球團使用
常見問題
```

### 主要關鍵字

```txt
羽球排組平台
羽球報名系統
臨打報名系統
羽球候補通知
LINE 羽球報名
羽球 App
球團管理系統
```

### 內容重點

- 傳統文字接龍容易漏報、重複報名、候補混亂。
- 平台提供建立場次、報名、候補、通知、管理後台。
- 使用者可透過觀看廣告獲得免費建立場次資格。
- 後續可上架 iOS / Android App。

### FAQ 建議

```txt
Q1：這個平台可以取代 LINE 群組接龍嗎？
A1：可以協助球團把報名、候補與通知流程系統化，LINE 群組仍可作為公告與互動空間。

Q2：觀看廣告可以免費建立場次嗎？
A2：可以，使用者需明確點選觀看廣告，廣告完成後獲得免費建立場次資格。

Q3：平台會有 App 嗎？
A3：規劃會將羽球排組平台延伸為 iOS 與 Android App，方便球友直接下載使用。
```

### Schema

- Product
- SoftwareApplication
- FAQPage
- BreadcrumbList

---

## 5.4 Mori 電商網站 `/products/mori-commerce`

### SEO Title

```txt
Mori 電商網站｜品牌商品展示、金流與訂單管理
```

### Meta Description

```txt
Mori 電商網站提供商品展示、購物流程、金流串接、訂單管理與後台 CMS，適合作為品牌電商、形象展示與銷售入口。
```

### H1

```txt
Mori 電商網站，讓商品展示與訂單管理更清楚
```

### H2 建議

```txt
電商網站適合誰使用
商品與分類架構
金流與訂單流程
後台管理功能
與森映品牌官網的整合
常見問題
```

### 主要關鍵字

```txt
電商網站
品牌電商
商品展示網站
購物車系統
金流串接
訂單管理
CMS 電商網站
```

---

## 5.5 解決方案 `/solutions`

### SEO Title

```txt
解決方案｜網站建置、App MVP、SEO 內容與 CMS 後台系統
```

### Meta Description

```txt
森映提供網站建置、App MVP 開發、SEO 內容規劃與 CMS 後台系統，適合需要品牌官網、產品網站、App 雛形與內容經營的團隊。
```

### H1

```txt
從網站、App 到後台，把想法整理成可執行的方案
```

### H2 建議

```txt
網站建置
App MVP 開發
SEO 內容規劃
CMS / 後台系統
如何選擇適合的方案
服務流程
常見問題
```

---

## 5.6 網站建置 `/solutions/website`

### SEO Title

```txt
網站建置服務｜品牌官網、形象網站與 CMS 後台規劃
```

### Meta Description

```txt
森映網站建置服務協助品牌建立可管理、可擴充、具備 SEO 基礎的網站，包含品牌官網、產品頁、案例頁、文章系統與 CMS 後台。
```

### H1

```txt
網站建置不只要好看，也要能被管理和搜尋
```

### H2 建議

```txt
網站建置包含哪些內容
品牌官網與形象網站差異
CMS 後台管理
SEO 基礎設定
適合對象
服務流程
常見問題
```

### 主要關鍵字

```txt
網站建置
品牌官網
形象網站
CMS 網站
SEO 網站建置
RWD 網站
```

---

## 5.7 App MVP 開發 `/solutions/app-mvp`

### SEO Title

```txt
App MVP 開發｜iOS、Android 與跨平台 App 雛形開發
```

### Meta Description

```txt
森映 App MVP 開發協助將產品想法整理成可測試的 iOS、Android 或跨平台 App，適合工具 App、報名系統、小型平台與早期產品驗證。
```

### H1

```txt
先做出能測試的 App，再決定下一步怎麼長大
```

### H2 建議

```txt
什麼是 App MVP
適合先做 MVP 的情境
iOS 與 Android 開發規劃
會員、訂閱與廣告模式
上架前需要準備什麼
常見問題
```

### 主要關鍵字

```txt
App MVP 開發
App 開發
iOS App 開發
Android App 開發
跨平台 App
Expo App
React Native App
```

---

## 5.8 SEO 內容規劃 `/solutions/seo-content`

### SEO Title

```txt
SEO 內容規劃｜關鍵字、文章架構與搜尋流量成長
```

### Meta Description

```txt
森映 SEO 內容規劃協助品牌建立關鍵字策略、文章主題、內部連結與頁面結構，讓網站逐步累積搜尋曝光與自然流量。
```

### H1

```txt
讓網站不只上線，也能慢慢被更多人找到
```

### H2 建議

```txt
SEO 內容規劃包含什麼
關鍵字研究
文章主題地圖
頁面與文章內部連結
內容更新節奏
常見問題
```

### 主要關鍵字

```txt
SEO 內容規劃
SEO 服務
關鍵字規劃
SEO 文章
內容行銷
自然流量
```

---

## 5.9 CMS / 後台系統 `/solutions/cms-system`

### SEO Title

```txt
CMS 後台系統開發｜頁面、文章、產品與案例管理
```

### Meta Description

```txt
森映 CMS 後台系統可管理首頁區塊、頁面內容、SEO Meta、產品、案例、文章、FAQ 與聯絡表單，讓網站內容不必每次都改程式碼。
```

### H1

```txt
讓網站內容可以自己調整，不必每次都改程式碼
```

### H2 建議

```txt
CMS 後台可以管理哪些內容
頁面區塊管理
SEO Meta 與 OG 管理
角色權限
表單與詢問紀錄
常見問題
```

### 主要關鍵字

```txt
CMS 後台系統
後台系統開發
內容管理系統
客製化 CMS
網站後台
SEO Meta 管理
```

---

## 5.10 案例列表 `/cases`

### SEO Title

```txt
案例｜森映網站、App、電商與系統開發作品
```

### Meta Description

```txt
查看森映的網站、App、電商、羽球平台與 CMS 系統案例，了解不同專案如何從需求整理、設計開發到正式上線。
```

### H1

```txt
森映案例
```

### 案例分類

- 網站建置
- App / 平台
- 電商網站
- SEO 內容
- CMS 後台
- AI 內容

---

## 5.11 文章列表 `/blog`

### SEO Title

```txt
文章｜網站建置、App 開發、SEO 與內容經營筆記
```

### Meta Description

```txt
森映文章整理網站建置、App 開發、SEO 內容、CMS 後台、AI 內容與數位產品經營相關觀點，協助品牌規劃可長期經營的數位資產。
```

### H1

```txt
網站、App 與內容經營筆記
```

### 文章分類

```txt
網站建置
App 開發
SEO 內容
CMS 後台
AI 內容
羽球平台營運
品牌經營
```

---

## 5.12 關於森映 `/about`

### SEO Title

```txt
關於森映｜從網站、App 到內容作品的數位產品品牌
```

### Meta Description

```txt
森映整理網站、App、內容與後台系統，將想法轉成可上線、可管理、可持續經營的數位產品，並持續發展 App、平台與 AI 內容作品。
```

### H1

```txt
關於森映
```

### H2 建議

```txt
森映在做什麼
我們怎麼看待網站與 App
目前正在發展的產品
服務與合作方式
未來方向
```

---

## 5.13 聯絡我們 `/contact`

### SEO Title

```txt
聯絡森映｜網站、App、SEO 與系統開發合作詢問
```

### Meta Description

```txt
想討論網站建置、App MVP、SEO 內容規劃、CMS 後台系統或品牌產品開發，歡迎透過表單聯絡森映。
```

### H1

```txt
和森映聊聊你的想法
```

### 表單欄位

- 姓名
- 公司 / 品牌名稱
- Email
- 電話 / LINE
- 想討論的項目
- 預算範圍
- 需求描述
- 如何得知森映

---

## 6. CMS 後台功能規劃

### 6.1 CMS Admin 主選單

```txt
儀表板
頁面管理
首頁區塊
產品與 App
解決方案
案例管理
文章管理
分類與標籤
FAQ 管理
CTA 管理
媒體庫
SEO 管理
選單管理
表單詢問
使用者與權限
站點設定
操作紀錄
```

---

### 6.2 儀表板 Dashboard

顯示：

- 本月詢問數
- 本月文章新增數
- 已上架頁面數
- 草稿頁面數
- 最近表單詢問
- 最近更新內容
- SEO 缺漏提醒
- CTA 點擊數

---

### 6.3 頁面管理

可管理：

- 頁面標題
- Slug
- 頁面狀態
- 頁面類型
- 所屬模板
- SEO Meta
- OG 圖片
- Canonical URL
- 是否收錄
- 發布時間
- 排序

---

### 6.4 首頁區塊管理

首頁採用區塊式 CMS。

可管理欄位：

- Section 類型
- Section 標題
- Section 副標
- Section 內容 JSON
- CTA 按鈕
- 圖片 / Icon
- 排序
- 是否啟用
- 裝置顯示設定

首頁 Section 類型：

```txt
hero
feature_bar
product_grid
solution_grid
case_slider
blog_preview
faq_preview
cta_banner
custom_html
```

---

### 6.5 產品與 App 管理

可管理：

- 產品名稱
- Slug
- 短描述
- 詳細描述
- Icon
- 封面圖
- 產品狀態
- 產品分類
- 外部連結
- App Store 連結
- Google Play 連結
- 技術標籤
- 功能列表
- FAQ
- SEO Meta

---

### 6.6 解決方案管理

可管理：

- 服務名稱
- Slug
- 短描述
- 適合對象
- 服務內容
- 交付項目
- 起始價格文字
- 是否顯示價格
- CTA
- FAQ
- SEO Meta

---

### 6.7 案例管理

可管理：

- 案例名稱
- 客戶 / 專案名稱
- 案例分類
- 封面圖
- 摘要
- 背景問題
- 解決方式
- 技術架構
- 成果指標
- 圖片集
- 相關服務
- 相關產品
- SEO Meta

---

### 6.8 文章管理

可管理：

- 標題
- Slug
- 摘要
- 內文 Markdown / Rich Text
- 分類
- 標籤
- 作者
- 封面圖
- SEO Title
- Meta Description
- OG 圖
- Canonical
- 發布時間
- 草稿 / 已發布 / 排程

---

### 6.9 SEO 管理

可管理：

- SEO Title
- Meta Description
- Canonical URL
- OG Title
- OG Description
- OG Image
- Robots 設定
- Schema JSON-LD
- Redirect 301 / 302
- Sitemap 是否收錄

---

### 6.10 表單詢問管理

可管理：

- 詢問人姓名
- Email
- 電話 / LINE
- 公司 / 品牌
- 需求類型
- 預算範圍
- 內容
- 來源頁面
- UTM 來源
- 狀態
- 負責人
- 備註

狀態：

```txt
new
contacted
qualified
proposal_sent
won
lost
spam
```

---

## 7. DB SQL 規範

以下 SQL 以 Supabase PostgreSQL 為基礎規劃。

---

## 7.1 Enum Types

```sql
create type public.cms_publish_status as enum (
  'draft',
  'scheduled',
  'published',
  'archived'
);

create type public.cms_admin_role as enum (
  'owner',
  'admin',
  'editor',
  'author',
  'viewer'
);

create type public.lead_status as enum (
  'new',
  'contacted',
  'qualified',
  'proposal_sent',
  'won',
  'lost',
  'spam'
);

create type public.redirect_type as enum (
  '301',
  '302'
);
```

---

## 7.2 Admin Profiles

```sql
create table public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  role public.cms_admin_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_admin_profiles_user_id on public.admin_profiles(user_id);
create index idx_admin_profiles_role on public.admin_profiles(role);
```

---

## 7.3 Site Settings

```sql
create table public.cms_site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

建議 setting_key：

```txt
site_identity
brand_colors
social_links
contact_info
footer_settings
default_seo
analytics_settings
```

---

## 7.4 Assets 媒體庫

```sql
create table public.cms_assets (
  id uuid primary key default gen_random_uuid(),
  bucket text not null default 'cms',
  file_path text not null,
  public_url text,
  file_name text,
  mime_type text,
  file_size bigint,
  alt_text text,
  caption text,
  width int,
  height int,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cms_assets_mime_type on public.cms_assets(mime_type);
create index idx_cms_assets_created_at on public.cms_assets(created_at desc);
```

---

## 7.5 Pages 頁面

```sql
create table public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  page_type text not null default 'standard',
  template_key text,
  excerpt text,
  content markdown,
  status public.cms_publish_status not null default 'draft',
  is_indexable boolean not null default true,
  published_at timestamptz,
  scheduled_at timestamptz,
  sort_order int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cms_pages_slug on public.cms_pages(slug);
create index idx_cms_pages_status on public.cms_pages(status);
create index idx_cms_pages_page_type on public.cms_pages(page_type);
```

> 注意：PostgreSQL 沒有內建 markdown 型別，實作時可改為 `text`。此處 `markdown` 僅代表內容用途，正式 SQL 建議使用 `text`。

正式版本建議修正為：

```sql
alter table public.cms_pages alter column content type text;
```

---

## 7.6 Page Sections 區塊

```sql
create table public.cms_page_sections (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.cms_pages(id) on delete cascade,
  section_key text not null,
  section_type text not null,
  title text,
  subtitle text,
  content jsonb not null default '{}'::jsonb,
  asset_id uuid references public.cms_assets(id) on delete set null,
  cta_primary jsonb,
  cta_secondary jsonb,
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  visibility jsonb not null default '{"desktop": true, "tablet": true, "mobile": true}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cms_page_sections_page_id on public.cms_page_sections(page_id);
create index idx_cms_page_sections_type on public.cms_page_sections(section_type);
create index idx_cms_page_sections_sort on public.cms_page_sections(page_id, sort_order);
```

---

## 7.7 SEO Metadata

```sql
create table public.seo_metadata (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  seo_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_image_id uuid references public.cms_assets(id) on delete set null,
  robots text default 'index,follow',
  schema_json jsonb,
  focus_keywords text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(entity_type, entity_id)
);

create index idx_seo_metadata_entity on public.seo_metadata(entity_type, entity_id);
```

---

## 7.8 Redirects

```sql
create table public.seo_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_url text not null,
  redirect_type public.redirect_type not null default '301',
  is_active boolean not null default true,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_seo_redirects_from_path on public.seo_redirects(from_path);
```

---

## 7.9 Blog Categories

```sql
create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 7.10 Blog Tags

```sql
create table public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
```

---

## 7.11 Blog Posts

```sql
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_asset_id uuid references public.cms_assets(id) on delete set null,
  category_id uuid references public.blog_categories(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  status public.cms_publish_status not null default 'draft',
  is_featured boolean not null default false,
  reading_time_minutes int,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_blog_posts_slug on public.blog_posts(slug);
create index idx_blog_posts_status on public.blog_posts(status);
create index idx_blog_posts_published_at on public.blog_posts(published_at desc);
create index idx_blog_posts_category_id on public.blog_posts(category_id);
```

---

## 7.12 Blog Post Tags

```sql
create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key(post_id, tag_id)
);
```

---

## 7.13 Products

```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  product_type text not null default 'web',
  short_description text,
  description text,
  cover_asset_id uuid references public.cms_assets(id) on delete set null,
  icon_asset_id uuid references public.cms_assets(id) on delete set null,
  external_url text,
  app_store_url text,
  google_play_url text,
  github_url text,
  status public.cms_publish_status not null default 'draft',
  sort_order int not null default 0,
  tech_stack text[],
  launched_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_products_slug on public.products(slug);
create index idx_products_status on public.products(status);
create index idx_products_product_type on public.products(product_type);
```

---

## 7.14 Product Features

```sql
create table public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  description text,
  icon text,
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_product_features_product_id on public.product_features(product_id);
```

---

## 7.15 Services / Solutions

```sql
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  target_audience text,
  deliverables jsonb,
  starting_price_text text,
  show_price boolean not null default true,
  cover_asset_id uuid references public.cms_assets(id) on delete set null,
  icon text,
  status public.cms_publish_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_services_slug on public.services(slug);
create index idx_services_status on public.services(status);
```

---

## 7.16 Service Features

```sql
create table public.service_features (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  title text not null,
  description text,
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);
```

---

## 7.17 Case Studies

```sql
create table public.case_studies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  client_name text,
  project_type text,
  excerpt text,
  background text,
  challenge text,
  solution text,
  result_summary text,
  content text,
  cover_asset_id uuid references public.cms_assets(id) on delete set null,
  status public.cms_publish_status not null default 'draft',
  is_featured boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_case_studies_slug on public.case_studies(slug);
create index idx_case_studies_status on public.case_studies(status);
create index idx_case_studies_featured on public.case_studies(is_featured);
```

---

## 7.18 Case Metrics

```sql
create table public.case_metrics (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.case_studies(id) on delete cascade,
  label text not null,
  value text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
```

---

## 7.19 FAQs

```sql
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  question text not null,
  answer text not null,
  category text,
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_faqs_entity on public.faqs(entity_type, entity_id);
create index idx_faqs_category on public.faqs(category);
```

---

## 7.20 CTA Blocks

```sql
create table public.cta_blocks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  title text not null,
  description text,
  primary_label text,
  primary_url text,
  secondary_label text,
  secondary_url text,
  background_type text default 'dark',
  asset_id uuid references public.cms_assets(id) on delete set null,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 7.21 Navigation Menus

```sql
create table public.cms_navigation_menus (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  key text not null unique,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cms_navigation_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.cms_navigation_menus(id) on delete cascade,
  parent_id uuid references public.cms_navigation_items(id) on delete cascade,
  label text not null,
  url text not null,
  target text default '_self',
  sort_order int not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_cms_navigation_items_menu_id on public.cms_navigation_items(menu_id);
create index idx_cms_navigation_items_parent_id on public.cms_navigation_items(parent_id);
```

---

## 7.22 Contact Inquiries

```sql
create table public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company_name text,
  email text not null,
  phone text,
  line_id text,
  inquiry_type text,
  budget_range text,
  message text not null,
  source_path text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  status public.lead_status not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  internal_note text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_contact_inquiries_status on public.contact_inquiries(status);
create index idx_contact_inquiries_created_at on public.contact_inquiries(created_at desc);
create index idx_contact_inquiries_email on public.contact_inquiries(email);
```

---

## 7.23 Conversion Events

```sql
create table public.conversion_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_type text not null,
  source_path text,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  session_id text,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_conversion_events_event_name on public.conversion_events(event_name);
create index idx_conversion_events_created_at on public.conversion_events(created_at desc);
create index idx_conversion_events_source_path on public.conversion_events(source_path);
```

---

## 7.24 Audit Logs

```sql
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_actor_id on public.audit_logs(actor_id);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_created_at on public.audit_logs(created_at desc);
```

---

## 8. RLS 權限策略建議

### 8.1 前台公開讀取

前台可讀：

- 已發布頁面
- 已發布文章
- 已發布產品
- 已發布服務
- 已發布案例
- 啟用中的 FAQ
- 啟用中的 CTA
- 啟用中的選單

---

### 8.2 後台寫入

只有 admin_profiles 中 `is_active = true` 且符合角色者可寫入。

建議權限：

| Table | owner | admin | editor | author | viewer |
|---|---|---|---|---|---|
| cms_pages | CRUD | CRUD | CRU | R | R |
| cms_page_sections | CRUD | CRUD | CRU | R | R |
| blog_posts | CRUD | CRUD | CRUD | Own CRUD | R |
| products | CRUD | CRUD | CRU | R | R |
| services | CRUD | CRUD | CRU | R | R |
| case_studies | CRUD | CRUD | CRU | R | R |
| seo_metadata | CRUD | CRUD | CRU | R | R |
| contact_inquiries | CRUD | CRUD | RU | R | R |
| admin_profiles | CRUD | R | R | R | R |
| site_settings | CRUD | RU | R | R | R |

---

### 8.3 Helper Function

```sql
create or replace function public.current_admin_role()
returns public.cms_admin_role
language sql
security definer
set search_path = public
as $$
  select role
  from public.admin_profiles
  where user_id = auth.uid()
    and is_active = true
  limit 1;
$$;
```

---

### 8.4 Example RLS Policy

```sql
alter table public.cms_pages enable row level security;

create policy "Public can read published pages"
on public.cms_pages
for select
using (
  status = 'published'
  and is_indexable = true
);

create policy "Admins can manage pages"
on public.cms_pages
for all
using (
  public.current_admin_role() in ('owner', 'admin', 'editor')
)
with check (
  public.current_admin_role() in ('owner', 'admin', 'editor')
);
```

---

## 9. SEO 技術規範

### 9.1 每頁必備

- 單一 H1
- SEO Title
- Meta Description
- Canonical URL
- Open Graph Title
- Open Graph Description
- Open Graph Image
- Breadcrumb
- Sitemap 收錄狀態
- Robots 設定
- FAQ Schema（若有 FAQ）
- Article Schema（文章）
- Product / SoftwareApplication Schema（產品與 App）

---

### 9.2 URL 規範

使用英文 slug：

```txt
/products/badminton-platform
/solutions/app-mvp
/blog/website-design-trends-2024
```

避免：

```txt
/page?id=123
/產品/羽球平台
```

---

### 9.3 圖片規範

| 圖片類型 | 建議尺寸 |
|---|---:|
| OG Image | 1200 × 630 |
| Blog Cover | 1200 × 675 |
| Product Cover | 1200 × 800 |
| Case Cover | 1200 × 800 |
| Icon | SVG 優先 |

每張圖片都應包含：

- alt_text
- caption 可選
- 寬高
- 壓縮版本

---

### 9.4 結構化資料 Schema

#### Organization

用於首頁與全站。

#### WebSite

用於首頁。

#### BreadcrumbList

每頁都應有。

#### Article

文章詳細頁。

#### FAQPage

含 FAQ 區塊的頁面。

#### SoftwareApplication

羽球排組平台、工具 App、未來 App Hub 頁面。

#### Product

Mori 電商網站、品牌官網產品頁。

---

## 10. 初始 Seed Data 建議

### 10.1 Blog Categories

```sql
insert into public.blog_categories (name, slug, description, sort_order) values
('網站建置', 'website', '網站規劃、品牌官網、RWD 與 CMS 相關文章', 1),
('App 開發', 'app-development', 'App MVP、iOS、Android 與跨平台開發紀錄', 2),
('SEO 內容', 'seo-content', '關鍵字、文章架構、內容行銷與搜尋流量', 3),
('CMS 後台', 'cms-system', '內容管理、權限、後台設計與資料管理', 4),
('AI 內容', 'ai-content', 'AI 影片、AI 短劇、AI 圖文與內容工作流', 5),
('羽球平台營運', 'badminton-platform', '羽球排組、臨打報名、球團管理與 App 化紀錄', 6);
```

---

### 10.2 Products

```sql
insert into public.products (name, slug, product_type, short_description, status, sort_order) values
('品牌官網', 'brand-website', 'web', '把品牌介紹、服務內容、案例與文章整理成可長期經營的官網。', 'published', 1),
('羽球排組平台', 'badminton-platform', 'platform', '協助球團管理場次、報名、候補通知與未來 App 化。', 'published', 2),
('Mori 電商網站', 'mori-commerce', 'commerce', '商品展示、金流、訂單與庫存管理的電商網站架構。', 'published', 3),
('工具 App', 'tools-app', 'app', '以小型工具與效率功能累積下載、使用者與廣告收益。', 'draft', 4),
('AI 內容與漫劇', 'ai-content', 'content', '整理 AI 圖文、影片、短劇與 YouTube 內容作品。', 'draft', 5);
```

---

### 10.3 Services

```sql
insert into public.services (name, slug, short_description, starting_price_text, show_price, status, sort_order) values
('網站建置', 'website', '品牌官網、形象網站、產品頁與 CMS 後台規劃。', '基礎方案可洽詢', true, 'published', 1),
('App MVP 開發', 'app-mvp', '將 App 想法整理成可測試、可上架或可展示的 MVP。', '依功能範圍報價', true, 'published', 2),
('SEO 內容規劃', 'seo-content', '關鍵字研究、文章主題、頁面架構與內容更新節奏。', '可提供月費方案', true, 'published', 3),
('CMS / 後台系統', 'cms-system', '頁面、文章、產品、案例、FAQ 與表單管理後台。', '依資料表與權限複雜度報價', true, 'published', 4);
```

---

## 11. 開發 Phase 規劃

### Phase 1：基礎架構與品牌首頁

目標：完成品牌官網前台與 CMS 基礎。

內容：

- Next.js 專案建立
- Tailwind / UI Tokens
- Header / Footer
- 首頁靜態版
- Supabase 專案建立
- CMS Pages / Sections 基礎資料表
- SEO Metadata 基礎資料表
- 基礎 Admin Login

---

### Phase 2：CMS 後台 MVP

目標：讓首頁、產品、服務、文章可從後台管理。

內容：

- 後台 Dashboard
- 頁面管理
- 首頁區塊管理
- 產品管理
- 服務管理
- 文章管理
- SEO Meta 管理
- 媒體庫
- RLS 權限

---

### Phase 3：SEO 與內容中心

目標：建立可長期經營的 SEO 內容中心。

內容：

- Blog 列表與詳細頁
- 分類頁
- Tag 頁
- FAQ Schema
- Article Schema
- Breadcrumb
- Sitemap
- robots.txt
- OG 圖片管理
- Canonical

---

### Phase 4：案例與產品深化

目標：讓森映官網變成作品集與產品入口。

內容：

- 案例列表
- 案例詳細頁
- 產品列表
- 產品詳細頁
- App Store / Google Play 連結欄位
- 產品 Roadmap 區塊
- CTA 區塊管理

---

### Phase 5：表單與轉換追蹤

目標：讓官網可以承接合作詢問與成效分析。

內容：

- 聯絡表單
- 表單詢問管理
- UTM 記錄
- CTA 點擊事件
- conversion_events
- GA4 / GSC / Search Console 接入準備

---

### Phase 6：App Hub 與 Mori Account 延伸

目標：把森映官網升級為多 App 與多產品入口。

內容：

- App Hub
- App 詳細頁
- Mori Account 介紹頁
- App 下載追蹤
- 產品交叉導流
- AI 漫劇作品集

---

## 12. AI Agent 開發說明

### 12.1 專案理解

本專案是森映品牌官網，定位為森映所有產品、App、服務、案例、文章與合作詢問的母站。

前台需要 SEO 友善，後台需要 CMS 可管理，未來會延伸 App Hub、Mori Account 與 AI 內容作品集。

---

### 12.2 開發原則

AI Agent 開發時請遵守：

1. 不要使用本地絕對路徑。
2. 所有 import 使用相對路徑或 tsconfig alias。
3. 前台頁面優先使用 CMS 資料，若資料不存在才 fallback。
4. SEO Meta 不應寫死在 component 裡，應從 seo_metadata 取得。
5. 首頁複雜區塊使用 cms_page_sections 控制。
6. 文章、產品、服務、案例需保留 draft / published 狀態。
7. 後台所有寫入動作需記錄 audit_logs。
8. 不要在前台暴露 service role key。
9. Supabase RLS 必須開啟。
10. UI 文案避免制式 AI 語氣。

---

### 12.3 建議資料夾架構

```txt
mori-brand-site/
  app/
    page.tsx
    products/
    solutions/
    cases/
    blog/
    about/
    contact/
    admin/
  components/
    layout/
    sections/
    cards/
    forms/
    admin/
    seo/
  lib/
    supabase/
    cms/
    seo/
    validators/
  types/
    cms.ts
    seo.ts
    products.ts
    services.ts
  supabase/
    migrations/
    seed/
  docs/
    001_project_overview.md
    002_cms_schema.md
    003_seo_strategy.md
    004_admin_permissions.md
```

---

## 13. 第一版優先開發頁面

### 必做

1. 首頁 `/`
2. 產品與 App `/products`
3. 解決方案 `/solutions`
4. 案例 `/cases`
5. 文章 `/blog`
6. 關於森映 `/about`
7. 聯絡我們 `/contact`
8. 後台 `/admin`

### 第二批

1. 羽球排組平台詳細頁
2. Mori 電商網站詳細頁
3. 網站建置服務頁
4. App MVP 開發服務頁
5. SEO 內容規劃服務頁
6. CMS 後台系統服務頁

---

## 14. 首批 SEO 文章題目建議

### 網站建置

1. 品牌官網怎麼規劃？從首頁、服務頁到案例頁的完整架構
2. 形象網站和品牌官網差在哪？企業網站建置前要先想清楚的事
3. CMS 後台有必要嗎？網站內容能自己管理的好處

### App 開發

1. App MVP 是什麼？產品想法上架前先做 MVP 的原因
2. iOS 和 Android App 開發前，需要先準備哪些資料？
3. 工具 App 如何規劃？從功能、廣告到下載量的基本思路

### SEO 內容

1. SEO 文章不是一直寫就好，網站架構和內部連結更重要
2. 新網站要怎麼開始做 SEO？前 3 個月的內容規劃方式
3. 服務型網站如何用文章帶來詢問？從關鍵字到 CTA 的規劃

### 羽球平台

1. 羽球臨打報名為什麼不適合只靠 LINE 接龍？
2. 羽球候補通知怎麼設計？讓球友遞補不再混亂
3. 羽球排組平台 App 化前，需要先整理哪些功能？

### AI 內容

1. AI 漫劇怎麼開始？從角色、分鏡到 YouTube Shorts 的規劃
2. AI 內容不是只產圖，還要整理成可持續經營的作品庫
3. 品牌如何使用 AI 內容？網站、文章、短影音的整合方法

---

## 15. 待確認項目

以下項目可在正式開發前再確認：

1. 森映正式英文名稱：Mori / Mori Studio / Mori Digital / Mori Lab
2. Logo 是否使用森林符號、山形符號或純文字
3. 聯絡表單是否串接 Email / LINE Notify / n8n
4. 後台是否需要多語系欄位
5. 是否需要會員登入 Mori Account 第一版
6. 是否需要公開服務價格表
7. 是否需要直接接 Google Analytics / Search Console API
8. 是否需要文章 Markdown 編輯器或 Rich Text 編輯器
9. 是否需要 AI 文章草稿產生功能
10. 是否需要圖片自動壓縮與 WebP 轉檔

---

## 16. 結論

森映品牌官網第一版應該先完成三件事：

1. **品牌母站**：讓森映的產品、服務、案例與文章有統一入口。
2. **CMS 後台**：讓首頁、產品、服務、案例、文章與 SEO Meta 可以後台管理。
3. **SEO 基礎**：讓每個頁面都具備搜尋引擎可理解的架構，後續能靠內容長期累積流量。

第一版不需要一次完成所有 App Hub 與 Mori Account，但資料庫與 CMS 架構要先預留擴充空間，避免未來重做。

