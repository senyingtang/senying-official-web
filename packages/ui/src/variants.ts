/**
 * 前台（Astro）與後台（React）共用的 class 組合，避免兩邊樣式漂移。
 * 只使用 styles/theme.css 定義的 token。
 */
export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  'inline-flex max-w-full items-center justify-center gap-2 rounded-button font-semibold text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-60';

const buttonVariants: Record<ButtonVariant, string> = {
  // teal 底搭配深色字，對比度符合 WCAG AA
  primary: 'bg-teal text-navy-black hover:bg-teal-hover',
  secondary: 'border border-teal-strong bg-surface text-teal-strong hover:bg-teal-soft',
  dark: 'bg-deep-navy text-white hover:bg-deep-navy-soft',
  ghost: 'text-deep-navy hover:bg-mist-white',
  danger: 'bg-danger text-white hover:opacity-90',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-5 text-sm sm:text-base',
  lg: 'min-h-12 px-6 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return [buttonBase, buttonVariants[variant], buttonSizes[size], extra].filter(Boolean).join(' ');
}

export const cardClass = 'rounded-card border border-border-gray bg-surface p-5 shadow-card sm:p-6';

export const inputClass =
  'block w-full min-w-0 rounded-input border border-border-gray bg-surface px-3 py-2.5 text-base text-ink placeholder:text-slate-gray focus:border-teal-strong focus:outline-2 focus:outline-teal/40 disabled:bg-mist-white';

export type BadgeTone = 'neutral' | 'teal' | 'success' | 'warning' | 'danger' | 'dark';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-mist-white text-slate-gray border-border-gray',
  teal: 'bg-teal-soft text-teal-strong border-teal/30',
  success: 'bg-success/10 text-success-strong border-success/30',
  warning: 'bg-warning/10 text-warning-strong border-warning/30',
  danger: 'bg-danger/10 text-danger-strong border-danger/30',
  dark: 'bg-deep-navy text-white border-deep-navy',
};

export function badgeClass(tone: BadgeTone = 'neutral'): string {
  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${badgeTones[tone]}`;
}
