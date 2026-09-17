/** 捲動超過這個距離才顯示「回到頂端」（規格：500–700px） */
export const BACK_TO_TOP_THRESHOLD = 600;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * 回到頂端按鈕。
 * 沒有 JS 時按鈕維持 hidden，不會出現一顆按不動的按鈕。
 */
export function initBackToTop(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-back-to-top]');
  if (!button || button.dataset.ready === 'true') return;
  button.dataset.ready = 'true';

  const sync = () => {
    const scrolled = window.scrollY || document.documentElement.scrollTop || 0;
    button.hidden = scrolled < BACK_TO_TOP_THRESHOLD;
  };

  sync();
  window.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    // 回到頂端後把焦點交回頁面開頭，鍵盤使用者不會卡在浮動按鈕上
    const main = document.getElementById('main');
    if (main) {
      main.setAttribute('tabindex', '-1');
      main.focus({ preventScroll: true });
      main.removeAttribute('tabindex');
    }
  });
}
