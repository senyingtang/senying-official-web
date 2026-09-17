import { cartCountText, formatCartBadge } from './cart';
import { createCartCountStore } from './cart-store';
import { createSheet } from './sheet-controller';

/** 使用者手動收合 / 展開的偏好（跨頁記憶） */
export const FLOATING_COLLAPSED_STORAGE_KEY = 'syt-floating-actions-collapsed';

function readCollapsedPreference(): boolean | null {
  try {
    const value = window.localStorage.getItem(FLOATING_COLLAPSED_STORAGE_KEY);
    return value === 'true' ? true : value === 'false' ? false : null;
  } catch {
    return null;
  }
}

function writeCollapsedPreference(collapsed: boolean): void {
  try {
    window.localStorage.setItem(FLOATING_COLLAPSED_STORAGE_KEY, String(collapsed));
  } catch {
    // localStorage 不可用時只是不記憶偏好
  }
}

function visible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

/**
 * 浮動快捷列（桌機 rail + 手機 bottom sheet）的互動。
 * 只在瀏覽器執行；HTML 在 build 時已完整輸出，沒有 JS 時連結仍可使用。
 * Bottom sheet 的 ESC / backdrop / focus trap / scroll lock 由 lib/sheet-controller.ts 提供，
 * 與手機主選單（NavSheet）是同一套契約。
 */
export function initFloatingActions(): void {
  const root = document.querySelector<HTMLElement>('[data-floating-actions]');
  if (!root || root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  const brand = root.dataset.brandEn ?? '';
  const cartEnabled = root.dataset.cartEnabled === 'true';
  const badgeEnabled = root.dataset.cartBadgeEnabled === 'true';
  const toggles = [...root.querySelectorAll<HTMLButtonElement>('[data-fa-toggle]')];

  // ---- 桌機收合 / 展開 ----
  const setCollapsed = (collapsed: boolean, options: { persist: boolean; focus: boolean }) => {
    root.dataset.state = collapsed ? 'collapsed' : 'expanded';
    for (const toggle of toggles) toggle.setAttribute('aria-expanded', String(!collapsed));
    if (options.persist) writeCollapsedPreference(collapsed);
    if (options.focus) toggles.find((toggle) => visible(toggle))?.focus();
  };
  setCollapsed(readCollapsedPreference() ?? root.dataset.defaultCollapsed === 'true', { persist: false, focus: false });
  for (const toggle of toggles) {
    toggle.addEventListener('click', () => setCollapsed(root.dataset.state !== 'collapsed', { persist: true, focus: true }));
  }
  root.querySelector<HTMLElement>('[data-fa-expanded]')?.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setCollapsed(true, { persist: true, focus: true });
  });

  // ---- 購物車 badge ----
  const renderCart = (count: number) => {
    const badge = formatCartBadge(count);
    for (const element of root.querySelectorAll<HTMLElement>('[data-cart-badge]')) {
      element.textContent = badge;
      element.hidden = !badgeEnabled || badge === '';
    }
    for (const element of root.querySelectorAll<HTMLElement>('[data-cart-count-text]')) element.textContent = cartCountText(count);
    const cartText = count > 0 ? `，購物車 ${badge} 件` : '';
    for (const element of root.querySelectorAll<HTMLElement>('[data-cart-link]')) {
      element.setAttribute('aria-label', `${element.dataset.cartLabel ?? '購物車'}${count > 0 ? `，${badge} 件` : '，尚無商品'}`);
    }
    for (const element of root.querySelectorAll<HTMLElement>('[data-fa-compact]')) element.setAttribute('aria-label', `展開 ${brand} 快捷列${cartText}`);
    for (const element of root.querySelectorAll<HTMLElement>('[data-fa-sheet-open]')) element.setAttribute('aria-label', `聯絡 ${brand}${cartText}`);
  };
  if (cartEnabled) {
    const store = createCartCountStore();
    renderCart(store.getItemCount());
    store.subscribe?.(renderCart);
  }

  // ---- 手機 bottom sheet（共用契約）----
  const sheet = root.querySelector<HTMLElement>('[data-fa-sheet]');
  const panel = sheet?.querySelector<HTMLElement>('[role="dialog"]');
  const opener = root.querySelector<HTMLButtonElement>('[data-fa-sheet-open]');
  if (!sheet || !panel || !opener) return;
  createSheet({
    sheet,
    panel,
    triggers: [opener],
    closers: [...sheet.querySelectorAll<HTMLElement>('[data-fa-sheet-close]')],
  });
}
