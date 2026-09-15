# Migration 執行順序 v2.0

## 1. 必須依序執行

| 順序 | 檔案 | 依賴 | 可重複執行 |
|---:|---|---|---|
| 1 | `0001_extensions_and_enums.sql` | — | ✅ enum 以 `duplicate_object` 保護 |
| 2 | `0002_admin_and_cms_baseline.sql` | 0001 | ✅ `create table if not exists`、`add column if not exists` |
| 3 | `0003_commerce_checkout.sql` | 0001、0002（cms_assets） | ✅ |
| 4 | `0004_subscriptions_entitlements_access_codes.sql` | 0003 | ✅ 外鍵以 `duplicate_object` 保護 |
| 5 | `0005_customer_workspaces.sql` | 0004 | ✅ |
| 6 | `0006_site_builder.sql` | 0005 | ✅ |
| 7 | `0007_template_marketplace.sql` | 0003、0004、0005、0006 | ✅ |
| 8 | `0008_domains_dns_deployments.sql` | 0006 | ✅ |
| 9 | `0009_seo_article_generator.sql` | 0004、0005、0006 | ✅ |
| 10 | `0010_external_project_connections.sql` | 0005、0006、0009 | ✅ |
| 11 | `0011_indexes_triggers.sql` | 0001 ~ 0010（所有資料表） | ✅ `if not exists`、trigger 先 drop 再建 |
| 12 | `0012_security_functions.sql` | 0011 | ✅ `create or replace`、trigger 先 drop 再建 |
| 13 | `0013_rls.sql` | 0012（policy 使用 helper function） | ✅ 先移除 public schema 全部 policy 再重建 |
| 14 | `0014_storage.sql` | 0012、0013；需要 Supabase `storage` schema | ✅ bucket upsert、policy 先 drop |
| 15 | `0015_seed_content.sql` | 0001 ~ 0014 | ✅ 全部以 key 查找 + `on conflict do nothing` |

每個檔案都包在 `begin; ... commit;` 內，任何錯誤都會整檔回滾。

## 2. 跨檔外鍵（先建欄位、後補外鍵）

資料表之間有循環參照（例如商品 → 權限 → 訂單 → workspace → 網站 → 模板），做法是先建立欄位，等被參照的表建立後再用 `alter table ... add constraint` 補上。

| 欄位 | 建立於 | 外鍵補於 | 參照 |
|---|---|---|---|
| `commerce_products.entitlement_product_id` | 0003 | 0004 | `entitlement_products` |
| `commerce_order_items.entitlement_product_id` | 0003 | 0004 | `entitlement_products` |
| `commerce_order_items.subscription_plan_price_id` | 0003 | 0004 | `subscription_plan_prices` |
| `commerce_payments.customer_subscription_id` | 0003 | 0004 | `customer_subscriptions` |
| `commerce_checkout_sessions.workspace_id` | 0003 | 0005 | `customer_workspaces` |
| `commerce_orders.workspace_id` | 0003 | 0005 | `customer_workspaces` |
| `customer_subscriptions.workspace_id` | 0004 | 0005 | `customer_workspaces` |
| `access_codes.redeemed_workspace_id` | 0004 | 0005 | `customer_workspaces` |
| `access_code_redemptions.workspace_id` | 0004 | 0005 | `customer_workspaces` |
| `user_entitlements.workspace_id` | 0004 | 0005 | `customer_workspaces` |
| `entitlement_usage_events.workspace_id` | 0004 | 0005 | `customer_workspaces` |
| `audit_logs.workspace_id` | 0002 | 0005 | `customer_workspaces` |
| `commerce_order_items.template_id` | 0003 | 0007 | `site_templates` |
| `customer_site_projects.template_id` / `template_version_id` | 0006 | 0007 | `site_templates` / `site_template_versions` |
| `customer_site_pages.template_page_id` | 0006 | 0007 | `site_template_pages` |
| `customer_site_sections.template_section_id` | 0006 | 0007 | `site_template_sections` |
| `customer_site_section_fields.template_field_id` | 0006 | 0007 | `site_template_fields` |
| `customer_site_deployments.template_version_id` | 0006 | 0007 | `site_template_versions` |
| `site_templates.latest_version_id` | 0007 | 0007（版本表建立後） | `site_template_versions` |
| `ai_article_projects.external_connection_id` | 0009 | 0010 | `external_project_connections` |

## 3. 為什麼索引、函式、RLS 放在後面

- **0011 索引**：用迴圈掃描 `pg_constraint`，替「所有」外鍵欄位自動補索引，新增資料表不會漏。
- **0012 函式**：SQL function 建立時會檢查函式本體引用的資料表，所以必須在所有表建立後。
- **0013 RLS**：policy 直接呼叫 0012 的 helper（例如 `is_admin()`、`can_edit_site_project()`）。
- **0014 Storage**：storage policy 也使用 0012 的 helper。
- **0015 Seed**：`issue_access_code()` 等函式與 guard trigger 都已就緒，seed 不會繞過規則。
- **0016 官網全站設定**（Phase 2.6C）：只寫入 `cms_site_settings`（site.brand / site.socials / site.floating_actions）與更新 seed 商品的公開名稱，依賴 0002 資料表、0013 RLS 與 0015 seed；不變更 schema，尚未套用到任何專案。

## 4. 從 v1.0 升級

v1.0 migration 名稱是 `0001 ~ 0007`，v2.0 是 `0001 ~ 0015`，**檔名有重疊但內容不同**。

- **新專案**：直接使用 v2.0 的 0001 ~ 0015，不要再放 v1.0 檔案。
- **已套用 v1.0 的環境**：Supabase CLI 以檔名時間戳記錄已套用的版本，同名檔案不會重跑。建議做法：
  1. 將 v2.0 檔案改成新的時間戳檔名（例如 `20260915000001_v2_extensions_and_enums.sql` …），保持相同順序；
  2. 先在 staging 從 v1.0 資料庫快照套用；
  3. 跑完 5 支 smoke test 再套用到正式專案。
- v2.0 DDL 全部可重複執行，v1.0 已存在的資料表只會補上新增欄位（例如 `audit_logs.actor_type`、join table 的 `created_at`）。
- 0013 會 **移除並重建 public schema 所有 policy**；如果正式環境有手動加過的 policy，套用前要先備份（`select * from pg_policies where schemaname = 'public'`）。

## 5. 本機驗證指令

```bash
supabase start
supabase db reset
for t in schema_smoke_test rls_smoke_test access_code_smoke_test template_license_smoke_test domain_dns_smoke_test; do
  psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -v ON_ERROR_STOP=1 -f "supabase/tests/$t.sql" || break
done
```
