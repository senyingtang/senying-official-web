/**
 * 結帳收據 token 的瀏覽器儲存位置。
 *
 * 下單時 create_order_from_cart 只回傳一次明文 token（資料庫存 sha256）。
 * 我們把它放在 sessionStorage，而不是放進網址：
 * 付款流程會跨到後台網域，網址會出現在 referrer 與伺服器日誌中。
 * 直接分享的收據連結（?token=）仍然可用，成功頁兩種都支援。
 */
export const CHECKOUT_TOKEN_STORAGE_KEY = 'syt-checkout-token';

export function readCheckoutToken(): string {
  const fromQuery = new URLSearchParams(window.location.search).get('token');
  if (fromQuery && fromQuery.length >= 32) return fromQuery;
  try {
    return window.sessionStorage.getItem(CHECKOUT_TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function clearCheckoutToken(): void {
  try {
    window.sessionStorage.removeItem(CHECKOUT_TOKEN_STORAGE_KEY);
  } catch {
    // sessionStorage 不可用時不需要處理
  }
}
