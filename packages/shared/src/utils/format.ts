/** 合併 className，忽略 falsy 值 */
export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** DB 金額單位為 cents；TWD 以整數元顯示 */
export function formatMoneyFromCents(amountCents: number, currency = 'TWD'): string {
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amountCents / 100);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** 去除結尾斜線；空字串回傳 null */
export function normalizeBaseUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}
