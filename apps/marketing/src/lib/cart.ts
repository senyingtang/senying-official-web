/**
 * 購物車數量的前台介面（Phase 2.6C）。
 * 完整購物車（商品、價格、結帳）尚未實作：這裡只定義 badge 需要的資料與事件，未來購物車更新時發出 syt:cart-updated。
 */
export type CartSummary = {
  itemCount: number;
  uniqueItemCount?: number;
};

export const CART_UPDATED_EVENT = 'syt:cart-updated';

export interface CartUpdatedDetail {
  itemCount: number;
}

/** 非數字、負數、小數一律整理成 0 以上的整數 */
export function normalizeCartCount(value: unknown): number {
  const count = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

/** Badge 文字：0 不顯示、1–99 顯示數字、100 以上顯示 99+ */
export function formatCartBadge(count: number): string {
  const value = normalizeCartCount(count);
  if (value === 0) return '';
  return value >= 100 ? '99+' : String(value);
}

export function cartCountText(count: number): string {
  const value = normalizeCartCount(count);
  return value === 0 ? '尚無商品' : `${value >= 100 ? '99+' : value} 件`;
}

/** 未來購物車流程更新數量時呼叫 */
export function dispatchCartUpdated(itemCount: number): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<CartUpdatedDetail>(CART_UPDATED_EVENT, { detail: { itemCount: normalizeCartCount(itemCount) } }));
}
