/**
 * 森映 Design Tokens（深藍黑 × 青綠 × 霧白）
 * 與 styles/theme.css 的 Tailwind @theme 同步；修改時兩邊一起改。
 */
export const colors = {
  navyBlack: '#020617',
  deepNavy: '#0F172A',
  deepNavySoft: '#1E293B',
  teal: '#14B8A6',
  tealHover: '#0D9488',
  tealStrong: '#0F766E',
  tealSoft: '#F0FDFA',
  mistWhite: '#F8FAFC',
  surface: '#FFFFFF',
  ink: '#111827',
  slateGray: '#64748B',
  borderGray: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
} as const;

/** RWD 驗收寬度（px）。Tailwind：xs 375 / sm 430 / md 768 / lg 1024 / xl 1280 / 2xl 1440 */
export const breakpoints = {
  xs: 375,
  sm: 430,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1440,
} as const;

export const RWD_CHECK_WIDTHS = Object.values(breakpoints);

export const radius = {
  button: '0.75rem',
  card: '1.25rem',
  input: '0.625rem',
} as const;

export const layout = {
  maxWidth: 1280,
  gutterMobile: 16,
  gutterDesktop: 24,
  headerHeight: 72,
  sidebarWidth: 256,
} as const;

export const fontFamily = {
  sans: '"Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Consolas, monospace',
} as const;
