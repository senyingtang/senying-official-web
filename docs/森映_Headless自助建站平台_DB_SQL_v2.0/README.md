# 森映 Headless 自助建站電商平台 DB SQL v2.0

以 `森映品牌官網_DB_SQL_v1.0` 為基底，把原本的「森映品牌官網 CMS」擴充成 **森映 Headless 自助建站電商平台** 的 Supabase 資料層規格包。

> ⚠️ 這個規格包 **還沒有** 套用到任何正式 Supabase 專案。
> 沒有執行 `supabase db push`，沒有連線正式資料庫，也沒有寫入任何正式密鑰。

---

## 1. 平台定位與技術分工

| 層 | 技術 | 負責 |
|---|---|---|
| 前台 | **Astro** | 森映官網、SEO 頁面、產品 / 案例 / 文章頁、結帳入口頁、未來客戶網站（Headless 前台） |
| 後台 | **Next.js** | 森映官方後台、客戶自助建站後台、SEO 文章生產器工具後台 |
| 資料 / 服務 | **Supabase** | Auth、Postgres、Storage、RLS、Edge Functions（金流 Webhook、DNS 檢查、AI 生成、排程） |

## 2. 版本策略（資料結構一次到位，功能依旗標開放）

| 項目 | v1（本次上線範圍） | v2 | v3 |
|---|---|---|---|
| 自助建站 | 模板制；SEO 形象官網、一頁式網頁；**每次購買 1 個網站** | 依方案開放多網站 | — |
| 電商網站 | 只做方案展示，實際建站走客製報價 | — | — |
| 發布 | 不公開發布，只建立網站資料與預覽（`preview_only`） | 森映平台子網域 | 客戶自訂網域 / DNS / 轉址 |
| SEO 文章生產器 | 森映內部使用 | 開放客戶權限 | — |
| 金流 | 保留介面與 DB，不串正式金流；後台可「標記付款成功」 | 串接綠界 / LINE Pay | — |

開關位置：`cms_site_settings` 的 `platform.feature_flags`（預設全部是 v1 狀態）。

## 3. 資料夾結構

```txt
森映_Headless自助建站平台_DB_SQL_v2.0/
├─ README.md                  本文件
├─ AGENT_NOTES.md             給開發 Agent 的實作注意事項與驗證紀錄
├─ docs/
│  ├─ DB_SPEC_v2.md           資料表總覽、命名規範、模組關係
│  ├─ RLS_SPEC_v2.md          角色矩陣與 RLS / guard trigger 規則
│  ├─ ACCESS_CODE_SPEC.md     權限代碼格式、生命週期、兌換與轉讓
│  ├─ PAYMENT_SPEC.md         金流 provider、付款方式、Webhook、密鑰管理
│  ├─ SUBSCRIPTION_SPEC.md    月繳 / 年繳 / 一次性、續訂、取消、到期
│  ├─ TEMPLATE_MARKETPLACE_SPEC.md  免費 / 付費 / 方案限定 / 私人版型
│  ├─ DOMAIN_DNS_SPEC.md      子網域、自訂網域、DNS 指示、SSL、部署
│  ├─ SEO_ARTICLE_GENERATOR_SPEC.md SEO 文章生產器資料與額度
│  └─ MIGRATION_ORDER.md      Migration 執行順序與跨檔外鍵
└─ supabase/
   ├─ migrations/             0001 ~ 0016
   └─ tests/                  6 支 smoke test（全程 rollback；Phase 2.8 新增 site_settings_rls.sql）
```

## 4. Migration 一覽

| 檔案 | 內容 |
|---|---|
| `0001_extensions_and_enums.sql` | pgcrypto、citext；v1 enum + v2 enum |
| `0002_admin_and_cms_baseline.sql` | v1.0 全部 CMS 資料表（沿用）＋ audit_logs 擴充欄位、customer_profiles |
| `0003_commerce_checkout.sql` | 商品方案、價格、結帳、訂單、付款、金流設定、銀行帳戶、優惠碼、退款、Webhook |
| `0004_subscriptions_entitlements_access_codes.sql` | 訂閱方案、訂閱、週期、帳單、取消；權限定義、代碼、兌換、轉讓、額度 |
| `0005_customer_workspaces.sql` | Workspace、成員、邀請、設定 |
| `0006_site_builder.sql` | 網站專案、頁面、區塊、欄位、內容（draft / published）、主題、選單、頁尾、素材、表單、發布 |
| `0007_template_marketplace.sql` | 版型、版本、頁面 / 區塊 / 欄位定義、分類、商品、授權、購買、預覽站 |
| `0008_domains_dns_deployments.sql` | 網域、驗證、DNS 指示、DNS 教學頁、SSL、發布目標、部署、檢查紀錄 |
| `0009_seo_article_generator.sql` | 品牌資料、專案、關鍵字、生成、輸出、匯出、額度、使用紀錄、審核 |
| `0010_external_project_connections.sql` | 既有網站接入、同步紀錄、欄位對應 |
| `0011_indexes_triggers.sql` | 索引（含自動補齊所有外鍵索引）、updated_at trigger、跨網站關聯一致性 trigger |
| `0012_security_functions.sql` | 權限 helper、guard trigger、代碼 / 額度 / 建站 / 發布 / DNS / 付款業務函式、EXECUTE 權限 |
| `0013_rls.sql` | 所有 public table 啟用 RLS 與 policy |
| `0014_storage.sql` | 5 個 bucket 與 storage policy |
| `0015_seed_content.sql` | v1 官網 seed、平台設定、權限、方案、金流（停用）、版型草稿、DNS 教學、既有專案盤點 |
| `0016_marketing_site_settings.sql` | Phase 2.6C：官網品牌名稱（森映 SEN YING）、社群連結、浮動快捷列與購物車捷徑設定（只新增 / 補齊設定資料列，不變更 schema；可重複執行）。Phase 2.8：本機 db reset 驗證通過，並補上 0015 seed 缺少的 `logo_url` / `favicon_url`；**尚未套用到任何遠端 / 正式專案** |

詳細順序與相依關係見 [`docs/MIGRATION_ORDER.md`](docs/MIGRATION_ORDER.md)。

## 5. 使用方式（僅限本機 / staging）

```bash
# 1. 在「新的專案 repo」中放入 migrations（不要直接對正式專案 push）
cp supabase/migrations/*.sql <project>/supabase/migrations/

# 2. 本機驗證
supabase start
supabase db reset          # 依序套用 0001 ~ 0016

# 3. 執行 smoke test（每支都包在交易中並 rollback）
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/schema_smoke_test.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/rls_smoke_test.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/access_code_smoke_test.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/template_license_smoke_test.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/domain_dns_smoke_test.sql
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f supabase/tests/site_settings_rls.sql
```

> 上面的連線字串是 Supabase CLI 本機預設值，不是正式環境憑證。
> 森映官網 repo（SYT_Official_Website）的 `supabase/config.toml` 改用 544xx port（DB 54422），避免與本機其他專案的 543xx stack 衝突；
> 在該 repo 請使用 `pnpm db:smoke`（以 `docker exec supabase_db_syt-official-website psql` 執行全部 smoke test），不要直接連 54322。
> 輸出中看到 `NOTICE: PASS ...` 表示通過；任何 `FAIL` 都會中止並回報錯誤。

## 6. 上線前一定要做

1. **Bootstrap 第一位 owner**：migration 不會指定任何帳號。建立 Auth 使用者後，在 SQL Editor（postgres 身分）執行：
   ```sql
   insert into public.admin_profiles(user_id, display_name, role, is_active)
   values ('<AUTH_USER_UUID>', '<管理者名稱>', 'owner', true);
   ```
   不要把 UUID 寫進 migration 或 Git。
2. **平台 DNS 設定**：把 `platform.dns` 的 `example.com` 占位值換成正式 CNAME 目標，並把 `is_placeholder` 改成 `false`。
3. **金流密鑰**：HashKey / HashIV / Channel Secret 只放 Supabase Vault 或 Edge Function Secrets；資料庫只存 `vault:<name>` 參照。
4. **價格**：seed 的方案價格是 `0` 且 `is_active = false`（待業主確認），上架前在後台設定。
5. **版型**：seed 的兩個免費版型是草稿，Astro 模板完成後再發布版本。
6. **排程**：以 pg_cron 或 Edge Function 定期呼叫 `run_entitlement_expiry_job()`。
7. **staging 完整跑一次 6 支 smoke test**，再決定是否套用到正式專案。

## 7. 與 v1.0 的相容性

- v1.0 的資料表、欄位、enum、函式名稱全部保留（`admin_profiles`、`cms_*`、`seo_*`、`blog_*`、`products`、`services`、`case_*`、`faqs`、`cta_blocks`、`contact_inquiries`、`conversion_events`、`audit_logs`）。
- 已套用 v1.0 的環境可以接著套用 v2.0：DDL 使用 `if not exists`，0013 會重建所有 public policy，0014 會重建 storage policy。
- v2.0 收緊了三件事，說明在 `docs/RLS_SPEC_v2.md`：
  1. `audit_logs` 改為只有 owner / admin 可讀，不可修改。
  2. 修正 v1.0 `guard_admin_profile_changes()` 在非後台帳號新增 admin_profiles 時判斷式為 null 而未擋下的問題。
  3. 最後一位 owner 除了不能刪除，也不能停用或降級。
