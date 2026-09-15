# Phase 2.8 Supabase Site Settings Real Integration & Local DB Verification

全程只使用本機 Supabase（`supabase/config.toml`，project_id `syt-official-website`）。沒有 link / push 任何遠端專案、沒有部署、沒有變更 schema 或 RLS。

## 1. 本機 Supabase

| 服務 | URL / port |
|---|---|
| API | http://127.0.0.1:54421 |
| DB | 127.0.0.1:54422 |
| Studio | http://127.0.0.1:54423 |
| Mailpit | http://127.0.0.1:54424 |

- 本機另有其他專案的 Supabase stack 使用預設 543xx，本專案改用 544xx，互不干擾；所有 SQL 以 `docker exec supabase_db_syt-official-website psql` 執行，不會連到 54322。
- key 不寫入任何檔案（包含 `.env.local`）：驗收腳本、`pnpm dev:admin:supabase`、`pnpm build:marketing:supabase` 每次從 `supabase status -o env` 讀取，只注入子程序 env；輸出一律遮罩。
- 不把 `DATA_SOURCE=supabase` 寫進 `apps/*/.env.local`：Next.js / Astro 會自動載入 `.env.local`，會讓 mock 模式的 Phase 2 / 2.7 驗收誤連本機 DB。
- `scripts/lib/local-supabase.mjs` 安全檢查：API 必須是 127.0.0.1:54421、DB 必須是 54422，否則拒絕執行。

## 2. Migration 0016

- `supabase db reset --local`：0001 ~ 0016 依序套用，無 SQL / RLS error。
- **發現並修正**：0015 seed 的 `site.brand` 只有 `name` / `tagline`，0016 的 on conflict 只補名稱，reset 後缺 `logo_url` / `favicon_url`（官網因 fallback 仍正常，但 seed 不完整）。
  0016 改為「缺少時才補預設值、既有值優先、舊預設名稱才換正式名稱」，並以 where 條件避免重複更新。
- 重複套用 0016：內容與 updated_at 都不變（idempotent）。不覆蓋後台自訂值、不依賴正式資料。
- favicon 預設保留 `/favicon.svg`（Phase 2.7 已保留同圖形檔案）。
- 規格包 `docs/森映_Headless自助建站平台_DB_SQL_v2.0/supabase/` 同步，`pnpm db:verify-sync` PASS。

## 3. cms_site_settings seed（reset 後）

| setting_key | is_public | 內容 |
|---|---|---|
| `site.brand` | true | name `森映 SEN YING`、name_zh `森映`、name_en `SEN YING`、footer_name、logo_url `""`、favicon_url `/favicon.svg`、tagline |
| `site.socials` | true | items 8 筆（LINE `/contact#line`、Email `/contact`，其他平台網址空白） |
| `site.floating_actions` | true | enabled、default_collapsed false、desktop / mobile、cart.enabled false |

另有 0015 的 `site.theme` / `site.contact`（公開）與 4 筆 `platform.*`（非公開）。

## 4. RLS（未放寬）

| 身分 | 讀 | 寫 |
|---|---|---|
| anon | 只有 is_public | insert 42501、update / delete 0 列 |
| owner / admin | 全部 | 可寫（`cms_site_settings_admin_manage`） |
| editor / viewer / author | 全部（`_staff_read`） | insert 42501、update / delete 0 列 |
| customer（非後台成員） | 只有 is_public | insert 42501、update / delete 0 列 |
| service role | — | 只用於本機測試程序建立測試帳號，不給 Marketing / admin 使用 |

- SQL：`supabase/tests/site_settings_rls.sql`（全程 rollback，含非公開設定、只改目標列、updated_at trigger、audit_logs 規則）。
- PostgREST + GoTrue 真實路徑：`pnpm db:smoke`。
- author 在 DB 層可讀但不可寫；後台路由 `/admin/cms/site-settings` 另外擋下（redirect `/admin/dashboard?error=forbidden`）。

## 5. Admin（DATA_SOURCE=supabase）

- 登入：Supabase Auth（email / password），查詢一律使用者 session + RLS；admin 程序**不提供 service role** 也能完整讀寫。
- `/admin/cms/site-settings`：載入 DB 內容；owner / admin 可編輯；editor / viewer 唯讀（fieldset、儲存按鈕停用）；author 被路由擋下；customer 登入後台為 `not_admin`。
- Repository（`packages/database/src/supabase/repositories.ts`）：
  - 讀取既有設定後合併（保留表單沒有的欄位，例如 `tagline`），**只寫入內容有變更的設定列**。
  - upsert 後以回傳列數確認；RLS 擋下（0 列或 42501）丟出 `SupabasePermissionError`（`isPermissionDeniedError` 可辨識）。
  - 回傳 `{ persisted, changedKeys, auditLogged }`；mock 仍回傳 `persisted: false`。
- Server action：伺服器端驗證（`validateMarketingSiteSettings`）與角色檢查不變；權限錯誤 → `forbidden`；其他錯誤在伺服器記錄錯誤名稱 / operation / code（不含內容、token、key），畫面顯示一般訊息。

## 6. Audit Log

- owner / admin 儲存時寫入 `audit_logs`（既有 `audit_staff_insert` policy：後台成員以自己身分、actor_type `admin`）。
- `action`：`site_settings.update`；`entity_type`：`cms_site_settings`；`actor_id`：登入者；`created_at`：時間。
- `metadata`：`changed_keys`、`source`、`changed_at`；`before_data` / `after_data`：變更設定列的公開設定內容。不含 token、key、密碼。
- audit 寫入失敗時設定已儲存，不回報為儲存失敗；伺服器記錄 `[siteSettings.updateMarketingSiteSettings.audit]`。
- audit_logs 是 append-only（DB guard，只有 postgres 可刪除）；`site-settings:verify` 結束時以 postgres 刪除本次測試產生的 `site_settings.update` 紀錄，不留下測試資料。

## 7. Marketing（static，未改 SSR）

- `DATA_SOURCE=supabase` + 本機 URL + anon key build：Header / Footer / title / og:site_name / Organization JSON-LD / Floating Actions / sameAs / favicon 使用 DB 值；logo 空白時使用內建 fallback。
- build 只讀取 `is_public` 設定（anon key，`site_public_read`），不使用 service role，build output 不含 service role。
- **後台修改後不會即時反映**：流程為 Admin 更新 DB → Astro rebuild → dist 反映。rebuild trigger 留待部署 pipeline。

## 8. Round trip（`pnpm site-settings:verify`）

A. Admin UI：owner 以表單改 `SEN YING TEST`、Instagram `https://example.test/sen-ying-instagram`、切換預設收合 → 查 DB（值、updated_at、updated_by、只改目標列、無重複、JSON、audit）→ editor / viewer / author / customer 權限 → repository 還原。
B. Repository：owner 更新測試值 → 查 DB → 其他角色寫入被拒 → Marketing build（`.phase28-report/supabase-dist`，不覆蓋 `apps/marketing/dist`）→ 檢查 dist → **finally rollback**（repository，失敗時以 postgres 還原）→ 查 DB → 重新 build 確認回到 SEN YING。

注意：`example.test` 不在 sameAs placeholder 規則內（只排除 example.com / org / net 與 `@example` 路徑），所以測試期間會出現在 sameAs；rollback 後移除。

## 9. Generated Types

- `pnpm db:types` → `packages/database/src/generated/supabase.ts`（本機 DB 產生，8 千多行）。
- `packages/database/src/types/database.types.ts` 改為重新匯出 `Database` / `Json`。

## 10. 驗收

| 指令 | 內容 |
|---|---|
| `pnpm db:smoke` | 11 項：migrations、seed、JSON、6 支 SQL test、PostgREST / GoTrue 角色寫入、updated_at、完整還原 |
| `pnpm site-settings:verify` | 17 項：Admin UI 真實寫入、repository round trip、Marketing build、rollback、清理（設定列 / 測試 audit / 測試帳號） |
| `pnpm local-env:verify` | 7 項：.gitignore、無 link、service role 不進 build、無正式 key、報告不含完整 key |
| `pnpm phase28:verify` | db:verify-sync → db:smoke → site-settings:verify → local-env:verify → phase27:verify（含 phase2:verify，完整 RWD 一次） |

測試帳號：`phase28.{owner,admin,editor,viewer,author,customer}@syt-local.test`，每次執行以 GoTrue admin API 建立（隨機密碼、不寫檔），**驗收結束即刪除**（admin_profiles 以本機 postgres 清除、auth.users 以 GoTrue 刪除）。customer 為已登入但非後台成員的使用者（REST 測試不建立 workspace；SQL 測試另含 workspace owner）。

> 為什麼一定要刪：既有 `rls_smoke_test.sql` 假設 DB 內沒有其他後台 owner，殘留的測試 owner 會讓「最後一位 owner」測試失敗（Phase 2.8 實際遇到並修正）。

## 11. 已知限制

- `DATA_SOURCE=supabase` 時 `/admin/dashboard` 顯示錯誤畫面：`commerce.listOrders` 等 repository 依 Phase 2 設計明確丟 `NotImplementedInPhaseError`（規劃 Phase 3），不是本階段變更造成。登入後預設導向 dashboard，建議直接開 `/admin/cms/site-settings`。
- 正式 Supabase 尚未連線、migration 0016 尚未套用遠端、沒有部署、沒有 rebuild trigger。
- 正式 Logo 仍是 TEMPORARY BRAND ASSET；正式社群網址尚未提供。
