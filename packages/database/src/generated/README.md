# generated/

`pnpm db:types`（`supabase gen types typescript --local > packages/database/src/generated/supabase.ts`）

- 只從本機 Supabase（`supabase start`，本專案 API 54421 / DB 54422）產生，不從 remote / 正式專案產生。
- 此資料夾只放自動產生的檔案，不要手動修改。
- `packages/database/src/types/database.types.ts` 由此重新匯出 `Database` / `Json`。
- Phase 2.8：migrations 0001 ~ 0016 本機 db reset 後產生。
