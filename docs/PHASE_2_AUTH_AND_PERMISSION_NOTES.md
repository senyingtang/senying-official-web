# Phase 2：Auth、權限保護與 Repository 切換說明

> 範圍：`apps/admin`（Next.js 16）、`packages/auth`、`packages/database`、`packages/shared`。
> 本階段 **不連線正式 Supabase、不執行 migration push、不填正式 key**；預設 `DATA_SOURCE=mock`。
> 資料表 / RPC 名稱全部對齊 DB SQL v2.0（`packages/database/src/tables.ts`），未修改 schema。

## 1. 架構總覽

```txt
瀏覽器
  │  cookie：syt_mock_session（mock）或 sb-<ref>-auth-token（supabase）
  ▼
apps/admin/src/proxy.ts ── 粗檢：受保護路徑沒有 session cookie → /{area}/login?next=…&error=login_required
  │                         DATA_SOURCE 設定錯誤 → /{area}/login?error=config_error
  │                         supabase 模式：以 anon key 更新 Auth session cookie
  │                         ✗ 不驗簽章、不查角色 / workspace、不使用 service role
  ▼
layout guard（server）── requireAdminSession()：已登入 + admin_profiles 角色
  │                       requirePortalSession()：已登入
  ▼
page guard（server）──── requireAdminPage(route)：路由角色規則
  │                       requirePortalPage(route, { requireWorkspace })：active workspace
  │                       requireSiteAccess(siteId, route)：網站屬於使用者的 workspace
  ▼
Repositories（已綁定 viewer）── mock：記憶體過濾（行為對齊 RLS）
                                 supabase：使用者 session client → RLS + RPC
```

- 判斷邏輯是 `packages/auth/src/guards.ts` 的純函式（`decideAdminSession`、`decideAdminRoute`、`decidePortalAccess`、`decideSiteAccess`），不依賴 Next.js。
- `apps/admin/src/lib/auth/server.ts` 以 React `cache()` 在同一個 request 內快取 `getAuthState` / `getAdminContext` / `getPortalContext`，layout 與 page 重複呼叫不會重複查詢。
- Next.js 的 layout 在 client 導覽時不會重新執行，所以 **每個 page 都呼叫自己的 guard**（Next.js 官方建議）。
- 傳到瀏覽器的只有顯示用資料（名稱、email、角色名稱、工作區名稱）；repository、token 與權限查詢結果都留在伺服器端。

## 2. 資料來源切換

`packages/database/src/data-source.ts`（無相依，可被 Node 驗收腳本直接載入）：

| DATA_SOURCE | 結果 |
|---|---|
| 未設定 / `mock` | `{ kind: 'mock' }` |
| `supabase` + `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` | `{ kind: 'supabase', url, anonKey }` |
| `supabase` 缺任一 env | 丟出 `DataSourceConfigError`（不會改用 mock） |
| 其他值（打錯字） | 丟出 `DataSourceConfigError` |

錯誤如何呈現（多層，任何一層都不會改用 mock）：

1. `src/instrumentation.ts`：伺服器啟動時驗證，設定錯誤直接丟出 `DataSourceConfigError`。`next start` 行程不會結束，但此後**每個請求都回 HTTP 500**，server log 顯示 `An error occurred while loading instrumentation hook: DATA_SOURCE=supabase requires …`。
   - 這是 `phase2:auth` runtime 測試實際觀察到的行為：`/admin/login`、`/portal/login`、`/portal/redeem-code`、`/admin/dashboard`、`/portal/sites/demo-seo-site` 全部 500，且都沒有輸出 mock 內容。
2. 以下為第二道防線（instrumentation 未執行的環境才會用到，例如 dev server 熱更新）：
   - `proxy.ts`：受保護路徑導向 `/{area}/login?error=config_error`。
   - 登入頁 / 兌換頁：顯示「資料來源設定錯誤」與缺少的 env 名稱，停用登入，不顯示 mock 帳號。
3. `createRepositories(config, { supabase })`：supabase 模式沒有使用者 client 時丟錯。

## 3. Mock 帳號與 session

`packages/database/src/mock/identities.ts`：

| 帳號 | admin_profiles 角色 | workspace |
|---|---|---|
| owner@example.com | owner | — |
| admin@example.com | admin | — |
| editor@example.com | editor | — |
| author@example.com | author | — |
| viewer@example.com | viewer | — |
| customer@example.com | — | mock-workspace-001（owner）：demo-seo-site、demo-landing-page |
| other-customer@example.com | — | mock-workspace-002（owner）：other-workspace-site |
| outsider@example.com | — | — |

Mock session cookie `syt_mock_session`：

- 內容：`base64url({sub, exp}).HMAC-SHA256`，8 小時到期。
- 屬性：`httpOnly`、`SameSite=Lax`、`path=/`；`ADMIN_PUBLIC_URL` 為 https 時加 `Secure`。
- 簽章金鑰：`AUTH_COOKIE_SECRET`，空白時使用本機示範預設值。
- 伺服器端驗證簽章與到期時間；偽造或竄改的 cookie 雖然能通過 proxy 粗檢，仍會被 server guard 導回登入頁。
- Mock 登入不驗證密碼，只接受上表 email。

## 4. 官方後台（/admin）權限

路由規則在 `packages/auth/src/permissions.ts` 的 `ADMIN_ROUTE_RULES`，以最長前綴比對；**沒有列出的 /admin 路徑預設只允許 owner / admin**。

| 路由 | owner | admin | editor | author | viewer |
|---|---|---|---|---|---|
| /admin/dashboard | ✓ | ✓ | ✓ | ✓ | 唯讀 |
| /admin/cms | ✓ | ✓ | ✓ | ✓ | 唯讀 |
| /admin/cms/pages | ✓ | ✓ | ✓ | 唯讀（文章草稿） | 唯讀 |
| /admin/cms/navigation | ✓ | ✓ | 唯讀 | ✗ | 唯讀 |
| /admin/cms/assets | ✓ | ✓ | ✓ | ✓ | ✗ |
| /admin/cms/seo | ✓ | ✓ | ✓ | ✗ | ✗ |
| /admin/commerce/* | ✓ | ✓ | ✗ | ✗ | ✗ |
| /admin/access-codes/* | ✓ | ✓ | ✗ | ✗ | ✗ |
| /admin/templates/* | ✓ | ✓ | ✗ | ✗ | ✗ |
| /admin/customer-sites/* | ✓ | ✓ | 唯讀 | ✗ | ✗ |
| /admin/seo-generator、/projects | ✓ | ✓ | ✓ | ✓ | ✗ |
| /admin/seo-generator/usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| /admin/settings/* | ✓ | ✓ | ✗ | ✗ | ✗ |
| /admin/settings/users（高風險） | ✓ | 唯讀 | ✗ | ✗ | ✗ |

- 未登入 → `/admin/login?next=…&error=login_required`
- 已登入但不在 admin_profiles（或 `is_active=false`）→ `/admin/login?error=not_admin`
- 角色不可進入 → `/admin/dashboard?error=forbidden`（顯示 ForbiddenState）
- 唯讀 → 頁面上方顯示 PermissionNotice。這只是 UI 提示，寫入仍需 Server Action 檢查與 RLS。
- 側欄選單依角色在伺服器端過濾（`filterAdminNav`）。
- supabase 模式：`admin_profiles` 以使用者 session 查詢，RLS 允許使用者讀自己的列（`user_id = auth.uid()`）。

## 5. 客戶後台（/portal）權限

| 條件 | 結果 |
|---|---|
| 未登入 | `/portal/login?next=…&error=login_required` |
| 已登入、沒有 active workspace，進入需要工作區的頁面 | `/portal/redeem-code?reason=no_workspace` |
| `/portal/support` | 已登入即可 |
| `/portal/sites/[siteId]/*`：網站不存在，或不屬於使用者的 workspace | `/portal/dashboard?error=forbidden`（不透露網站是否存在） |

- `requireSiteAccess` 先查網站所屬 workspace（`getSiteWorkspaceId`），再比對使用者的 memberships，最後才載入網站；`[siteId]/layout.tsx` 與每個子頁都會檢查。
- Portal repository 以 `viewer.workspaceIds` 限制查詢；supabase 模式另有 RLS（`can_read_site_project`）。
- 森映後台人員在 /portal 也只看得到自己加入的 workspace，不會因為 admin 角色看到客戶資料。
- 多工作區切換（WorkspaceSwitcher）目前是 placeholder：只有一個工作區時顯示名稱，多個時列出但停用。

## 6. Repository（supabase 模式第一版）

`packages/database/src/supabase/`：

| 功能 | 實作 |
|---|---|
| identity.getAdminRole | `admin_profiles`（role, is_active） |
| identity.listWorkspaceMemberships | `customer_workspace_members` + `customer_workspaces`（status） |
| accessCodes.redeem | RPC `create_workspace_from_access_code(code)`，成功後查 `customer_site_projects` 第一個網站 |
| accessCodes.list | `access_codes` + `entitlement_products` |
| customerSites.listSites / getSite / getSiteWorkspaceId | `customer_site_projects` + workspace / template 名稱 |
| customerSites.listDomains | `site_project_domains` + `site_ssl_certificates` |
| templates.listTemplates | `site_templates` |
| portal.listEntitlements | `user_entitlements` + `entitlement_products` + `entitlement_usage_quotas` |
| dashboard 統計 | 各表 `count: exact, head: true` |
| 其他（訂單、價格、訂閱、金流卡片、部署、表單、版型授權、文章生產器、audit logs） | 丟出 `NotImplementedInPhaseError`（不回傳假資料），規劃 Phase 3 |

- RPC 呼叫邊界在 `supabase/rpc.ts`，錯誤統一包成 `SupabaseRepositoryError`（`supabase/errors.ts`），訊息不含 token。
- 非 uuid 的 siteId 直接視為不存在，避免 PostgREST 型別錯誤。

## 7. 權限代碼兌換流程

```txt
/portal/redeem-code（公開）
  └─ 送出 code → redeemAccessCodeAction（Server Action）
       ├─ 格式錯誤 → invalid（不呼叫資料庫）
       ├─ 未登入 → 暫存代碼（httpOnly cookie，10 分鐘）→ /portal/login?next=/portal/redeem-code&error=login_required
       │            登入後回到兌換頁，自動帶回代碼
       ├─ mock：mock repository；supabase：RPC create_workspace_from_access_code
       ├─ valid / already_redeemed_by_current_user
       │     → 有網站：/portal/sites/[siteId]?redeem=<status>（網站總覽顯示結果）
       │     → 尚無網站：/portal/redeem-code?result=valid（引導建立網站）
       └─ 其他狀態 → 在表單下方顯示 RedeemCodeResult
```

狀態對照（`packages/shared/src/access-code.ts`：`mapRedeemResultToStatus`）：

| RedeemStatus | DB result |
|---|---|
| valid | `success` / `created` |
| invalid | `invalid_format` / `not_found` / `not_started` / `inactive_product` |
| expired | `expired` |
| already_redeemed | `already_redeemed`（來源為 `redeem_access_code`） |
| already_redeemed_by_current_user | `already_exists`（`create_workspace_from_access_code` 冪等） |
| already_redeemed_by_other_user | `already_redeemed`（來源為 `create_workspace_from_access_code`） |
| revoked | `revoked` |
| rate_limited | `rate_limited` |
| not_authenticated | 應用層：未登入 |
| server_error | 應用層：RPC / 網路錯誤、未知 result、設定錯誤 |

Mock 測試代碼：

| 代碼 | 結果 |
|---|---|
| SYT-SEO-2026-A8K3Q9 | valid |
| SYT-LP-2026-P7X2M4 | customer 本人已兌換；其他帳號為 already_redeemed_by_other_user |
| SYT-SEO-2026-R7T4W2 | other-customer 已兌換 |
| SYT-DM-2026-H4M8T2 | expired |
| SYT-AI-2026-N3Q8Z5 | revoked |
| SYT-SEO-2026-ZZZZZZ | invalid（不存在） |

Mock 兌換是無狀態模擬：不會真的建立 workspace，也不會改變代碼狀態。

## 8. Service role 安全邊界

- 讀取 `SUPABASE_SERVICE_ROLE_KEY` 的只有 `apps/admin/src/lib/supabase/service-role.ts`（`import 'server-only'`）。
- Phase 2 沒有任何頁面、proxy、登入或兌換流程使用 service role；兌換走使用者 session + SECURITY DEFINER RPC。
- `next.config.ts` 的 `env` 只暴露 `PUBLIC_SUPABASE_URL`、`PUBLIC_SUPABASE_ANON_KEY`。
- `phase2:auth` 會掃描：
  - 讀取者只能有上述一個檔案
  - client component 不匯入 server 模組
  - proxy 不使用 service role
  - admin `.next/static` 與 marketing `dist` 不含 server-only env 名稱、簽章預設值與密鑰格式
- 未來需要 service role 的操作（webhook、排程、森映 admin 受控操作）必須放在 server-only 模組，並先通過 `requireAdminPage`。

## 9. 驗收

| 指令 | 內容 |
|---|---|
| `pnpm phase2:auth` | 下方各組檢查 |
| `pnpm phase2:verify` | phase1:verify → phase2:auth（略過其中重複的 phase1:structure / rwd）→ lint → typecheck → build → rwd:check |

`pnpm phase2:auth` 的檢查分組：

- 靜態（1–6、8–10）：
  - guard 覆蓋（每個 page / layout 的 guard 字串與路由一致）
  - service role 邊界、Astro 不讀 service role
  - DATA_SOURCE 解析
  - 兌換狀態、登入路由
  - 正式 Supabase URL / project ref / JWT key / 金流密鑰掃描、env leak
- runtime（mock `next start` + Chrome）：
  - R1 未登入導向
  - R2 偽造 cookie
  - R3 登入 / 導回 / open redirect
  - R4 各角色與跨 workspace
  - R5 登出與 cookie 屬性
  - R6 兌換流程（含未登入 → 登入 → 帶回代碼 → 成功）
  - DATA_SOURCE=supabase 缺 env 的 runtime 失敗
- 另外執行 `phase1:structure` 與 `rwd:check`（登入頁、權限錯誤頁、兌換結果頁 × 6 種寬度）。

## 10. 已知限制

- 真實 Supabase Auth 流程（signInWithPassword、session refresh、RLS 查詢、RPC）已寫好程式，但本階段依規定未連線 Supabase，也未以本機 `supabase start` 做端到端測試。
- Mock session 為無狀態簽章 cookie：登出只清除該瀏覽器的 cookie，無法撤銷已複製的 token（supabase 模式由 Supabase Auth 撤銷 refresh token）。
- 唯讀角色目前只顯示提示；各表單的寫入 Server Action 尚未實作（畫面按鈕仍為停用）。
- 忘記密碼、註冊、邀請成員、多工作區切換、登入失敗次數限制尚未實作。
- 若正式環境誤設為 `DATA_SOURCE=mock`，任何人都能以示範帳號登入並看到 mock 資料（不含真實資料）。部署前必須設定 `DATA_SOURCE=supabase`。
