# supabase/

本資料夾的 `migrations/` 與 `tests/` 是 **DB SQL v2.0 的逐位元複本**，來源：

`docs/森映_Headless自助建站平台_DB_SQL_v2.0/supabase/`

- 規格與說明以 docs 內的 v2.0 規格包為準（`README.md`、`docs/*.md`）。
- 不要只改這裡的 SQL；需要變更 SQL 時，先更新規格包，再同步到此處。
- 同步檢查：`pnpm db:verify-sync`（比對兩邊 SHA-256）。
- `config.toml` 只屬於本 repo 的本機開發設定，不在規格包內。

## 本機 Supabase（Phase 2.8）

`config.toml`：`project_id = "syt-official-website"`，使用 544xx port，避開本機其他專案預設的 543xx stack。

| 服務 | URL / port |
|---|---|
| API | http://127.0.0.1:54421 |
| DB | 127.0.0.1:54422 |
| Studio | http://127.0.0.1:54423 |
| Mailpit（本機信件） | http://127.0.0.1:54424 |

- seed 由 migrations `0015_seed_content.sql` / `0016_marketing_site_settings.sql` / `0017_cms_content_completion.sql` / `0018_commerce_checkout_mvp.sql` 提供，`[db.seed]` 關閉。
- `0018` 只開放本機 Sandbox 模擬付款與「測試價格（非正式售價）」；沒有任何正式金流 provider 被啟用，`commerce.live_payments` 維持 `false`。
- analytics / edge runtime / realtime / storage vector 本專案未使用，已關閉。
- key 不寫入任何檔案：驗收腳本與 `pnpm dev:admin:supabase` 每次從 `supabase status -o env` 讀取，只放在子程序 env。

```bash
pnpm supabase:start     # supabase start
pnpm supabase:status    # 顯示 URL（key 遮罩）
pnpm db:reset:local     # supabase db reset --local（依序套用 0001 ~ 0018）
pnpm db:smoke           # migrations / seed / 8 支 SQL smoke test / PostgREST + GoTrue RLS
pnpm db:types           # supabase gen types typescript --local → packages/database/src/generated/supabase.ts
pnpm site-settings:verify
pnpm cms:verify          # Phase 2.9 CMS 內容驗收（30 項）
pnpm cms-integration:verify
pnpm commerce:verify     # Phase 3.0 Commerce 資料庫 / RLS 驗收（14 項）
pnpm commerce-integration:verify  # Phase 3.0 端到端：購物車 → 下單 → Sandbox 付款 → 發碼
pnpm local-env:verify
pnpm supabase:stop
```

SQL smoke test 以 `docker exec supabase_db_syt-official-website psql -v ON_ERROR_STOP=1` 執行（不需要本機 psql，也不會連到其他專案的 54322）。

**禁止**：`supabase link` 正式專案、`supabase db push`、把正式 URL / key 放進任何檔案。
