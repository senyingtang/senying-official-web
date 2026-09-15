import { cartCountText, formatCartBadge } from './cart';
import { createCartCountStore } from './cart-store';

/** 使用者手動收合 / 展開的偏好（跨頁記憶） */
export const FLOATING_COLLAPSED_STORAGE_KEY = 'syt-floating-actions-collapsed';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

  // ---- 手機 bottom sheet ----
  const sheet = root.querySelector<HTMLElement>('[data-fa-sheet]');
  const panel = sheet?.querySelector<HTMLElement>('[role="dialog"]');
  const opener = root.querySelector<HTMLButtonElement>('[data-fa-sheet-open]');
  if (!sheet || !panel || !opener) return;
  let previousOverflow = '';

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSheet();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(visible);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  function openSheet() {
    if (!sheet || !panel || !opener) return;
    sheet.hidden = false;
    opener.setAttribute('aria-expanded', 'true');
    previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeydown);
    panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  }

  function closeSheet() {
    if (!sheet || !opener || sheet.hidden) return;
    sheet.hidden = true;
    opener.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = previousOverflow;
    document.removeEventListener('keydown', onKeydown);
    opener.focus();
  }

  opener.addEventListener('click', openSheet);
  for (const closer of sheet.querySelectorAll<HTMLElement>('[data-fa-sheet-close]')) closer.addEventListener('click', closeSheet);
  // 桌機寬度時自動關閉，避免放大視窗後留下 scroll lock
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) closeSheet();
  });
}
