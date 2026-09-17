# Phase 3.0：Commerce / 購物車 / 結帳 / Sandbox 付款 MVP

本階段把官網從「只能預約討論」變成可以真的走完一次購買流程：

```
產品頁 → 加入購物車 → /cart → /checkout → 建立訂單 → 建立付款
      → 本機 Sandbox 模擬付款 → webhook 驗簽 + 冪等 → 發放權限代碼 → /checkout/success
```

**正式付款沒有開放。** 目前唯一能完成付款的 provider 是本機 Sandbox 模擬付款；
綠界與 LINE Pay 只有 adapter 骨架與簽章邊界，沒有憑證時一律顯示「未設定」，**不會 fallback 成假成功**。
資料庫 feature flag `commerce.live_payments` 維持 `false`。

---

## 1. 為什麼「伺服器」是 Postgres

`apps/marketing` 是 Astro static build（`output: 'static'`），沒有自己的伺服器。
購物車與結帳需要一個「前端無法繞過」的地方重新計算金額，因此這一層放在資料庫：

| 需要伺服器判斷的事 | 實作位置 |
|---|---|
| 商品 / 價格是否可購買 | `commerce_product_is_purchasable()` / `commerce_price_is_purchasable()` |
| 購物車內容與小計 | `commerce_cart_*()`（`SECURITY DEFINER`） |
| 訂單金額 | `create_order_from_cart()`：逐項重新讀 DB 價格後加總 |
| 收據查詢 | `get_order_receipt(p_public_token)`：比對 sha256 |
| 付款成功 / 發碼 | `mark_payment_success_and_issue_entitlement()`（只允許 service role） |

瀏覽器只呼叫 PostgREST 的 RPC 端點，**沒有任何一個 RPC 接受金額參數**。

付款頁與 provider webhook 需要 service role，因此放在 Next.js 後台（`apps/admin`），
檔案標記 `server-only`，`SUPABASE_SERVICE_ROLE_KEY` 不會進入任何瀏覽器 bundle。

---

## 2. 資料模型（`0018_commerce_checkout_mvp.sql`）

沒有另建一套電商 schema。0018 只補上購物車，其餘沿用 DB SQL v2.0 既有資料表
（`commerce_products` / `commerce_product_prices` / `commerce_orders` / `commerce_order_items` /
`commerce_payments` / `commerce_checkout_sessions` / `commerce_webhook_events` / `access_codes`）。

| 新增 | 說明 |
|---|---|
| `commerce_carts` | 訪客或會員的購物車；訪客以 `session_token_hash`（sha256）識別 |
| `commerce_cart_items` | `unique(cart_id, price_id)`、`quantity` 1–100 |
| enum 值 `sandbox` | 加到 `payment_provider` 與 `payment_method_type` |

### 刻意的設計

- **`commerce_cart_items` 不保存單價。** 加入購物車當下的價格沒有任何意義，結帳時一律重讀。
- **訪客 token 只存 sha256。** 瀏覽器 localStorage 持有 32 bytes 隨機明文，資料庫存不可逆的雜湊。
  因此 `commerce_carts` 對 `anon` **沒有任何 RLS policy**（deny by default）：訪客只能透過 RPC 操作自己的購物車。
- **收據 token 同樣只存 sha256**（`commerce_checkout_sessions.public_token_hash`），明文只在下單當下回傳一次。
  公開網址不使用流水號 id，權限代碼也不會出現在任何網址上。
- **金額一律是整數 minor units**（`amount_cents bigint`）；TWD 另有 CHECK 要求是整數元（綠界 `TotalAmount` 是整數）。

---

## 3. 價格：目前只有「測試價格」

0018 把 SEO 形象官網與一頁式網頁兩個方案上架，並建立兩筆價格：

| price_key | amount_cents | name |
|---|---|---|
| `seo_website_one_time` | 100000 | 測試價格（非正式售價） |
| `landing_page_one_time` | 50000 | 測試價格（非正式售價） |

兩筆都帶 `metadata.test_price = true` 與 `official_pricing_confirmed = false`。

**規則：任何顯示金額的頁面都必須同時顯示「測試價格」與「非正式售價」。**
`ui:verify` 與 `cart:verify` 會掃描整份 build 輸出強制這條規則，避免測試金額被當成正式報價。

---

## 4. 前台

| 路由 | 內容 | 索引 |
|---|---|---|
| `/products/*` | `AddToCart.astro`：只送 `price_id`，不送任何金額 | index |
| `/cart` | 購物車明細、數量 1–100、清空、前往結帳 | **noindex**、不進 sitemap / 搜尋 |
| `/checkout` | 購物車確認 → 客戶資料 → 付款方式 → 訂單摘要 | **noindex** |
| `/checkout/success` | 憑收據 token 顯示訂單與權限代碼 | **noindex** |
| `/checkout/failed` | 明確說明沒有發碼、沒有收費 | **noindex** |

`robots.txt` 另外 `Disallow: /cart` 與 `Disallow: /checkout`。

### 結帳頁的安全性

- 沒有 `<form action>`：不會把任何資料直接 POST 給第三方
- 沒有卡號 / CVV 欄位（本站永遠不收集，也不保存）
- 付款按鈕預設 `disabled`，購物車與客戶資料在瀏覽器就緒後才啟用
- 只顯示 `get_enabled_payment_methods()` 回傳的付款方式；目前只有 `sandbox_checkout`

### 購物車 client

`apps/marketing/src/lib/cart-client.ts` 刻意不使用 `@supabase/supabase-js`：
只需要一個 `POST /rest/v1/rpc/<fn>`，避免把整包 SDK 放進官網 bundle（`cart:verify` 會檢查）。
沒有設定 Supabase 的 mock build 會退回 localStorage 示範購物車，並在畫面上明確標示「示範購物車（未連線資料庫）」，
**不會假裝可以結帳**。

---

## 5. 金流架構

```
apps/admin/src/lib/payments/
  types.ts        PaymentProviderAdapter 介面 + sanitizePayload（移除密鑰 / 簽章 / 代碼）
  signatures.ts   CheckMacValue、LINE Pay HMAC、Sandbox HMAC、timingSafeEqual 比對
  providers.ts    SandboxPaymentProvider / EcpayPaymentProvider / LinePayPaymentProvider
  service.ts      handleProviderCallback：驗簽 → webhook 冪等 → 標記付款 → 發碼 → audit
  storefront.ts   resolveStorefrontOrigin（open redirect 防護）
```

### 未設定憑證時的行為

| provider | `availability().configured` | `createPayment()` |
|---|---|---|
| `sandbox`（`PAYMENT_SANDBOX_ENABLED=true` + secret ≥ 16 字元） | `true`，`isSimulation: true` | 導向本機模擬頁 |
| `ecpay`（缺 Merchant ID / HashKey / HashIV） | `false` | `{ ok: false, reason: '未設定正式憑證…' }` |
| `linepay`（缺 Channel ID / Secret） | `false` | `{ ok: false, reason: '未設定正式憑證…' }` |

`.env.example` 的所有金流欄位保持空白；`payment:verify` 會檢查沒有任何寫死的憑證。

### 付款成功的唯一路徑

```
provider callback（含簽章）
  → adapter.verifyCallback()          簽章錯誤 → 記一筆 signature_valid = false，就此停止
  → insert commerce_webhook_events    idempotency_key = `${provider}:${providerEventId}`（unique）
                                      23505 → duplicate，不再處理
  → 依 merchant_trade_no 找付款單     找不到 → payment_not_found
  → 金額比對                          不符 → 拒絕
  → mark_payment_success_and_issue_entitlement()   RPC 內以 entitlements_issued_at 再守一次
```

**瀏覽器不能決定付款成功**：沒有任何端點接受 `?status=paid` 之類的參數。
後台也沒有「標記付款成功」按鈕，避免出現第二條發碼路徑。

### Sandbox 模擬付款頁

`GET /api/payments/sandbox/[paymentId]`（`PAYMENT_SANDBOX_ENABLED` 未開時回 404）：
整頁明確標示「本機 Sandbox 付款（模擬），不會真的扣款」，提供成功 / 失敗 / 取消三個按鈕。
送出後由伺服器產生一個**帶簽章**的 callback，走與正式 provider 完全相同的 webhook 流程。

`PAYMENT_SANDBOX_SECRET` 是本機隨機字串，不是任何金流機構的密鑰；驗收時由腳本當場產生，不寫入檔案。

---

## 6. 權限代碼

付款成功後由 `mark_payment_success_and_issue_entitlement()` 依訂單品項數量發碼（數量 2 → 2 組）。

- 完整代碼只透過「收據 token」回傳給下單的瀏覽器，**不出現在任何網址上**
- 後台訂單明細只顯示遮罩後的代碼（`maskAccessCode`）
- audit log 只記錄發放數量（`access_code_count`），不記錄代碼內容
- webhook payload 經 `sanitizePayload()` 過濾（密鑰、簽章、卡號、代碼、token 一律 `[redacted]`）

---

## 7. 後台 Commerce

| 頁面 | 資料來源 |
|---|---|
| `/admin/commerce/products` | `commerce_products` |
| `/admin/commerce/prices` | `commerce_product_prices` |
| `/admin/commerce/orders` | `commerce_orders` + `commerce_payments` + `access_codes`（含統計） |
| `/admin/commerce/orders/[id]` | 品項 / 付款紀錄 / 權限代碼（遮罩）/ 操作紀錄 |
| `/admin/commerce/payment-providers` | `commerce_payment_provider_configs`（只顯示參照名稱） |
| `/admin/commerce/subscriptions` | `customer_subscriptions`（**唯讀**，本階段不實作定期扣款） |

`/admin/dashboard` 的「商務概況」「最近訂單」「訂閱」都接真實 repository；
讀取失敗時顯示「尚未啟用」，**不會用假數字冒充真資料**。

---

## 8. 驗收

| 指令 | 內容 | 項目 |
|---|---|---|
| `pnpm payment:verify` | 金流安全邊界（不連 DB、不啟動伺服器） | 16 |
| `pnpm commerce:verify` | 資料庫 / RLS（全程 rollback） | 14 |
| `pnpm commerce-integration:verify` | 端到端：購物車 → 下單 → Sandbox 付款 → 發碼 → 收據 | 16 |
| `pnpm cart:verify` | 購物車 / 結帳前台（build 輸出 + 原始碼邊界） | 18 |
| `pnpm phase30:verify` | 以上 + Phase 2.8 / 2.9 全部驗收 + 完整 RWD（20 步） | — |

完整 RWD 為 **101 routes × 6 widths = 606 checks**，整輪只在 `phase2:verify` 跑一次。

`commerce-integration:verify` 會以本機 Supabase 設定另外 build 一份後台到 `apps/admin/.next-supabase`
（`PUBLIC_SUPABASE_*` 在 build 時就會內嵌，所以不同設定必須分開 build），不會覆蓋其他驗收使用的 mock build。

---

## 9. 本階段沒有做的事

- 正式金流（綠界 / LINE Pay）串接與 staging 驗證 — 只有 adapter 骨架
- 定期扣款 / 訂閱扣款 — `customer_subscriptions` 維持唯讀
- 退款流程、發票開立
- 優惠券 / 折扣碼
- 會員購物車合併（登入後把訪客購物車併入會員）
- 任何 production 部署或遠端 Supabase 操作
