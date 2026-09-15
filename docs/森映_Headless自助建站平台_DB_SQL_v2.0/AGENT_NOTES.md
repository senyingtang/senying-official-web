# AGENT_NOTES — 森映 Headless 自助建站電商平台 DB SQL v2.0

給接手開發的 AI Agent / 工程師。請先讀 `README.md`，再依任務讀 `docs/` 對應規格。

---

## 0. 硬性規則

1. **不要** 對正式 Supabase 執行 `supabase db push`、`supabase link` 後的 migration，或任何寫入。
2. **不要** 把 service role key、金流 HashKey / HashIV / Channel Secret、AI provider key 寫進 migration、seed、Git 或前端。
3. **不要** 在 migration 寫死真實 UUID、email、網域、銀行帳號、商店代號。
4. 金流密鑰只存 reference（`vault:<name>` / `env:<NAME>`），實際值放 Supabase Vault 或 Edge Function Secrets。
5. 修改 schema 後，本機跑完 `supabase/tests` 的 6 支 smoke test（Phase 2.8 新增 `site_settings_rls.sql`）才能提交。

---

## 1. 本次讀取的依據文件

- `docs/森映品牌官網_CMS與SEO規劃_v1.0.md`
- `docs/森映品牌官網_整體架構設計_v1.0.md`
- `docs/DB_SPEC.md`（與 v1.0 包內 `docs/DB_SPEC.md` 內容相同）
- `docs/森映品牌官網_DB_SQL_v1.0/`（README、docs、0001 ~ 0007 migrations、rls_smoke_test）；已比對與 `森映品牌官網_DB_SQL_v1.0.zip` 內容一致
- `docs/project-audit/`（SUMMARY、FOUND_PROJECTS、FOUND_PROJECTS_DETAILED、Hungjui_形象官網/*）

---

## 2. 主要設計決策

| 決策 | 理由 |
|---|---|
| v1.0 資料表 / 欄位 / enum / 函式名稱全部保留 | 既有 CMS 規劃與前台程式可以直接沿用；已套用 v1.0 的環境可升級 |
| 可販售方案 `commerce_products` 與官網展示 `products` 分開 | 展示內容與交易資料的生命週期、權限不同 |
| 金額來源統一在 `commerce_product_prices`；`subscription_plan_prices` 只放續訂規則 | 避免兩處價格不一致 |
| 權限代碼是「可轉讓的權限憑證」，兌換後才建立 `user_entitlements` | 符合「未啟用可轉讓、啟用後綁定第一個使用者」 |
| 網站數量用 `site.create` 額度控制（v1 = 1） | v2 開放多網站只需調整方案規則，不改 schema |
| 客戶網站結構由模板實例化，客戶只能改內容 | 模板制、不做自由拖拉；以 guard trigger 在 DB 層保證 |
| 內容值 draft / published 各一列 | 編輯草稿不影響已發布內容；RLS 可以只開放 published 列給前台 |
| `customer_site_deployments`（內容版本）與 `site_deployments`（部署 job）分開 | 一個內容版本可部署到多個目標；v1 不部署也能保留版本歷史 |
| guard trigger 用 `current_user` 判斷是否受信任（`is_internal_context()`） | SECURITY DEFINER 函式內 current_user 會變成函式擁有者，前端無法偽造 |
| 功能開放用 `platform.feature_flags` | v1 / v2 / v3 資料結構一次到位，上線時只切旗標 |
| 0011 自動替所有外鍵補索引、自動掛 updated_at trigger | 新增表不會漏 |
| 0013 先移除 public schema 全部 policy 再重建 | v1.0 → v2.0 升級時不會殘留較寬鬆的舊 policy |

### 修正 v1.0 的問題

1. `guard_admin_profile_changes()`：v1 在呼叫者不是後台帳號時，INSERT 判斷式結果為 null 而沒有擋下；v2 明確拒絕，第一位 owner 只能由 service role / SQL Editor 建立。
2. v1 只擋「刪除」最後一位 owner；v2 同時擋「停用」與「降級」，並加 advisory lock 防併發。
3. v1 所有後台角色可讀 audit_logs、任何登入者可寫；v2 改為 owner / admin 讀、後台帳號只能以自己名義新增、不可修改。
4. v1 `case_services` / `case_products` 公開讀取為 `using (true)`；v2 改為跟隨案例發布狀態。
5. v1 `can_publish_content()`、`is_publicly_visible()` 沒有固定 search_path；v2 補上。

---

## 3. 驗證紀錄（2026-09-14）

**環境**：本機 Docker `public.ecr.aws/supabase/postgres:17.6.1.166` 可丟棄容器；未連結任何 Supabase 專案，未連線正式資料庫。
該映像的 `storage` schema 是空的（正式環境由 storage-api 建立），驗證時另外用一個 **不在規格包內** 的 stub 建立 `storage.buckets` / `storage.objects` / `storage.foldername()`。

| 驗證 | 結果 |
|---|---|
| 全新資料庫依序套用 0001 ~ 0015 | ✅ 15 / 15 |
| 5 支 smoke test | ✅ 44 項 PASS（schema 9、RLS 10、access code 13、template 6、domain 6） |
| 同一資料庫再次套用 0001 ~ 0015（可重複執行） | ✅ |
| 先套用 v1.0 0001 ~ 0007，再套用 v2.0 0001 ~ 0015，跑 5 支測試 | ✅ 全部通過；FAQ 無重複；v1 storage policy 已移除 |
| 併發兌換：兩個 session 同時兌換同一組代碼 | ✅ 第二個 session 等待第一個 commit 後回傳 `already_redeemed`；成功兌換紀錄 1 筆、權限 1 筆 |
| 規格包掃描：UUID 字面值、金鑰樣式、Supabase project ref、非占位網域 | ✅ 無 |

**資料庫統計（全新套用後）**：public 資料表 110、RLS policy 313、自訂函式 70、索引 494、trigger 161。

**驗證過程中發現並已修正**

1. `guard_workspace_member_changes`（security invoker）呼叫的 `workspace_active_owner_count` 沒有授權給 authenticated，客戶操作成員時會變成 permission denied。已授權，函式內也加上呼叫者檢查（非成員回傳 null，guard 視為 0，fail closed）。
2. 刪除 auth 使用者時，外鍵 `on delete set null` 更新 `access_codes.issued_to_user_id` / `created_by`，被 `guard_access_code_update` 誤擋。已允許 cascade 造成的清空；兌換者 `redeemed_by_user_id` 仍是 restrict。已加入測試。

**本機重現**

```bash
supabase start && supabase db reset
for t in schema_smoke_test rls_smoke_test access_code_smoke_test template_license_smoke_test domain_dns_smoke_test; do
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "supabase/tests/$t.sql" || break
done
```

測試以 `set local role` + `request.jwt.claims` 與 `request.jwt.claim.sub`（兩種都設，相容新舊 `auth.uid()`）模擬身分，測試帳號以 `gen_random_uuid()` 動態建立，全程 rollback。

---

## 4. 前後台實作提醒

### Next.js（森映後台 / 客戶後台）

- 使用者操作一律用 **使用者 session 的 Supabase client**；service role 只在 server-only 模組（`import 'server-only'`）與 Edge Function 使用。
- 業務動作一律呼叫 RPC，不要自己組多段 insert：
  `create_workspace_from_access_code`、`create_site_project_from_template`、`publish_site_project`、`add_site_project_domain`、`transfer_access_code`、`request_subscription_cancellation`、`create_workspace_invitation` / `accept_workspace_invitation`。
- 客戶內容表單依 `customer_site_section_fields`（`field_type`、`validation_schema`、`is_required`、`is_customer_editable`）動態產生 Zod schema。
- 森映後台所有寫入仍需 Server Action 角色檢查 + Zod + 寫 `audit_logs`（`actor_type = 'admin'`、`actor_id = auth.uid()`）。
- 金流設定頁：依 `config_schema` 動態渲染；`type = secret_ref` 欄位不回傳明文。

### Astro（前台）

- 森映官網：沿用 v1.0 規則讀已發布內容。
- 客戶網站（v2 起公開）：以 `site_project_id` 查 `customer_site_pages.published_snapshot` + `customer_site_content_values`（`content_state = 'published'`）；anon 只讀得到 `is_site_publicly_visible()` 的網站。
- 預覽（v1）：預覽 token 在 server 端比對 `customer_site_publish_settings.preview_token_sha256` 後，以 service role 讀 draft 內容，並輸出 `noindex`。
- 表單送出呼叫 `submit_site_form()`；Turnstile 驗證在 Astro endpoint 先做。
- 結帳入口頁只顯示 `get_enabled_payment_methods()` 的結果。

### Edge Functions（尚未實作）

| 函式 | 工作 |
|---|---|
| `payments-ecpay-notify` / `payments-linepay-confirm` | 寫 `commerce_webhook_events` → 驗簽 → 寫交易 → `mark_payment_success_and_issue_entitlement` → 寄送代碼 |
| `payments-ecpay-period-notify` | 定期定額每期 → `record_subscription_renewal` |
| `dns-check-worker` | DNS-over-HTTPS 查詢 → `site_domain_check_logs` → 更新驗證 / 網域狀態 → 申請 SSL |
| `site-deploy-worker` | v2 起依 `site_publish_targets` 建立 `site_deployments` 並部署 |
| `ai-article-generate` | 生成、品質檢查、寫入輸出 |
| `scheduler` | `run_entitlement_expiry_job()`、ATM 逾期、Webhook raw payload 清理 |

---

## 5. 尚未完成 / 刻意不做

- 沒有「建立結帳 / 訂單」的 SQL 函式：計價、優惠碼、建立 checkout session 與訂單由 server 端（service role）處理，避免在 DB 內重複實作金流商規則。
- 退款的金流商 API 呼叫與「退款成功 → 撤銷權限」流程只有資料欄位（`revoke_entitlements`），需在 server 端呼叫 `revoke_access_code`。
- DNS 檢查、SSL、部署 worker 未實作；v1 部署紀錄為 dry-run。
- pg_cron 排程未寫進 migration（需 owner 在專案啟用 extension 後手動建立）。
- `generate_dns_instruction()` 的二級公共後綴清單是常用清單，不是完整 Public Suffix List。
- 方案價格、權限年限、AI 月額度、成員上限為暫定值（見 DB_SPEC_v2 §7）。
- seed 的兩個版型與 DNS 教學頁都是草稿。

---

## 6. 風險與注意事項

1. **v1.0 與 v2.0 migration 檔名重疊**（0001 ~ 0007）：已套用 v1.0 的專案要改用新時間戳檔名，見 `docs/MIGRATION_ORDER.md` §4。
2. **0013 會移除 public schema 全部 policy 後重建**：正式環境若有手動 policy，套用前先備份。
3. **帳號刪除**：已兌換代碼的兌換者、訂閱帳務擁有者、workspace owner、最後一位 owner 都受 restrict / guard 保護，不能直接硬刪 auth 使用者。個資刪除請求需要另外設計「匿名化」流程（清除 profile / email、撤銷權限、保留交易紀錄）。
4. **`is_service_role()` 在沒有 JWT 時以 `session_user` 為 postgres / supabase_admin 判定為服務端**：直接用 postgres 連線字串連 DB 的程式等同最高權限，連線字串只能放在伺服器端。
5. **代碼是 bearer token**：知道字串就能兌換；寄送代碼的 email、後台顯示都要遮蔽處理。兌換暴力猜測限制以「使用者」計算，大量註冊帳號的攻擊需在 API 層再加 IP / Turnstile 限制。
6. **`submit_site_form()` 的 IP 限制** 依賴 `request.headers`（PostgREST 提供）；若改由 server 端代送，要自行傳遞與限制。
7. **Webhook raw payload** 可能含買家資料，只有 owner / admin 可讀；建議設定 180 天清理排程。
8. **external_project_connections** 的 Mori 電商官網與 SEO 文章生產器為 `pending_audit`。本次唯讀列目錄時看到 `D:\project\e-commerce OS`、`D:\project\mori-website`、`D:\project\seo-content-os` 等資料夾，只記錄為「未確認候選」；僅看過各資料夾 README 開頭與 package.json 名稱，沒有讀取任何 `.env` 或原始碼；`mori-website` 的 README 描述為球團形象網站，不一定是 Mori 電商官網，需人工確認。
9. `hungjui_site` 的 HasEnv：使用者提供為 True，但 audit 的 important-paths 顯示只有 `.env.example`，已在 `audit_notes` 標記需複核。
10. SEO 文章生產器既有專案（seo-content-os v1.1）已有自己的 AI Engine / Headless Publishing migration，整合前要先比對，避免兩套 schema 並存。
