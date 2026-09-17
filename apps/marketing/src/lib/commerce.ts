import type { CatalogProduct, PaymentMethodOption } from '@syt/database/commerce';
import { resolveDataSourceConfig } from '@syt/database/data-source';

/**
 * 官網商店資料（build 時取得，同一次 build 只讀一次）。
 *
 * - DATA_SOURCE=mock（預設）：packages/database 的 mock 目錄
 * - DATA_SOURCE=supabase：以 anon key 呼叫 get_purchasable_products() / get_enabled_payment_methods()
 *
 * 價格永遠來自資料庫；官網原始碼不寫死任何售價。
 * 目前開放的價格都標記為「測試價格（非正式售價）」，畫面上必須一併顯示提示。
 */

export interface StorefrontData {
  products: CatalogProduct[];
  paymentMethods: PaymentMethodOption[];
  /** true：至少有一個可自助購買的商品，前台才顯示加入購物車 */
  checkoutAvailable: boolean;
  /** true：目錄中含測試價格，畫面必須顯示「非正式售價」 */
  hasTestPrice: boolean;
}

let pending: Promise<StorefrontData> | undefined;

export function getStorefront(): Promise<StorefrontData> {
  pending ??= load();
  return pending;
}

async function load(): Promise<StorefrontData> {
  const config = resolveDataSourceConfig({
    DATA_SOURCE: import.meta.env.DATA_SOURCE,
    PUBLIC_SUPABASE_URL: import.meta.env.PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  });

  if (config.kind === 'mock') {
    const { createMockRepositories } = await import('@syt/database');
    const repos = createMockRepositories();
    return finalize(await repos.catalog.listPurchasableProducts(), await repos.catalog.listPaymentMethods());
  }

  const { createPublicCommerceReaders } = await import('@syt/database/public-commerce');
  const readers = createPublicCommerceReaders(config);
  return finalize(await readers.catalog.listPurchasableProducts(), await readers.catalog.listPaymentMethods());
}

function finalize(products: CatalogProduct[], paymentMethods: PaymentMethodOption[]): StorefrontData {
  return {
    products,
    paymentMethods,
    checkoutAvailable: products.length > 0 && paymentMethods.length > 0,
    hasTestPrice: products.some((product) => product.prices.some((price) => price.isTestPrice)),
  };
}

/** 官網產品頁 slug → commerce 商品 sku（只有可自助購買的商品有對應） */
export const PRODUCT_SLUG_TO_SKU: Record<string, string> = {
  'seo-website': 'seo-website-plan',
  'landing-page': 'landing-page-plan',
};

export function findProductBySku(products: CatalogProduct[], sku: string): CatalogProduct | null {
  return products.find((product) => product.sku === sku) ?? null;
}

/** 產品頁要用的購買資訊；沒有可售價格時回傳 null（頁面改顯示「詢問報價」） */
export function purchaseOptionFor(storefront: StorefrontData, productSlug: string): { product: CatalogProduct; priceId: string; amountCents: number; currency: string; isTestPrice: boolean } | null {
  const sku = PRODUCT_SLUG_TO_SKU[productSlug];
  if (!sku) return null;
  const product = findProductBySku(storefront.products, sku);
  const price = product?.prices.find((item) => item.isDefault) ?? product?.prices[0];
  if (!product || !price) return null;
  return { product, priceId: price.priceId, amountCents: price.amountCents, currency: price.currency, isTestPrice: price.isTestPrice };
}
