# 森映官網設計與圖片資料夾規則

## 1. docs/design

此資料夾放設計交付、Mockup、設計師參考圖、原始圖稿與設計說明。

不建議讓網站直接讀取這裡的圖片。

建議用途：

- uiux-mockups：設計師提供的完整頁面 Mockup
- uiux-notes：設計調整紀錄、設計回饋
- designer-handoff：給設計師的需求書、標註文件
- source-images：原始圖片、未壓縮素材、AI 生成圖原檔

## 2. apps/marketing/public/images

此資料夾放官網前台實際會使用的圖片。

Astro 前台可用以下路徑讀取：

/images/hero/xxx.webp
/images/products/seo-website/xxx.webp
/images/cases/xxx.webp
/images/blog/xxx.webp
/images/og/xxx.png

## 3. 命名規則

建議使用英文小寫與連字號，不要使用空格與中文檔名。

範例：

hero-main-platform-ui.webp
product-seo-website-hero.webp
product-landing-page-hero.webp
product-ecommerce-hero.webp
case-hungjui-cover.webp
og-home.png

## 4. 圖片格式建議

官網內文圖片：

- 優先 webp
- 其次 jpg
- 透明圖可用 png

OG 圖片：

- 1200x630
- png 或 jpg
- 放在 apps/marketing/public/images/og/

## 5. 注意事項

docs/design 裡的圖是設計資料，不代表會上網站。

真正要上網站的圖，請放到 apps/marketing/public/images 對應資料夾。
