/**
 * Bottom Sheet 共用行為（Global Shell）。
 *
 * 全站所有 sheet（手機主選單、浮動快捷列聯絡選單）都用這一支，確保同一套契約：
 *   - ESC 關閉
 *   - backdrop 點擊關閉
 *   - 可見的「關閉」按鈕關閉
 *   - focus trap（Tab / Shift+Tab 在 panel 內循環）
 *   - focus restore（關閉後焦點回到觸發按鈕）
 *   - body scroll lock（多個 sheet 共用計數，不會互相解鎖）
 *   - 觸發按鈕 aria-expanded 同步
 *   - 放大到桌機寬度時自動關閉，避免留下 scroll lock
 *
 * selector 契約（避免 Playwright strict mode 衝突）：
 *   - backdrop 使用 <div data-*-close>（不是 button）
 *   - 可見關閉鍵是唯一的 <button data-*-close>
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** 多個 sheet 共用的捲動鎖：以計數避免其中一個關閉時提前解鎖 */
let scrollLocks = 0;
let savedOverflow = '';

function lockScroll(): void {
  if (scrollLocks === 0) {
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockScroll(): void {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.documentElement.style.overflow = savedOverflow;
}

function isVisible(element: HTMLElement): boolean {
  return element.getClientRects().length > 0;
}

export interface SheetOptions {
  /** 外層容器（帶 hidden 屬性），內含 backdrop 與 panel */
  sheet: HTMLElement;
  /** role="dialog" 的面板 */
  panel: HTMLElement;
  /** 開啟按鈕（可以有多個，例如 Header 漢堡與 Bottom Nav 的「更多」） */
  triggers: HTMLElement[];
  /** 關閉目標（backdrop + 可見關閉鍵） */
  closers: HTMLElement[];
}

export interface SheetController {
  open(): void;
  close(): void;
  isOpen(): boolean;
}

export function createSheet({ sheet, panel, triggers, closers }: SheetOptions): SheetController {
  let lastFocused: HTMLElement | null = null;
  let open = false;

  const focusables = () => [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(isVisible);

  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    // 焦點若跑到 panel 外（例如瀏覽器 UI 回來），拉回第一個
    if (!panel.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  function openSheet(): void {
    if (open) return;
    open = true;
    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheet.hidden = false;
    for (const trigger of triggers) trigger.setAttribute('aria-expanded', 'true');
    lockScroll();
    document.addEventListener('keydown', onKeydown);
    focusables()[0]?.focus();
  }

  function close(): void {
    if (!open) return;
    open = false;
    sheet.hidden = true;
    for (const trigger of triggers) trigger.setAttribute('aria-expanded', 'false');
    unlockScroll();
    document.removeEventListener('keydown', onKeydown);
    // focus restore：優先回到原本的觸發按鈕，否則回到第一個仍可見的觸發按鈕
    const target = lastFocused && isVisible(lastFocused) ? lastFocused : triggers.find(isVisible);
    target?.focus();
  }

  for (const trigger of triggers) {
    trigger.addEventListener('click', () => (open ? close() : openSheet()));
  }
  for (const closer of closers) {
    closer.addEventListener('click', close);
  }
  // 放大到桌機寬度時自動關閉（sheet 本身是 lg:hidden，留著會鎖住捲動）
  window.matchMedia('(min-width: 1024px)').addEventListener('change', (event) => {
    if (event.matches) close();
  });

  return { open: openSheet, close, isOpen: () => open };
}
