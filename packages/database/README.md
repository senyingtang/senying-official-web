# @syt/database

Supabase 資料存取邊界。預設 `DATA_SOURCE=mock`：不連線任何資料庫，使用 mock repository 與 mock 示範帳號。

| 檔案 | 用途 |
|---|---|
| `src/types/database.types.ts` | Database 型別 placeholder |
| `src/generated/` | 未來放 `supabase gen types` 產出的正式型別 |
| `src/tables.ts` | 資料表 / RPC 名稱對照（DB SQL v2.0） |
| `src/models.ts` | UI 使用的 view model |
| `src/data-source.ts` | `DATA_SOURCE` 解析；supabase 缺 env 時丟出 `DataSourceConfigError`（無相依，驗收腳本可直接載入） |
| `src/repositories.ts` | repository 介面（含 `IdentityRepository`、`Viewer`、`RedeemOutcome`、`CmsBlogRepository`、`CmsCaseRepository`、`CmsStructureRepository`、`MarketingRebuildTrigger`） |
| `src/site-settings.ts` | 官網全站設定模型與驗證（無相依，驗收腳本可直接載入） |
| `src/cms-content.ts` | 官網 CMS 內容模型（Blog / Case / SEO）、狀態規則、驗證與資料表對應 |
| `src/public-site-settings.ts` / `src/public-cms.ts` | 官網 static build 以 anon key 讀取公開設定與已發布內容（不使用 service role） |
| `src/mock/` | mock 資料、mock 帳號（`identities.ts`）與 mock repository（依 viewer 過濾） |
| `src/supabase/` | Supabase repository（`repositories.ts`）、RPC 邊界（`rpc.ts`）、錯誤型別（`errors.ts`） |
| `src/client.ts` | 瀏覽器 / 前台 Supabase client（只用 anon key） |
| `src/server.ts` | 伺服器 client 與 service role client 工廠（禁止在瀏覽器 import；不讀 env，由呼叫端傳入） |

## 產生正式型別（接上本機 Supabase 後）

```bash
supabase start
supabase gen types typescript --local > packages/database/src/generated/supabase.ts
```

再把 `src/types/database.types.ts` 改成 re-export generated 型別。

## 切換資料來源

```ts
const config = resolveDataSourceConfig(process.env);
const repos = createRepositories(config, { supabase: userScopedClient, viewer });
```

- `DATA_SOURCE=mock`（預設）→ mock repository。
- `DATA_SOURCE=supabase` → Supabase repository。必須傳入「使用者 session」client（RLS 生效），缺少時丟錯。
- 已實作：identity（admin_profiles、workspace members）、access code 兌換（RPC `create_workspace_from_access_code`）與列表、site project、domains、templates、entitlements、dashboard 統計、
  官網全站設定（`cms_site_settings`）、官網 CMS 內容（`blog_posts` / `case_studies` / `seo_metadata` / `cms_navigation_items` / `marketing_rebuild_requests`）。
- 其他方法（commerce、訂閱、部署紀錄、SEO 生產器、audit 列表）丟出 `NotImplementedInPhaseError`，不回傳假資料；
  後台以 `safeLoad()` 顯示「尚未啟用」，不會讓整頁失敗。

詳細說明見 `docs/PHASE_2_AUTH_AND_PERMISSION_NOTES.md` 與 `docs/PHASE_2_9_CMS_CONTENT_NOTES.md`。

## 安全規則

- `SUPABASE_SERVICE_ROLE_KEY` 只能由 `apps/admin/src/lib/supabase/service-role.ts`（`server-only`）讀取後傳給 `createServiceRoleClient()`，只在 Next.js server（Route Handler / Server Action）或 Edge Function 使用。
- repository 不接受 service role client 作為一般資料來源。
- 前台 Astro 與 client component 只能使用 `PUBLIC_SUPABASE_ANON_KEY`，資料權限交給 RLS。
