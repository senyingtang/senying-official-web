# 森映品牌官網 DB SQL v1.0
此檔案包依據：
- `森映品牌官網_CMS與SEO規劃_v1.0.md`
- `森映品牌官網_整體架構設計_v1.0.md`

包含 Supabase migrations、RLS、Storage、seed 與測試說明。

## 使用方式
```bash
supabase start
supabase db reset
```
正式環境部署前，先在 staging 專案執行並完成 `docs/DB_SPEC.md` 的權限測試。

## 注意
- SQL 尚未連線到你的正式 Supabase 專案執行。
- Migration 不包含真實 owner UUID、聯絡資訊或正式網域。
- `seo_metadata.entity_id` 採 polymorphic reference，完整關聯一致性由 repository/service 層維護。
