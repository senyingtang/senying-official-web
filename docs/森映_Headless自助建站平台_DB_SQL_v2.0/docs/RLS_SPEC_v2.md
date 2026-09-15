# RLS 與權限規格 v2.0

RLS 是 **第二道防線**。第一道仍是 Next.js Server Actions / Route Handlers：登入驗證 → 角色檢查 → Zod 驗證 → 欄位白名單 → 寫入 → audit log。UI 隱藏不算安全控制。

---

## 1. 三層防護

| 層 | 位置 | 作用 |
|---|---|---|
| RLS policy | `0013_rls.sql` | 「看得到哪些列、能不能寫這一列」 |
| Guard trigger | `0012` §E、`0011` §5 | 「這一列的哪些欄位能改、狀態能不能這樣轉」＋跨網站關聯一致性 |
| SECURITY DEFINER 函式 | `0012` §F–L | 需要跨表、鎖定、計數的業務動作（兌換、扣額度、建站、發布、付款成功） |

所有 public table 一律 `enable row level security`（0013 以迴圈套用）；**沒有 policy 的操作一律拒絕**。`service_role` 繞過 RLS，只能在伺服器端（Next.js server / Edge Function）使用，不可出現在前端。

---

## 2. 身分判斷函式

| 函式 | 判斷 |
|---|---|
| `auth.uid()` | 目前登入者 |
| `is_service_role()` | JWT role = `service_role`；沒有 JWT（psql / SQL Editor 以 postgres 執行）也視為服務端 |
| `is_internal_context()` | `current_user` 不是 `anon` / `authenticated`，也就是 service_role、postgres，或 **SECURITY DEFINER 函式內部**。guard trigger 用它區分「API 直接寫」與「受信任函式寫」，前端無法偽造 |
| `current_admin_role()` | `admin_profiles` 中啟用中的後台角色 |
| `is_owner()` | 後台 owner |
| `is_admin()` | 後台 owner 或 admin |
| `is_cms_staff()` | 任一啟用中的後台角色 |
| `can_publish_content()` | 後台 owner / admin / editor（v1.0 沿用） |
| `is_workspace_member(ws)` | 客戶 workspace active 成員（不論 workspace 狀態，用於讀取） |
| `has_workspace_role(ws, roles)` | active 成員且角色符合，**且 workspace 為 active**（用於寫入） |
| `can_read_site_project(p)` | 森映 admin 或該 workspace 成員 |
| `can_edit_site_project(p)` | 森映 admin 或 workspace owner / admin / editor，且網站不是 suspended / archived |
| `can_manage_site_project(p)` | 森映 admin 或 workspace owner / admin，且網站不是 suspended / archived |
| `is_site_publicly_visible(p)` | 網站 `published` + 發布設定 `is_public` 且非 `preview_only` + workspace active |
| `can_access_ai_workspace(ws, roles)` | 平台旗標 `ai_article_generator.customer_access` + workspace 角色 + `ai.article.generate` 權限 |

所有 helper 都是 `SECURITY DEFINER` + 固定 `search_path`，並授權 anon / authenticated 執行（policy 會以查詢者身分呼叫）；anon 呼叫時 `auth.uid()` 為 null，結果一律為 false。

---

## 3. 森映官方 CMS 角色矩陣（v1.0 沿用＋v2 收緊）

| 資料 | owner | admin | editor | author | viewer | anon |
|---|---|---|---|---|---|---|
| 站點設定 `cms_site_settings` | CRUD | CRUD | R | R | R | R（`is_public`） |
| 後台帳號 `admin_profiles` | CRUD | R | R | R | R | — |
| 頁面 / 區塊 / 產品 / 服務 / 案例 / FAQ / CTA / SEO | CRUD | CRUD | CRUD | R | R | R（已發布） |
| 轉址 / 選單 | CRUD | CRUD | R | R | R | R（啟用中） |
| 文章 | CRUD | CRUD | CRUD | 自己的 draft / review | R | R（已發布） |
| 詢問 `contact_inquiries` | RUD | RUD | RU | R | R | C（需同意、長度限制） |
| 轉換事件 | RD | RD | R | R | R | C |
| **稽核 `audit_logs`** | **R** | **R** | C（自己） | C（自己） | C（自己） | — |
| 商品方案 / 價格 | CRUD | CRUD | R | R | R | R（已發布、啟用） |
| 金流設定、銀行帳戶、優惠碼、Webhook | CRUD | CRUD | — | — | — | — |
| 訂單 / 付款 / 退款 | CRUD | CRUD | — | — | — | — |
| 訂閱 / 權限 / 代碼 | CRUD（代碼只可撤銷） | 同左 | — | — | — | — |
| 版型（含草稿） | CRUD | CRUD | R | R | R | R（已發布、非私人） |
| DNS 教學頁 | CRUD | CRUD | CRUD | R | R | R（已發布） |
| 客戶 workspace / 網站 / 表單送出（客服支援） | CRUD | CRUD | — | — | — | — |
| 內部 SEO 文章生產器（workspace_id is null） | CRUD | CRUD | CRU | CRU | R | — |
| 外部專案接入 | CRUD | CRUD | — | — | — | — |

> v1.0 允許所有後台角色讀取 audit_logs、且允許任何登入者寫入 audit_logs；v2.0 依需求改為 **只有 owner / admin 讀取**，新增只允許後台帳號以自己名義（`actor_id = auth.uid()`、`actor_type = 'admin'`）寫入，客戶端事件由 SECURITY DEFINER 函式寫入。

---

## 4. 客戶 Workspace 角色矩陣

| 資料 | owner | admin | editor | viewer | 非成員 |
|---|---|---|---|---|---|
| Workspace 基本資料 | RU（受限欄位不可改） | RU（同左） | R | R | — |
| 成員 | CRUD（含授予 owner） | CRUD（不可動 owner） | R | R | — |
| 邀請 | CRUD | CRUD | — | — | — |
| 網站專案 | RU（名稱）；建立用函式 | 同左 | R | R | — |
| 頁面 SEO / 區塊啟用排序 / 內容草稿 / 主題 / 選單 / 頁尾 / 素材 / 表單設定 | CRU(D) | CRU(D) | CRU(D) | R | — |
| 發布 `publish_site_project()` | ✅ | ✅ | — | — | — |
| 發布設定 | RU（依平台階段） | RU | R | R | — |
| 表單送出資料 | RUD | RUD | RU | R | — |
| 網域 | R；新增用函式；可設 primary / 轉址 / 移除 | 同左 | R | R | — |
| 訂單 / 訂閱 / 權限（workspace 綁定） | R | R | — | — | — |
| 版型授權 | R | R | R | R | — |
| SEO 文章生產器（v2 flag 開啟後） | CRUD | CRUD | CRU | R | — |

**Workspace 受限欄位**（只有森映 admin / 服務端可改）：`owner_user_id`、`status`、`site_project_limit_override`、`source_*`、`suspended_at`、`archived_at`、`customer_workspace_settings.feature_flags`。

---

## 5. 公開讀取（anon）

| 可讀 | 條件 |
|---|---|
| 森映官網內容 | v1.0 規則：`status = published` 且 `published_at <= now()`（排程時間已到） |
| 商品方案 / 價格 | 商品已發布且 `is_visible`；價格 `is_active` 且在有效期間 |
| 訂閱方案 / 權限定義 | `is_active`（方案另需 `is_public`） |
| 版型 | 已發布且非 `private`；版本 `published`；頁面 / 區塊 / 欄位 / 預覽站跟隨可見版本（**未購買可預覽**） |
| 客戶網站 | `is_site_publicly_visible()`；頁面另需已發布；內容值只讀 `content_state = 'published'` |
| DNS 教學頁 | 已發布 |
| 付款方式 | 只能透過 `get_enabled_payment_methods()`（僅回傳啟用中且 provider 已啟用的公開欄位） |

**anon 不可讀**：草稿、audit_logs、access_codes、金流設定、Webhook、訂單、表單送出、網域驗證碼、外部專案。

anon 可寫：`contact_inquiries`、`conversion_events`（v1.0 規則），以及透過 `submit_site_form()` 送出客戶網站表單（含 honeypot、同 IP 10 分鐘 5 次限制、欄位白名單）。

---

## 6. Guard trigger 一覽

| Trigger 函式 | 資料表 | 規則 |
|---|---|---|
| `guard_admin_profile_changes` | admin_profiles | API 端只有 owner 可新增 / 修改 / 刪除；**最後一位啟用中 owner 不可刪除、停用、降級**（服務端也不行）；advisory lock 防併發 |
| `guard_workspace_member_changes` | customer_workspace_members | 只有 workspace owner 可授予 / 變更 / 移除 owner；**最後一位 active owner 不可移除、停用、降級**；workspace 被刪除時的 cascade 例外 |
| `guard_workspace_changes` | customer_workspaces、customer_workspace_settings | 受限欄位只能由森映 admin / 服務端修改 |
| `guard_access_code_insert` | access_codes | 必須由 `issue_access_code()` 建立（交易內旗標），**禁止人工編碼** |
| `guard_access_code_update` | access_codes | 代碼身分欄位不可改；已兌換不可轉讓 / 改綁；revoked 不可復原；API 端只能撤銷、改期限與 metadata |
| `guard_audit_log_mutation` | audit_logs | 不可修改（外鍵 set null 例外）；刪除只允許 postgres（保存期限清理） |
| `guard_append_only` | 7 張 ledger 表 | API 端不可修改 / 刪除 |
| `guard_customer_site_structure` | 網站專案、頁面、區塊、欄位定義、內容值、表單、表單送出、發布設定、網域 | **模板制**：客戶不可新增 / 刪除頁面與區塊、不可改欄位定義、不可改 section_type / page_key 等結構欄位、不可直接寫 published 內容或把頁面設成 published、不可自行標記網域驗證；發布模式依平台旗標開放 |
| `enforce_parent_match` | 38 組關聯（0011） | 子資料與父資料必須屬於同一網站 / workspace / 版本（例如 section.page_id 的頁面必須屬於同一個 site_project_id） |
| `guard_order_status_transition` | commerce_orders | 合法狀態轉換 |

受信任寫入（SECURITY DEFINER 函式、service_role、postgres）會通過結構 guard，但 **最後一位 owner、代碼身分欄位、已兌換不可改綁、跨網站關聯** 這些規則對所有身分都生效。

---

## 7. 函式 EXECUTE 權限

Supabase 預設會把 public schema 新函式授權給 anon / authenticated；0012 最後把所有函式權限收回，再逐一開放：

| 類別 | anon | authenticated | service_role |
|---|---|---|---|
| RLS / CHECK helper、`get_enabled_payment_methods`、`submit_site_form` | ✅ | ✅ | ✅ |
| 業務函式（兌換、建站、發布、DNS、付款成功、到期排程…；函式內再檢查角色） | — | ✅ | ✅ |
| 內部函式（`write_audit_log`、`_redeem_access_code_internal`、`_site_create_entitlement`、trigger 函式） | — | — | ✅ |

`mark_payment_success_and_issue_entitlement`、`issue_access_code`、`generate_access_code`、`revoke_access_code`、`record_subscription_renewal`、`run_entitlement_expiry_job` 雖授權 authenticated，函式內會要求 `is_admin()` 或 `is_service_role()`。

---

## 8. Storage policy（0014）

| Bucket | 公開 | 讀 | 寫 |
|---|---|---|---|
| `public-assets` | ✅ | 所有人 | owner / admin / editor / author 上傳；editor 以上修改；owner / admin 刪除（v1.0 矩陣） |
| `private-admin-uploads` | — | 後台角色 | 同上 |
| `customer-site-assets` | ✅ | 成員 | 路徑第 1 層 workspace_id、第 2 層 site_project_id 必須對應，且 `can_edit_site_project` |
| `template-assets` | ✅ | 所有人 | owner / admin |
| `ai-article-exports` | — | `internal/` 後台角色；`{workspace_id}/` v2 客戶 | 同左寫入角色 |

客戶上傳不允許 SVG；檔名使用 UUID。

---

## 9. 必測項目（對應 `supabase/tests`）

| 測試 | 檔案 |
|---|---|
| anon 讀不到草稿、預覽網站、金流設定、代碼、稽核 | rls_smoke_test |
| viewer 唯讀；editor 不可改站點設定 / 讀稽核；admin 不可新增 owner | rls_smoke_test |
| 最後一位後台 owner 不可停用 / 降級 / 刪除；audit_logs 不可改 | rls_smoke_test |
| 客戶只能看自己的 workspace / 網站 / 表單送出；不可改受限欄位；最後一位 workspace owner | rls_smoke_test |
| 模板結構保護、跨網站關聯防呆 | rls_smoke_test、template_license_smoke_test |
| 代碼只有持有者看得到；兌換 / 轉讓 / 撤銷 / 過期 / 暴力猜測 | access_code_smoke_test |
| 付費 / 私人 / 方案限定版型使用權 | template_license_smoke_test |
| 網域資料與驗證碼不跨 workspace 外洩 | domain_dns_smoke_test |
| 函式 search_path、anon 不可執行敏感函式 | schema_smoke_test |
