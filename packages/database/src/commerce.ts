/**
 * Commerce 檢視模型（Phase 3.0）：商品目錄、購物車、訂單收據、付款方式。
 *
 * 金額一律是 **整數 minor unit（cents）**，TWD 以 100 為一元（DB CHECK 要求 TWD 金額為整數元）。
 * 前端永遠不決定金額：這裡的型別只是「顯示用」，真正的計算在 create_order_from_cart（SECURITY DEFINER）。
 *
 * 本檔沒有任何 import：Astro 前台、Next.js 後台與 Node 驗收腳本都可以直接載入。
 */

export const CART_TOKEN_STORAGE_KEY = 'syt-cart-token';
export const CART_MAX_QUANTITY = 100;
export const CART_MAX_LINES = 20;

/** 測試價格提示：只要畫面上出現金額，就必須同時出現這兩段文字 */
export const TEST_PRICE_BADGE = '測試價格';
export const TEST_PRICE_NOTICE = '目前顯示的是測試價格，非正式售價；正式價格確認後才會公開。';
/** Sandbox 付款提示：不可讓使用者誤以為是真實付款 */
export const SANDBOX_PAYMENT_NOTICE = '本機 Sandbox 付款（模擬），不會真的扣款，也不會向任何金流機構請款。';

export interface CatalogPrice {
  priceId: string;
  priceKey: string;
  name: string;
  currency: string;
  amountCents: number;
  billingInterval: 'one_time' | 'month' | 'year';
  isDefault: boolean;
  isTestPrice: boolean;
}

export interface CatalogProduct {
  productId: string;
  sku: string;
  slug: string;
  name: string;
  productCode: string;
  shortDescription: string;
  prices: CatalogPrice[];
}

export interface CartLine {
  itemId: string;
  productId: string;
  productSlug: string;
  productName: string;
  productCode: string;
  sku: string;
  priceId: string;
  priceKey: string;
  priceName: string;
  billingInterval: string;
  currency: string;
  unitAmountCents: number;
  quantity: number;
  lineTotalCents: number;
  isTestPrice: boolean;
  isAvailable: boolean;
}

export interface CartState {
  cartId: string | null;
  status: string;
  currency: string;
  /** Badge 顯示的數字：所有可購買商品的數量總和（A×2 + B×3 = 5） */
  itemCount: number;
  lineCount: number;
  subtotalCents: number;
  hasTestPrice: boolean;
  hasUnavailableItem: boolean;
  items: CartLine[];
}

export const EMPTY_CART: CartState = {
  cartId: null,
  status: 'open',
  currency: 'TWD',
  itemCount: 0,
  lineCount: 0,
  subtotalCents: 0,
  hasTestPrice: false,
  hasUnavailableItem: false,
  items: [],
};

export interface PaymentMethodOption {
  methodKey: string;
  provider: string;
  methodType: string;
  displayName: string;
  description: string;
  /** true：模擬付款，畫面必須明確標示 */
  isSimulation: boolean;
  sortOrder: number;
}

export interface BuyerInput {
  name: string;
  email: string;
  phone: string;
  company: string;
  taxId: string;
  note: string;
  consent: boolean;
}

export const EMPTY_BUYER: BuyerInput = { name: '', email: '', phone: '', company: '', taxId: '', note: '', consent: false };

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  /** 只在下單當下回傳一次；資料庫只存 sha256 */
  publicToken: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  paymentId: string;
  paymentProvider: string;
  paymentEnvironment: string;
  merchantTradeNo: string;
}

export interface ReceiptItem {
  productName: string;
  sku: string;
  quantity: number;
  unitAmountCents: number;
  lineTotalCents: number;
  isTestPrice: boolean;
}

export interface ReceiptAccessCode {
  code: string;
  productCode: string;
  status: string;
  expiresAt: string | null;
}

export interface OrderReceipt {
  found: boolean;
  orderNumber: string;
  status: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  buyerName: string;
  buyerEmail: string;
  createdAt: string | null;
  paidAt: string | null;
  paymentStatus: string;
  paymentProvider: string;
  paymentEnvironment: string;
  paymentFailureMessage: string;
  paymentId: string | null;
  items: ReceiptItem[];
  accessCodes: ReceiptAccessCode[];
}

export const NOT_FOUND_RECEIPT: OrderReceipt = {
  found: false,
  orderNumber: '',
  status: '',
  currency: 'TWD',
  subtotalCents: 0,
  totalCents: 0,
  buyerName: '',
  buyerEmail: '',
  createdAt: null,
  paidAt: null,
  paymentStatus: '',
  paymentProvider: '',
  paymentEnvironment: '',
  paymentFailureMessage: '',
  paymentId: null,
  items: [],
  accessCodes: [],
};

/** 訂單是否已完成付款（收據頁才顯示權限代碼） */
export function isPaidOrderStatus(status: string): boolean {
  return status === 'paid' || status === 'fulfilled';
}

export const ORDER_STATUS_LABELS_ZH: Record<string, string> = {
  pending: '待處理',
  awaiting_payment: '等待付款',
  paid: '已付款',
  fulfilled: '已完成',
  cancelled: '已取消',
  refunded: '已退款',
  partially_refunded: '部分退款',
  failed: '付款失敗',
};

export const PAYMENT_STATUS_LABELS_ZH: Record<string, string> = {
  pending: '待付款',
  processing: '處理中',
  awaiting_transfer: '等待轉帳',
  succeeded: '付款成功',
  failed: '付款失敗',
  cancelled: '已取消',
  expired: '已逾期',
  refunded: '已退款',
  partially_refunded: '部分退款',
};

// ---------------------------------------------------------------------------
// jsonb → 檢視模型
// ---------------------------------------------------------------------------

type Json = Record<string, unknown>;
const record = (value: unknown): Json => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {});
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.map(record) : []);
const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const bool = (value: unknown): boolean => value === true;
const nullableStr = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);

export function cartStateFromJson(value: unknown): CartState {
  const data = record(value);
  return {
    cartId: nullableStr(data.cart_id),
    status: str(data.status, 'open'),
    currency: str(data.currency, 'TWD'),
    itemCount: num(data.item_count),
    lineCount: num(data.line_count),
    subtotalCents: num(data.subtotal_cents),
    hasTestPrice: bool(data.has_test_price),
    hasUnavailableItem: bool(data.has_unavailable_item),
    items: list(data.items).map<CartLine>((item) => ({
      itemId: str(item.item_id),
      productId: str(item.product_id),
      productSlug: str(item.product_slug),
      productName: str(item.product_name),
      productCode: str(item.product_code),
      sku: str(item.sku),
      priceId: str(item.price_id),
      priceKey: str(item.price_key),
      priceName: str(item.price_name),
      billingInterval: str(item.billing_interval, 'one_time'),
      currency: str(item.currency, 'TWD'),
      unitAmountCents: num(item.unit_amount_cents),
      quantity: num(item.quantity),
      lineTotalCents: num(item.line_total_cents),
      isTestPrice: bool(item.is_test_price),
      isAvailable: bool(item.is_available),
    })),
  };
}

export function catalogFromJson(value: unknown): CatalogProduct[] {
  return list(value).map<CatalogProduct>((item) => ({
    productId: str(item.product_id),
    sku: str(item.sku),
    slug: str(item.slug),
    name: str(item.name),
    productCode: str(item.product_code),
    shortDescription: str(item.short_description),
    prices: list(item.prices).map<CatalogPrice>((price) => ({
      priceId: str(price.price_id),
      priceKey: str(price.price_key),
      name: str(price.name),
      currency: str(price.currency, 'TWD'),
      amountCents: num(price.amount_cents),
      billingInterval: (['one_time', 'month', 'year'] as const).find((interval) => interval === price.billing_interval) ?? 'one_time',
      isDefault: bool(price.is_default),
      isTestPrice: bool(price.test_price),
    })),
  }));
}

export function createdOrderFromJson(value: unknown): CreatedOrder {
  const data = record(value);
  return {
    orderId: str(data.order_id),
    orderNumber: str(data.order_number),
    publicToken: str(data.public_token),
    currency: str(data.currency, 'TWD'),
    subtotalCents: num(data.subtotal_cents),
    totalCents: num(data.total_cents),
    paymentId: str(data.payment_id),
    paymentProvider: str(data.payment_provider),
    paymentEnvironment: str(data.payment_environment),
    merchantTradeNo: str(data.merchant_trade_no),
  };
}

export function receiptFromJson(value: unknown): OrderReceipt {
  const data = record(value);
  if (!bool(data.ok)) return { ...NOT_FOUND_RECEIPT };
  const payment = record(data.payment);
  return {
    found: true,
    orderNumber: str(data.order_number),
    status: str(data.status),
    currency: str(data.currency, 'TWD'),
    subtotalCents: num(data.subtotal_cents),
    totalCents: num(data.total_cents),
    buyerName: str(data.buyer_name),
    buyerEmail: str(data.buyer_email),
    createdAt: nullableStr(data.created_at),
    paidAt: nullableStr(data.paid_at),
    paymentStatus: str(payment.status),
    paymentProvider: str(payment.provider),
    paymentEnvironment: str(payment.environment),
    paymentFailureMessage: str(payment.failure_message),
    paymentId: nullableStr(payment.payment_id),
    items: list(data.items).map<ReceiptItem>((item) => ({
      productName: str(item.product_name),
      sku: str(item.sku),
      quantity: num(item.quantity),
      unitAmountCents: num(item.unit_amount_cents),
      lineTotalCents: num(item.line_total_cents),
      isTestPrice: bool(item.test_price),
    })),
    accessCodes: list(data.access_codes).map<ReceiptAccessCode>((code) => ({
      code: str(code.code),
      productCode: str(code.product_code),
      status: str(code.status),
      expiresAt: nullableStr(code.expires_at),
    })),
  };
}

export function paymentMethodsFromRows(rows: unknown): PaymentMethodOption[] {
  return list(rows).map<PaymentMethodOption>((row) => {
    const settings = record(row.public_settings);
    return {
      methodKey: str(row.method_key),
      provider: str(row.provider),
      methodType: str(row.method_type),
      displayName: str(row.display_name),
      description: str(row.description),
      isSimulation: bool(settings.is_simulation) || str(row.provider) === 'sandbox',
      sortOrder: num(row.sort_order),
    };
  });
}

// ---------------------------------------------------------------------------
// 買家資料驗證（後台 / 前台共用；資料庫端 create_order_from_cart 會再檢查一次）
// ---------------------------------------------------------------------------

export interface BuyerValidation {
  ok: boolean;
  errors: Record<string, string>;
}

export function validateBuyerInput(buyer: BuyerInput): BuyerValidation {
  const errors: Record<string, string> = {};
  const name = buyer.name.trim();
  const email = buyer.email.trim();
  if (!name) errors.name = '請填寫姓名';
  else if (name.length > 120) errors.name = '姓名請控制在 120 字以內';
  if (!email) errors.email = '請填寫 Email';
  else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) errors.email = 'Email 格式不正確';
  if (buyer.phone.trim() && buyer.phone.trim().length > 40) errors.phone = '電話請控制在 40 字以內';
  if (buyer.company.trim().length > 200) errors.company = '公司名稱請控制在 200 字以內';
  if (buyer.taxId.trim() && !/^[0-9]{8}$/.test(buyer.taxId.trim())) errors.tax_id = '統一編號為 8 位數字';
  if (buyer.note.trim().length > 1000) errors.note = '備註請控制在 1000 字以內';
  if (!buyer.consent) errors.consent = '請先閱讀並同意隱私權政策';
  return { ok: Object.keys(errors).length === 0, errors };
}

/** 傳給 create_order_from_cart 的 buyer payload（不含任何金額欄位） */
export function buyerToRpcPayload(buyer: BuyerInput): Record<string, unknown> {
  return {
    name: buyer.name.trim(),
    email: buyer.email.trim().toLowerCase(),
    phone: buyer.phone.trim() || null,
    company: buyer.company.trim() || null,
    tax_id: buyer.taxId.trim() || null,
    note: buyer.note.trim() || null,
    consent: buyer.consent === true,
  };
}
