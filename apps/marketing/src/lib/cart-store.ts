import { CART_UPDATED_EVENT, normalizeCartCount, type CartUpdatedDetail } from './cart';

/**
 * 購物車數量來源的擴充點。
 * 目前只有 BrowserLocalCartCountStore：它是「badge 的 UI bridge」，不是購物車後端，也不保存商品資料。
 * 未來 Supabase / Commerce Cart 上線時，改成讀取正式購物車的 adapter，FloatingActions 不需要修改。
 */
export interface CartCountStore {
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

export class BrowserLocalCartCountStore implements CartCountStore {
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
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, onUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }
}

export function createCartCountStore(): CartCountStore {
  return new BrowserLocalCartCountStore();
}
