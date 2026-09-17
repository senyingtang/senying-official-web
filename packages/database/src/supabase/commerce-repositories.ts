import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AccessCodeStatus,
  BillingInterval,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  ProductCode,
  ProviderEnvironment,
  SubscriptionStatus,
} from '@syt/shared';
import { PRODUCT_CODES } from '@syt/shared';
import type { BuyerInput } from '../commerce';
import { buyerToRpcPayload, cartStateFromJson, catalogFromJson, createdOrderFromJson, paymentMethodsFromRows, receiptFromJson } from '../commerce';
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  OrderStatusCounts,
  OrderSummary,
  PaymentProviderCardConfig,
  PriceItem,
  ProductPlanItem,
  ProviderField,
  SubscriptionSummary,
} from '../models';
import type { CartRepository, CommerceCatalogRepository, CommerceRepository, OrderRepository, RepositoryContext } from '../repositories';
import { TABLES } from '../tables';
import { unwrap } from './errors';

/**
 * Supabase Commerce repository（Phase 3.0）。
 *
 * 前台（購物車 / 下單 / 收據）一律透過 SECURITY DEFINER RPC：
 * 瀏覽器沒有 cart / order 資料表的寫入權限，金額由 create_order_from_cart 在資料庫端重算。
 * 後台列表以「使用者 session」client 直接查詢，範圍由 RLS（owner / admin）決定。
 */

type Row = Record<string, unknown>;

const str = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);
const nullableStr = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const num = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
};
const rows = (data: unknown): Row[] => (Array.isArray(data) ? (data.filter((item) => item && typeof item === 'object') as Row[]) : []);
const embedded = (value: unknown): Row | null => {
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value && typeof value === 'object' ? (value as Row) : null;
};
const record = (value: unknown): Row => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {});
const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
const isUuid = (value: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'awaiting_payment', 'paid', 'fulfilled', 'cancelled', 'refunded', 'partially_refunded', 'failed'];
const PAYMENT_STATUSES: readonly PaymentStatus[] = ['pending', 'processing', 'awaiting_transfer', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded', 'partially_refunded'];
const PAYMENT_PROVIDERS: readonly PaymentProvider[] = ['ecpay', 'linepay', 'bank_transfer', 'manual', 'sandbox'];
const ENVIRONMENTS: readonly ProviderEnvironment[] = ['sandbox', 'production'];
const ACCESS_CODE_STATUSES: readonly AccessCodeStatus[] = ['generated', 'issued', 'redeemed', 'expired', 'revoked'];
const BILLING_INTERVALS: readonly BillingInterval[] = ['one_time', 'month', 'year'];

/** 權限代碼在後台只顯示前後段，中間遮罩（完整代碼只給已付款的客戶） */
export function maskAccessCode(code: string): string {
  const parts = code.split('-');
  if (parts.length < 4) return code.length <= 4 ? '••••' : `${code.slice(0, 2)}••••${code.slice(-2)}`;
  const last = parts[parts.length - 1] ?? '';
  return `${parts.slice(0, parts.length - 1).join('-')}-${last.slice(0, 1)}••••`;
}

const ORDER_LIST_SELECT =
  'id, order_number, buyer_name, buyer_email, status, currency, total_cents, created_at, paid_at, ' +
  'items:commerce_order_items(id), payments:commerce_payments(status, provider, environment, created_at), codes:access_codes(id)';

export function createSupabaseCommerceRepositories(
  client: SupabaseClient,
  context: RepositoryContext = {},
): { commerce: CommerceRepository; catalog: CommerceCatalogRepository; cart: CartRepository; orders: OrderRepository } {
  void context;

  const rpc = async <T>(operation: string, fn: string, args: Record<string, unknown>, parse: (value: unknown) => T): Promise<T> => {
    const result = await client.rpc(fn, args);
    return parse(unwrap(operation, result));
  };

  const catalog: CommerceCatalogRepository = {
    async listPurchasableProducts() {
      return rpc('catalog.listPurchasableProducts', 'get_purchasable_products', {}, catalogFromJson);
    },
    async listPaymentMethods() {
      const data = unwrap('catalog.listPaymentMethods', await client.rpc('get_enabled_payment_methods'));
      return paymentMethodsFromRows(data);
    },
  };

  const cart: CartRepository = {
    async get(token) {
      return rpc('cart.get', 'commerce_cart_get', { p_cart_token: token }, cartStateFromJson);
    },
    async addItem(token, priceId, quantity) {
      return rpc('cart.addItem', 'commerce_cart_add_item', { p_cart_token: token, p_price_id: priceId, p_quantity: quantity }, cartStateFromJson);
    },
    async setQuantity(token, itemId, quantity) {
      return rpc('cart.setQuantity', 'commerce_cart_set_quantity', { p_cart_token: token, p_item_id: itemId, p_quantity: quantity }, cartStateFromJson);
    },
    async removeItem(token, itemId) {
      return rpc('cart.removeItem', 'commerce_cart_set_quantity', { p_cart_token: token, p_item_id: itemId, p_quantity: 0 }, cartStateFromJson);
    },
    async clear(token) {
      return rpc('cart.clear', 'commerce_cart_clear', { p_cart_token: token }, cartStateFromJson);
    },
  };

  const orders: OrderRepository = {
    async createFromCart(token, buyer: BuyerInput, paymentMethodKey) {
      // 只傳聯絡資料與付款方式：金額由資料庫重算，client 無法指定
      return rpc(
        'orders.createFromCart',
        'create_order_from_cart',
        { p_cart_token: token, p_buyer: buyerToRpcPayload(buyer), p_payment_method_key: paymentMethodKey },
        createdOrderFromJson,
      );
    },
    async getReceipt(publicToken) {
      return rpc('orders.getReceipt', 'get_order_receipt', { p_public_token: publicToken }, receiptFromJson);
    },
  };

  const commerce: CommerceRepository = {
    async listProducts() {
      const data = unwrap(
        'commerce.listProducts',
        await client
          .from(TABLES.commerce.products)
          .select('id, product_code, name, status, is_self_serve, requires_quote, sort_order')
          .order('sort_order'),
      );
      return rows(data).map<ProductPlanItem>((row) => ({
        id: str(row.id),
        productCode: oneOf<ProductCode>(row.product_code, PRODUCT_CODES, 'CUSTOM'),
        name: str(row.name),
        status: row.status === 'published' ? 'published' : 'draft',
        isSelfServe: row.is_self_serve === true,
        requiresQuote: row.requires_quote === true,
      }));
    },

    async listPrices() {
      const data = unwrap(
        'commerce.listPrices',
        await client
          .from(TABLES.commerce.prices)
          .select('id, price_key, billing_interval, amount_cents, is_active, metadata, product:commerce_products(name, sort_order)')
          .order('price_key'),
      );
      return rows(data).map<PriceItem>((row) => ({
        id: str(row.id),
        productName: str(embedded(row.product)?.name, '—'),
        priceKey: str(row.price_key),
        interval: oneOf<BillingInterval>(row.billing_interval, BILLING_INTERVALS, 'one_time'),
        amountCents: num(row.amount_cents),
        isActive: row.is_active === true,
      }));
    },

    async listOrders(options) {
      const data = unwrap(
        'commerce.listOrders',
        await client
          .from(TABLES.commerce.orders)
          .select('id, order_number, buyer_email, total_cents, status, created_at')
          .order('created_at', { ascending: false })
          .limit(options?.limit ?? 20),
      );
      return rows(data).map<OrderSummary>((row) => ({
        id: str(row.id),
        orderNumber: str(row.order_number),
        buyerEmail: str(row.buyer_email),
        totalCents: num(row.total_cents),
        status: oneOf<OrderStatus>(row.status, ORDER_STATUSES, 'pending'),
        createdAt: str(row.created_at),
      }));
    },

    async listAdminOrders(options) {
      let query = client.from(TABLES.commerce.orders).select(ORDER_LIST_SELECT).order('created_at', { ascending: false }).limit(options?.limit ?? 100);
      if (options?.status && options.status !== 'all') query = query.eq('status', options.status);
      const data = unwrap('commerce.listAdminOrders', await query);
      return rows(data).map<AdminOrderListItem>((row) => {
        const payments = rows(row.payments).sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)));
        const latest = payments[0];
        return {
          id: str(row.id),
          orderNumber: str(row.order_number),
          buyerName: str(row.buyer_name),
          buyerEmail: str(row.buyer_email),
          status: oneOf<OrderStatus>(row.status, ORDER_STATUSES, 'pending'),
          currency: str(row.currency, 'TWD'),
          totalCents: num(row.total_cents),
          itemCount: rows(row.items).length,
          paymentStatus: latest ? oneOf<PaymentStatus>(latest.status, PAYMENT_STATUSES, 'pending') : null,
          paymentProvider: latest ? oneOf<PaymentProvider>(latest.provider, PAYMENT_PROVIDERS, 'manual') : null,
          paymentEnvironment: latest ? oneOf<ProviderEnvironment>(latest.environment, ENVIRONMENTS, 'sandbox') : null,
          accessCodeCount: rows(row.codes).length,
          createdAt: str(row.created_at),
          paidAt: nullableStr(row.paid_at),
        };
      });
    },

    async getAdminOrder(orderId) {
      if (!isUuid(orderId)) return null;
      const data = unwrap(
        'commerce.getAdminOrder',
        await client
          .from(TABLES.commerce.orders)
          .select(
            'id, order_number, status, source, currency, subtotal_cents, discount_cents, tax_cents, total_cents, ' +
              'buyer_name, buyer_email, buyer_phone, buyer_company, buyer_tax_id, admin_note, created_at, paid_at, fulfilled_at, entitlements_issued_at, ' +
              'items:commerce_order_items(id, product_name, sku, quantity, unit_amount_cents, total_cents, metadata, created_at), ' +
              'payments:commerce_payments(id, provider, method_type, environment, status, amount_cents, currency, merchant_trade_no, provider_trade_no, failure_message, created_at, paid_at), ' +
              'codes:access_codes(id, code, product_code, status, issued_to_email, expires_at, created_at)',
          )
          .eq('id', orderId)
          .maybeSingle(),
      );
      const row = embedded(data);
      if (!row) return null;

      // audit trail：與這張訂單有關的紀錄（不含任何密鑰或完整代碼）
      const auditData = await client
        .from(TABLES.cms.auditLogs)
        .select('id, action, actor_type, created_at, metadata')
        .eq('entity_id', orderId)
        .order('created_at', { ascending: false })
        .limit(30);

      return {
        id: str(row.id),
        orderNumber: str(row.order_number),
        status: oneOf<OrderStatus>(row.status, ORDER_STATUSES, 'pending'),
        source: str(row.source, 'checkout'),
        currency: str(row.currency, 'TWD'),
        subtotalCents: num(row.subtotal_cents),
        discountCents: num(row.discount_cents),
        taxCents: num(row.tax_cents),
        totalCents: num(row.total_cents),
        buyerName: str(row.buyer_name),
        buyerEmail: str(row.buyer_email),
        buyerPhone: nullableStr(row.buyer_phone),
        buyerCompany: nullableStr(row.buyer_company),
        buyerTaxId: nullableStr(row.buyer_tax_id),
        adminNote: nullableStr(row.admin_note),
        createdAt: str(row.created_at),
        paidAt: nullableStr(row.paid_at),
        fulfilledAt: nullableStr(row.fulfilled_at),
        entitlementsIssuedAt: nullableStr(row.entitlements_issued_at),
        items: rows(row.items)
          .sort((a, b) => str(a.created_at).localeCompare(str(b.created_at)))
          .map((item) => ({
            id: str(item.id),
            productName: str(item.product_name),
            sku: str(item.sku),
            quantity: num(item.quantity),
            unitAmountCents: num(item.unit_amount_cents),
            totalCents: num(item.total_cents),
            isTestPrice: record(item.metadata).test_price === true,
          })),
        payments: rows(row.payments)
          .sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)))
          .map((payment) => ({
            id: str(payment.id),
            provider: oneOf<PaymentProvider>(payment.provider, PAYMENT_PROVIDERS, 'manual'),
            methodType: str(payment.method_type),
            environment: oneOf<ProviderEnvironment>(payment.environment, ENVIRONMENTS, 'sandbox'),
            status: oneOf<PaymentStatus>(payment.status, PAYMENT_STATUSES, 'pending'),
            amountCents: num(payment.amount_cents),
            currency: str(payment.currency, 'TWD'),
            merchantTradeNo: nullableStr(payment.merchant_trade_no),
            providerTradeNo: nullableStr(payment.provider_trade_no),
            failureMessage: nullableStr(payment.failure_message),
            createdAt: str(payment.created_at),
            paidAt: nullableStr(payment.paid_at),
          })),
        entitlements: rows(row.codes)
          .sort((a, b) => str(a.created_at).localeCompare(str(b.created_at)))
          .map((code) => ({
            id: str(code.id),
            maskedCode: maskAccessCode(str(code.code)),
            productCode: oneOf<ProductCode>(code.product_code, PRODUCT_CODES, 'CUSTOM'),
            status: oneOf<AccessCodeStatus>(code.status, ACCESS_CODE_STATUSES, 'generated'),
            issuedToEmail: nullableStr(code.issued_to_email),
            expiresAt: nullableStr(code.expires_at),
          })),
        auditTrail: rows(auditData.data).map((log) => ({
          id: String(log.id),
          action: str(log.action),
          actorType: str(log.actor_type, 'system'),
          createdAt: str(log.created_at),
          summary: JSON.stringify(record(log.metadata)).slice(0, 200),
        })),
      } satisfies AdminOrderDetail;
    },

    async getOrderStatusCounts() {
      const data = unwrap('commerce.getOrderStatusCounts', await client.from(TABLES.commerce.orders).select('status, total_cents'));
      const list = rows(data);
      const paid = list.filter((row) => row.status === 'paid' || row.status === 'fulfilled');
      return {
        total: list.length,
        paid: paid.length,
        awaitingPayment: list.filter((row) => row.status === 'pending' || row.status === 'awaiting_payment').length,
        failed: list.filter((row) => row.status === 'failed').length,
        grossPaidCents: paid.reduce((sum, row) => sum + num(row.total_cents), 0),
      } satisfies OrderStatusCounts;
    },

    async listSubscriptions(options) {
      const data = unwrap(
        'commerce.listSubscriptions',
        await client
          .from(TABLES.subscription.customerSubscriptions)
          .select('id, status, billing_interval, current_period_end, plan:subscription_plans(name)')
          .order('created_at', { ascending: false })
          .limit(options?.limit ?? 50),
      );
      return rows(data).map<SubscriptionSummary>((row) => ({
        id: str(row.id),
        planName: str(embedded(row.plan)?.name, '—'),
        customerEmail: '—', // customer email 屬個資：訂閱列表只顯示方案與狀態
        interval: oneOf<BillingInterval>(row.billing_interval, BILLING_INTERVALS, 'month'),
        status: oneOf<SubscriptionStatus>(row.status, ['incomplete', 'trialing', 'active', 'past_due', 'cancel_scheduled', 'cancelled', 'expired'], 'incomplete'),
        currentPeriodEnd: nullableStr(row.current_period_end),
      }));
    },

    async listPaymentProviderCards() {
      const [configData, methodData] = await Promise.all([
        client
          .from(TABLES.commerce.providerConfigs)
          .select('id, provider, environment, is_enabled, display_name, merchant_id, api_base_url, public_config, secret_refs, config_schema, notes')
          .order('provider'),
        client.from(TABLES.commerce.paymentMethods).select('method_key, provider, display_name, is_enabled, provider_config_id').order('sort_order'),
      ]);
      const configs = rows(unwrap('commerce.listPaymentProviderCards', configData));
      const methods = rows(methodData.data);

      return configs.map<PaymentProviderCardConfig>((config) => {
        const provider = oneOf<PaymentProvider>(config.provider, PAYMENT_PROVIDERS, 'manual');
        const environment = oneOf<ProviderEnvironment>(config.environment, ENVIRONMENTS, 'sandbox');
        const schema = rows(config.config_schema);
        const related = methods.filter((method) => method.provider === provider && (method.provider_config_id === null || method.provider_config_id === config.id));
        return {
          key: `${provider}-${environment}`,
          provider,
          title: str(config.display_name, provider),
          // secret_refs 只回傳「參照名稱」（vault: / env:），永遠不是密鑰本身
          description: `${str(config.notes) || (provider === 'sandbox' ? '本機模擬付款，不會真的扣款。' : '金流設定')}｜密鑰參照：${Object.values(record(config.secret_refs)).join(', ') || '（無）'}`,
          isEnabled: config.is_enabled === true,
          environment,
          supportsEnvironment: provider !== 'bank_transfer' && provider !== 'sandbox',
          methods: related.map((method) => `${str(method.display_name)}${method.is_enabled === true ? '' : '（未啟用）'}`),
          fields: schema.map<ProviderField>((field) => ({
            key: str(field.key),
            label: str(field.label),
            type: oneOf<ProviderField['type']>(field.type, ['text', 'secret_ref', 'path', 'number', 'boolean'], 'text'),
            required: field.required === true,
            help: field.is_sensitive === true ? '只填參照名稱（vault: / env:），實際密鑰存在 Vault / Edge Function Secrets' : undefined,
          })),
        };
      });
    },
  };

  return { commerce, catalog, cart, orders };
}
