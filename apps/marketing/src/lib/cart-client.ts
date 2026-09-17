import type { BuyerInput, CartState, CatalogProduct, CreatedOrder, OrderReceipt } from '@syt/database/commerce';
import { CART_TOKEN_STORAGE_KEY, EMPTY_CART, NOT_FOUND_RECEIPT, cartStateFromJson, createdOrderFromJson, receiptFromJson, buyerToRpcPayload } from '@syt/database/commerce';
import { dispatchCartUpdated } from './cart';

/**
 * 瀏覽器端購物車（Phase 3.0）。
 *
 * - 有設定 Supabase（PUBLIC_SUPABASE_URL / ANON_KEY）：所有操作都呼叫 SECURITY DEFINER RPC，
 *   金額與可購買性由資料庫判斷；瀏覽器只持有 cart token（資料庫存 sha256）
 * - 沒有設定（DATA_SOURCE=mock 的示範 build）：使用 localStorage 示範購物車，
 *   畫面會明確標示「示範購物車（未連線資料庫）」
 *
 * 這裡刻意不使用 @supabase/supabase-js：只需要一個 POST，避免把整包 SDK 放進官網 bundle。
 */

export interface CartClient {
  readonly isMock: boolean;
  getToken(): string;
  get(): Promise<CartState>;
  addItem(priceId: string, quantity: number): Promise<CartState>;
  setQuantity(itemId: string, quantity: number): Promise<CartState>;
  removeItem(itemId: string): Promise<CartState>;
  clear(): Promise<CartState>;
  createOrder(buyer: BuyerInput, paymentMethodKey: string): Promise<CreatedOrder>;
  getReceipt(publicToken: string): Promise<OrderReceipt>;
}

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export function isCommerceBackendConfigured(): boolean {
  return Boolean(SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim());
}

/** 隨機 cart token（只存在瀏覽器；資料庫保存 sha256） */
function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readCartToken(): string {
  try {
    const existing = window.localStorage.getItem(CART_TOKEN_STORAGE_KEY);
    if (existing && existing.length >= 32) return existing;
    const token = randomToken();
    window.localStorage.setItem(CART_TOKEN_STORAGE_KEY, token);
    return token;
  } catch {
    // 無痕模式：使用一次性 token（重新整理後購物車會是空的）
    return randomToken();
  }
}

export class CartRpcError extends Error {
  constructor(
    message: string,
    readonly code: string | null,
  ) {
    super(message);
    this.name = 'CartRpcError';
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>, parse: (value: unknown) => T): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${SUPABASE_ANON_KEY ?? ''}`,
    },
    body: JSON.stringify(args),
  });
  const text = await response.text();
  if (!response.ok) {
    let message = '購物車操作失敗，請稍後再試。';
    let code: string | null = null;
    try {
      const payload = JSON.parse(text) as { message?: string; code?: string };
      code = payload.code ?? null;
      if (payload.message) message = payload.message;
    } catch {
      // 保留預設訊息
    }
    throw new CartRpcError(message, code);
  }
  return parse(text ? (JSON.parse(text) as unknown) : null);
}

function supabaseCartClient(): CartClient {
  const token = readCartToken();
  const announce = (state: CartState): CartState => {
    dispatchCartUpdated(state.itemCount);
    return state;
  };
  return {
    isMock: false,
    getToken: () => token,
    get: async () => announce(await rpc('commerce_cart_get', { p_cart_token: token }, cartStateFromJson)),
    addItem: async (priceId, quantity) =>
      announce(await rpc('commerce_cart_add_item', { p_cart_token: token, p_price_id: priceId, p_quantity: quantity }, cartStateFromJson)),
    setQuantity: async (itemId, quantity) =>
      announce(await rpc('commerce_cart_set_quantity', { p_cart_token: token, p_item_id: itemId, p_quantity: quantity }, cartStateFromJson)),
    removeItem: async (itemId) => announce(await rpc('commerce_cart_set_quantity', { p_cart_token: token, p_item_id: itemId, p_quantity: 0 }, cartStateFromJson)),
    clear: async () => announce(await rpc('commerce_cart_clear', { p_cart_token: token }, cartStateFromJson)),
    createOrder: async (buyer, paymentMethodKey) =>
      rpc('create_order_from_cart', { p_cart_token: token, p_buyer: buyerToRpcPayload(buyer), p_payment_method_key: paymentMethodKey }, createdOrderFromJson),
    getReceipt: async (publicToken) => rpc('get_order_receipt', { p_public_token: publicToken }, receiptFromJson),
  };
}

// ---------------------------------------------------------------------------
// 示範購物車（沒有連線資料庫時）
// ---------------------------------------------------------------------------
const MOCK_ITEMS_KEY = 'syt-cart-mock-items';

function readMockItems(): { priceId: string; quantity: number }[] {
  try {
    const raw = window.localStorage.getItem(MOCK_ITEMS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is { priceId: string; quantity: number } => Boolean(item) && typeof item === 'object')
      .map((item) => ({ priceId: String(item.priceId ?? ''), quantity: Number(item.quantity ?? 0) }))
      .filter((item) => item.priceId !== '' && Number.isFinite(item.quantity) && item.quantity > 0);
  } catch {
    return [];
  }
}

function writeMockItems(items: { priceId: string; quantity: number }[]): void {
  try {
    window.localStorage.setItem(MOCK_ITEMS_KEY, JSON.stringify(items));
  } catch {
    // 忽略：示範模式不保證跨頁記憶
  }
}

function mockCartClient(catalog: CatalogProduct[]): CartClient {
  const find = (priceId: string) => {
    for (const product of catalog) {
      const price = product.prices.find((item) => item.priceId === priceId);
      if (price) return { product, price };
    }
    return null;
  };
  const build = (): CartState => {
    const items = readMockItems();
    const lines = items.flatMap((item) => {
      const found = find(item.priceId);
      if (!found) return [];
      return [
        {
          itemId: item.priceId,
          productId: found.product.productId,
          productSlug: found.product.slug,
          productName: found.product.name,
          productCode: found.product.productCode,
          sku: found.product.sku,
          priceId: found.price.priceId,
          priceKey: found.price.priceKey,
          priceName: found.price.name,
          billingInterval: found.price.billingInterval,
          currency: found.price.currency,
          unitAmountCents: found.price.amountCents,
          quantity: item.quantity,
          lineTotalCents: found.price.amountCents * item.quantity,
          isTestPrice: found.price.isTestPrice,
          isAvailable: true,
        },
      ];
    });
    const state: CartState = {
      cartId: 'mock-cart',
      status: 'open',
      currency: 'TWD',
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      lineCount: lines.length,
      subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
      hasTestPrice: lines.some((line) => line.isTestPrice),
      hasUnavailableItem: false,
      items: lines,
    };
    dispatchCartUpdated(state.itemCount);
    return state;
  };
  return {
    isMock: true,
    getToken: () => 'mock',
    get: async () => build(),
    addItem: async (priceId, quantity) => {
      if (!find(priceId)) throw new CartRpcError('找不到這個商品價格。', 'P0002');
      const items = readMockItems();
      const existing = items.find((item) => item.priceId === priceId);
      if (existing) existing.quantity = Math.min(existing.quantity + quantity, 100);
      else items.push({ priceId, quantity: Math.min(Math.max(quantity, 1), 100) });
      writeMockItems(items);
      return build();
    },
    setQuantity: async (itemId, quantity) => {
      const items = readMockItems().flatMap((item) => {
        if (item.priceId !== itemId) return [item];
        return quantity <= 0 ? [] : [{ ...item, quantity: Math.min(quantity, 100) }];
      });
      writeMockItems(items);
      return build();
    },
    removeItem: async (itemId) => {
      writeMockItems(readMockItems().filter((item) => item.priceId !== itemId));
      return build();
    },
    clear: async () => {
      writeMockItems([]);
      return build();
    },
    createOrder: async () => {
      throw new CartRpcError('示範模式沒有連線資料庫，無法建立訂單。請以 DATA_SOURCE=supabase 執行。', 'mock');
    },
    getReceipt: async () => ({ ...NOT_FOUND_RECEIPT }),
  };
}

/** 依環境建立購物車 client；catalog 只在示範模式使用 */
export function createCartClient(catalog: CatalogProduct[] = []): CartClient {
  return isCommerceBackendConfigured() ? supabaseCartClient() : mockCartClient(catalog);
}

export { EMPTY_CART };
