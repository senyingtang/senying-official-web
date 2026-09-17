import { CART_UPDATED_EVENT, normalizeCartCount, type CartUpdatedDetail } from './cart';
import { createCartClient, isCommerceBackendConfigured } from './cart-client';

/**
 * 購物車數量來源（Phase 3.0）。
 *
 * 權威來源是 CartRepository（Supabase RPC commerce_cart_get）：
 * localStorage 只是「先畫出上一次看到的數字」的 cache，載入後會立刻以伺服器回傳的數量覆寫。
 * 沒有連線資料庫的示範 build 沒有伺服器購物車，此時 cache 就是唯一來源。
 */
export interface CartCountStore {
  /** 立即可用的快取值（首次繪製用） */
  getItemCount(): number;
  subscribe?(callback: (count: number) => void): () => void;
}

export const CART_COUNT_STORAGE_KEY = 'syt-cart-count';

function readStorage(): number {
  try {
    return normalizeCartCount(window.localStorage.getItem(CART_COUNT_STORAGE_KEY));
  } catch {
    return 0;
  }
}

function writeStorage(count: number): void {
  try {
    if (count === 0) window.localStorage.removeItem(CART_COUNT_STORAGE_KEY);
    else window.localStorage.setItem(CART_COUNT_STORAGE_KEY, String(count));
  } catch {
    // 無痕模式或停用儲存空間：只影響跨頁記憶，不影響頁面運作
  }
}

export class CartCountStoreImpl implements CartCountStore {
  /** 快取值：只用於首次繪製，不是權威來源 */
  getItemCount(): number {
    if (typeof window === 'undefined') return 0;
    return readStorage();
  }

  subscribe(callback: (count: number) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onUpdated = (event: Event) => {
      const count = normalizeCartCount((event as CustomEvent<CartUpdatedDetail>).detail?.itemCount);
      writeStorage(count);
      callback(count);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_COUNT_STORAGE_KEY) callback(normalizeCartCount(event.newValue));
    };
    window.addEventListener(CART_UPDATED_EVENT, onUpdated);
    window.addEventListener('storage', onStorage);

    // 有後端時以伺服器購物車為準（cache 只是先畫出來的舊值）
    if (isCommerceBackendConfigured()) {
      void createCartClient()
        .get()
        .then((state) => {
          writeStorage(state.itemCount);
          callback(state.itemCount);
        })
        .catch(() => {
          // 讀取失敗時保留 cache，不清成 0
        });
    }

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }
}

export function createCartCountStore(): CartCountStore {
  return new CartCountStoreImpl();
}
