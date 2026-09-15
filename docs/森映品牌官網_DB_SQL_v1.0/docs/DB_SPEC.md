# 森映品牌官網 DB / RLS 規格 v1.0

## Migration 順序
1. `0001_extensions_and_enums.sql`
2. `0002_core_schema.sql`
3. `0003_indexes_triggers.sql`
4. `0004_security_functions.sql`
5. `0005_rls.sql`
6. `0006_storage.sql`
7. `0007_seed_content.sql`

## 核心原則
- 公開前台只讀取已發布且發布時間已到的內容。
- 後台角色：owner / admin / editor / author / viewer。
- author 只能建立、修改自己的文章，且只能停留在 draft 或 review。
- owner 才能管理後台帳號；系統禁止刪除最後一位啟用中的 owner。
- 所有內容更新皆由 Server Actions 驗證 Zod、角色與欄位白名單；RLS 是第二道防線。
- `cms_page_sections.content` 必須在應用層以 section-type schema 驗證，不接受任意 JSON。
- 前台表單建議經 Route Handler 寫入，並在應用層增加 Turnstile、速率限制與 honeypot。

## Bootstrap 第一位 Owner
Migration 不會自動指定任何真實帳號。建立 Supabase Auth 使用者後，在 SQL Editor 以 service role/管理權執行：
```sql
insert into public.admin_profiles(user_id,display_name,role,is_active)
values ('AUTH_USER_UUID','管理者名稱','owner',true);
```
請勿將 owner UUID 寫死在 migration 或 GitHub。

## 發布規則
- `draft`：編輯中。
- `review`：待審核。
- `scheduled`：排程內容；前台仍不公開，應由排程工作在時間到達後切換為 published。
- `published`：`published_at <= now()` 才公開。
- `archived`：保留資料但不公開。

## Storage
- Bucket：`public-assets`
- 最大 10 MB。
- MIME：JPEG、PNG、WebP、AVIF、SVG。
- 建議路徑：`pages/`、`products/`、`services/`、`cases/`、`blog/`、`site/`。

## 上線前必要測試
- anon 無法讀取草稿。
- viewer 無法修改資料。
- author 無法修改別人的文章或直接發布。
- editor 無法管理 admin_profiles、site settings、redirects、navigation。
- admin 無法新增或刪除 owner。
- 表單插入限制與 anti-spam 在 API 層均有效。
- Storage 上傳、修改、刪除符合角色矩陣。
