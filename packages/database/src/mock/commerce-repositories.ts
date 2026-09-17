import type { BuyerInput, CartLine, CartState, CatalogProduct, CreatedOrder, OrderReceipt, PaymentMethodOption } from '../commerce';
import { EMPTY_CART, NOT_FOUND_RECEIPT } from '../commerce';
import type { AdminOrderDetail, AdminOrderListItem, OrderStatusCounts } from '../models';
import type { CartRepository, CommerceCatalogRepository, CommerceRepository, ListOptions, OrderRepository, RepositoryContext } from '../repositories';
import { mockOrders, mockPaymentProviderCards, mockPrices, mockProducts, mockSubscriptions } from './data';

/**
 * Mock Commerce repository（DATA_SOURCE=mock）。
 *
 * 用途：沒有資料庫時也能看到完整的購物車 / 結帳 / 訂單畫面。
 * 所有寫入只改記憶體，重新啟動即還原；金額仍然由「伺服器端」（這裡是 repository 本身）從目錄重算，
 * 呼叫端傳來的任何金額都不會被採用，行為與 Supabase 模式一致。
 */

const clone = <T>(value: T): T => structuredClone(value);

/** 與 0018 seed 相同的測試價格（非正式售價） */
export const MOCK_CATALOG: CatalogProduct[] = [
  {
    productId: 'mock-product-seo',
    sku: 'seo-website-plan',
    slug: 'seo-website-plan',
    name: 'SEO 形象官網方案',
    productCode: 'SEO',
    shortDescription: '模板制 SEO 形象官網，購買後取得權限代碼建立 1 個網站',
    prices: [
      {
        priceId: 'mock-price-seo-one-time',
        priceKey: 'seo_website_one_time',
        name: '測試價格（非正式售價）',
        currency: 'TWD',
        amountCents: 100000,
        billingInterval: 'one_time',
        isDefault: true,
        isTestPrice: true,
      },
    ],
  },
  {
    productId: 'mock-product-lp',
    sku: 'landing-page-plan',
    slug: 'landing-page-plan',
    name: '一頁式網頁方案',
    productCode: 'LP',
    shortDescription: '模板制一頁式網頁，購買後取得權限代碼建立 1 個網站',
    prices: [
      {
        priceId: 'mock-price-lp-one-time',
        priceKey: 'landing_page_one_time',
        name: '測試價格（非正式售價）',
        currency: 'TWD',
        amountCents: 50000,
        billingInterval: 'one_time',
        isDefault: true,
        isTestPrice: true,
      },
    ],
  },
];

export const MOCK_PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    methodKey: 'sandbox_checkout',
    provider: 'sandbox',
    methodType: 'sandbox',
    displayName: '本機 Sandbox 付款（模擬）',
    description: '本機驗收用的模擬付款：不會向任何金流機構請款，也不會真的扣款。',
    isSimulation: true,
    sortOrder: 5,
  },
];

interface MockCartRow {
  token: string;
  items: { itemId: string; priceId: string; quantity: number }[];
}

interface MockOrderRow {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  buyer: BuyerInput;
  status: 'awaiting_payment' | 'paid' | 'fulfilled' | 'failed';
  paymentStatus: 'pending' | 'succeeded' | 'failed';
  paymentId: string;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  createdAt: string;
  paidAt: string | null;
  items: { productName: string; sku: string; quantity: number; unitAmountCents: number; lineTotalCents: number; isTestPrice: boolean }[];
}

const carts = new Map<string, MockCartRow>();
const orders: MockOrderRow[] = [];
let orderSeq = 0;

const findPrice = (priceId: string) => {
  for (const product of MOCK_CATALOG) {
    const price = product.prices.find((item) => item.priceId === priceId);
    if (price) return { product, price };
  }
  return null;
};

function stateOf(cart: MockCartRow | undefined): CartState {
  if (!cart) return clone(EMPTY_CART);
  const lines: CartLine[] = [];
  for (const item of cart.items) {
    const found = findPrice(item.priceId);
    if (!found) continue;
    lines.push({
      itemId: item.itemId,
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
    });
  }
  return {
    cartId: `mock-cart-${cart.token.slice(0, 8)}`,
    status: 'open',
    currency: 'TWD',
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    lineCount: lines.length,
    subtotalCents: lines.reduce((sum, line) => sum + line.lineTotalCents, 0),
    hasTestPrice: lines.some((line) => line.isTestPrice),
    hasUnavailableItem: false,
    items: lines,
  };
}

const requireToken = (token: string | null): string => {
  if (!token || token.trim().length < 20) throw new Error('cart token is required');
  return token.trim();
};

export function createMockCommerceRepositories(
  context: RepositoryContext = {},
): { commerce: CommerceRepository; catalog: CommerceCatalogRepository; cart: CartRepository; orders: OrderRepository } {
  void context;

  const catalog: CommerceCatalogRepository = {
    listPurchasableProducts: async () => clone(MOCK_CATALOG),
    listPaymentMethods: async () => clone(MOCK_PAYMENT_METHODS),
  };

  const cartRepo: CartRepository = {
    async get(token) {
      if (!token) return clone(EMPTY_CART);
      return stateOf(carts.get(token.trim()));
    },
    async addItem(token, priceId, quantity) {
      const key = requireToken(token);
      const found = findPrice(priceId);
      if (!found) throw new Error('price not found');
      if (quantity < 1 || quantity > 100) throw new Error('quantity must be between 1 and 100');
      const cart = carts.get(key) ?? { token: key, items: [] };
      const existing = cart.items.find((item) => item.priceId === priceId);
      if (existing) existing.quantity = Math.min(existing.quantity + quantity, 100);
      else cart.items.push({ itemId: `mock-item-${priceId}`, priceId, quantity });
      carts.set(key, cart);
      return stateOf(cart);
    },
    async setQuantity(token, itemId, quantity) {
      const key = requireToken(token);
      const cart = carts.get(key);
      if (!cart) throw new Error('cart not found');
      if (quantity <= 0) cart.items = cart.items.filter((item) => item.itemId !== itemId);
      else {
        const item = cart.items.find((entry) => entry.itemId === itemId);
        if (item) item.quantity = Math.min(quantity, 100);
      }
      carts.set(key, cart);
      return stateOf(cart);
    },
    async removeItem(token, itemId) {
      return cartRepo.setQuantity(token, itemId, 0);
    },
    async clear(token) {
      const key = requireToken(token);
      const cart = carts.get(key);
      if (cart) cart.items = [];
      return stateOf(cart);
    },
  };

  const orderRepo: OrderRepository = {
    async createFromCart(token, buyer, paymentMethodKey) {
      const key = requireToken(token);
      const cart = carts.get(key);
      const state = stateOf(cart);
      if (state.lineCount === 0) throw new Error('cart is empty');
      if (!buyer.consent) throw new Error('privacy consent is required');
      if (!MOCK_PAYMENT_METHODS.some((method) => method.methodKey === paymentMethodKey)) throw new Error('payment method is not available');

      orderSeq += 1;
      const now = new Date().toISOString();
      const row: MockOrderRow = {
        orderId: `mock-order-${orderSeq}`,
        orderNumber: `ORD-MOCK-${String(orderSeq).padStart(6, '0')}`,
        publicToken: `mocktoken${orderSeq}`.padEnd(64, '0'),
        buyer: { ...buyer },
        status: 'awaiting_payment',
        paymentStatus: 'pending',
        paymentId: `mock-payment-${orderSeq}`,
        currency: state.currency,
        // 金額由目錄重算，不使用呼叫端傳來的任何數字
        subtotalCents: state.subtotalCents,
        totalCents: state.subtotalCents,
        createdAt: now,
        paidAt: null,
        items: state.items.map((line) => ({
          productName: line.productName,
          sku: line.sku,
          quantity: line.quantity,
          unitAmountCents: line.unitAmountCents,
          lineTotalCents: line.lineTotalCents,
          isTestPrice: line.isTestPrice,
        })),
      };
      orders.unshift(row);
      if (cart) cart.items = [];
      return {
        orderId: row.orderId,
        orderNumber: row.orderNumber,
        publicToken: row.publicToken,
        currency: row.currency,
        subtotalCents: row.subtotalCents,
        totalCents: row.totalCents,
        paymentId: row.paymentId,
        paymentProvider: 'sandbox',
        paymentEnvironment: 'sandbox',
        merchantTradeNo: `SBMOCK${String(orderSeq).padStart(6, '0')}`,
      } satisfies CreatedOrder;
    },
    async getReceipt(publicToken) {
      const row = orders.find((order) => order.publicToken === publicToken);
      if (!row) return clone(NOT_FOUND_RECEIPT);
      return {
        found: true,
        orderNumber: row.orderNumber,
        status: row.status,
        currency: row.currency,
        subtotalCents: row.subtotalCents,
        totalCents: row.totalCents,
        buyerName: row.buyer.name,
        buyerEmail: row.buyer.email,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        paymentStatus: row.paymentStatus,
        paymentProvider: 'sandbox',
        paymentEnvironment: 'sandbox',
        paymentFailureMessage: '',
        paymentId: row.paymentId,
        items: clone(row.items),
        // mock 模式不發放真實權限代碼
        accessCodes: [],
      } satisfies OrderReceipt;
    },
  };

  const commerce: CommerceRepository = {
    listProducts: async () => clone(mockProducts),
    listPrices: async () => clone(mockPrices),
    listOrders: async () => clone(mockOrders),
    listSubscriptions: async () => clone(mockSubscriptions),
    listPaymentProviderCards: async () => clone(mockPaymentProviderCards),
    async listAdminOrders(options?: ListOptions) {
      const live = orders.map<AdminOrderListItem>((row) => ({
        id: row.orderId,
        orderNumber: row.orderNumber,
        buyerName: row.buyer.name,
        buyerEmail: row.buyer.email,
        status: row.status,
        currency: row.currency,
        totalCents: row.totalCents,
        itemCount: row.items.length,
        paymentStatus: row.paymentStatus,
        paymentProvider: 'sandbox',
        paymentEnvironment: 'sandbox',
        accessCodeCount: 0,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
      }));
      const seeded = mockOrders.map<AdminOrderListItem>((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        buyerName: '示範買家',
        buyerEmail: order.buyerEmail,
        status: order.status,
        currency: 'TWD',
        totalCents: order.totalCents,
        itemCount: 1,
        paymentStatus: order.status === 'paid' || order.status === 'fulfilled' ? 'succeeded' : 'pending',
        paymentProvider: 'manual',
        paymentEnvironment: 'sandbox',
        accessCodeCount: 0,
        createdAt: order.createdAt,
        paidAt: null,
      }));
      const all = [...live, ...seeded];
      const filtered = options?.status && options.status !== 'all' ? all.filter((order) => order.status === options.status) : all;
      return clone(filtered.slice(0, options?.limit ?? filtered.length));
    },
    async getAdminOrder(orderId) {
      const row = orders.find((order) => order.orderId === orderId);
      if (!row) return null;
      return {
        id: row.orderId,
        orderNumber: row.orderNumber,
        status: row.status,
        source: 'checkout',
        currency: row.currency,
        subtotalCents: row.subtotalCents,
        discountCents: 0,
        taxCents: 0,
        totalCents: row.totalCents,
        buyerName: row.buyer.name,
        buyerEmail: row.buyer.email,
        buyerPhone: row.buyer.phone || null,
        buyerCompany: row.buyer.company || null,
        buyerTaxId: row.buyer.taxId || null,
        adminNote: row.buyer.note || null,
        createdAt: row.createdAt,
        paidAt: row.paidAt,
        fulfilledAt: null,
        entitlementsIssuedAt: null,
        items: row.items.map((item, index) => ({
          id: `${row.orderId}-item-${index}`,
          productName: item.productName,
          sku: item.sku,
          quantity: item.quantity,
          unitAmountCents: item.unitAmountCents,
          totalCents: item.lineTotalCents,
          isTestPrice: item.isTestPrice,
        })),
        payments: [
          {
            id: row.paymentId,
            provider: 'sandbox',
            methodType: 'sandbox',
            environment: 'sandbox',
            status: row.paymentStatus,
            amountCents: row.totalCents,
            currency: row.currency,
            merchantTradeNo: null,
            providerTradeNo: null,
            failureMessage: null,
            createdAt: row.createdAt,
            paidAt: row.paidAt,
          },
        ],
        entitlements: [],
        auditTrail: [{ id: `${row.orderId}-audit`, action: 'commerce.order.created', actorType: 'system', createdAt: row.createdAt, summary: 'mock 模式：不寫入 audit_logs' }],
      } satisfies AdminOrderDetail;
    },
    async getOrderStatusCounts() {
      const all = [...orders.map((row) => ({ status: row.status, totalCents: row.totalCents })), ...mockOrders.map((order) => ({ status: order.status, totalCents: order.totalCents }))];
      const paid = all.filter((order) => order.status === 'paid' || order.status === 'fulfilled');
      return {
        total: all.length,
        paid: paid.length,
        awaitingPayment: all.filter((order) => order.status === 'pending' || order.status === 'awaiting_payment').length,
        failed: all.filter((order) => order.status === 'failed').length,
        grossPaidCents: paid.reduce((sum, order) => sum + order.totalCents, 0),
      } satisfies OrderStatusCounts;
    },
  };

  return { commerce, catalog, cart: cartRepo, orders: orderRepo };
}

/** 驗收用：清空 mock 購物車與訂單 */
export function resetMockCommerceState(): void {
  carts.clear();
  orders.length = 0;
  orderSeq = 0;
}
