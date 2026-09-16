/**
 * Phase 2.9 內容用 Markdown（後台編輯 / 前台輸出共用）。
 *
 * 設計原則：先把整份原始碼 HTML escape，再只產生白名單標籤。
 * 因此原始碼裡的 <script>、<iframe>、onerror= 一律以純文字輸出，不可能還原成 HTML；
 * 不需要另外接 sanitizer 套件，也不會有「漏掉某個標籤」的風險。
 *
 * 支援：H2 / H3、段落、ul / ol、blockquote、link、image、strong、inline code、code block、hr。
 * 連結與圖片網址採白名單（https / http / mailto: / tel: / 站內路徑 / #錨點）；其餘一律降級為純文字。
 *
 * 本檔沒有任何 import：Astro 前台、Next.js 後台與 Node 驗收腳本都可以直接載入。
 */

/** 允許出現在輸出 HTML 的標籤（驗收用） */
export const ALLOWED_MARKDOWN_TAGS = ['h2', 'h3', 'p', 'ul', 'ol', 'li', 'blockquote', 'a', 'img', 'strong', 'em', 'code', 'pre', 'hr'] as const;

/** 內容欄位一律拒絕的樣式（後台儲存前驗證用） */
const UNSAFE_PATTERNS: { key: string; pattern: RegExp }[] = [
  { key: '<script>', pattern: /<\s*script\b/i },
  { key: '<iframe>', pattern: /<\s*iframe\b/i },
  { key: '<object> / <embed>', pattern: /<\s*(object|embed)\b/i },
  { key: 'javascript:', pattern: /javascript\s*:/i },
  { key: 'data:text/html', pattern: /data\s*:\s*text\/html/i },
  { key: 'inline event handler（onerror / onclick…）', pattern: /\bon[a-z]+\s*=/i },
];

/**
 * 找出內容中不允許的樣式。
 * 回傳空陣列代表通過；後台 server action 以此拒絕儲存（前台另有 escape，這是第一道防線）。
 */
export function findUnsafeContentPatterns(value: string): string[] {
  return UNSAFE_PATTERNS.filter((item) => item.pattern.test(value)).map((item) => item.key);
}

/** 連結 / 圖片可用的網址：https、http、mailto:、tel:、站內路徑、頁內錨點 */
export function isSafeContentUrl(url: string): boolean {
  const value = url.trim();
  if (!value) return false;
  if (/\s/.test(value)) return false;
  if (/^#[^\s]*$/.test(value)) return true;
  if (/^\/(?!\/)/.test(value)) return true;
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)) return true;
  if (/^tel:\+?[0-9-]{6,20}$/i.test(value)) return true;
  return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(value);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** inline code 佔位符：escapeHtml 已把 & 轉成 &amp;，使用者內容不可能產生 &#0;，回填時不會誤傷內容 */
const CODE_OPEN = '&#0;CODE';
const CODE_CLOSE = '&#0;';

/** 行內語法：inline code → 圖片 → 連結 → 粗體 → 斜體（輸入必須已經 escape 過） */
function renderInline(escaped: string): string {
  const codes: string[] = [];
  let text = escaped.replace(/`([^`\n]+)`/g, (_match, code: string) => {
    codes.push(`<code>${code}</code>`);
    return `${CODE_OPEN}${codes.length - 1}${CODE_CLOSE}`;
  });

  text = text.replace(/!\[([^\]\n]*)\]\(([^)\s]+)\)/g, (match, alt: string, url: string) =>
    isSafeContentUrl(url) ? `<img src="${url}" alt="${alt}" loading="lazy" decoding="async" />` : match,
  );
  text = text.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, (match, label: string, url: string) => {
    if (!isSafeContentUrl(url)) return match;
    const external = /^https?:\/\//i.test(url);
    return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');

  return text.replace(/&#0;CODE(\d+)&#0;/g, (_match, index: string) => codes[Number(index)] ?? '');
}

const isListItem = (line: string) => /^\s{0,3}[-*]\s+/.test(line);
const isOrderedItem = (line: string) => /^\s{0,3}\d+[.)]\s+/.test(line);

/**
 * Markdown → 安全 HTML。
 * 輸出只會包含 ALLOWED_MARKDOWN_TAGS 中的標籤，且沒有任何 style / on* 屬性。
 */
export function renderMarkdown(source: string): string {
  const lines = String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const html: string[] = [];
  let index = 0;

  const flushParagraph = (buffer: string[]): void => {
    if (buffer.length === 0) return;
    html.push(`<p>${renderInline(escapeHtml(buffer.join('\n')).replace(/\n/g, '<br />'))}</p>`);
    buffer.length = 0;
  };

  const paragraph: string[] = [];
  while (index < lines.length) {
    const line = lines[index] ?? '';

    // 程式碼區塊（```）：內容完全不做行內語法，只 escape
    if (/^\s{0,3}```/.test(line)) {
      flushParagraph(paragraph);
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s{0,3}```/.test(lines[index] ?? '')) {
        code.push(lines[index] ?? '');
        index += 1;
      }
      index += 1;
      html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line.trim() === '') {
      flushParagraph(paragraph);
      index += 1;
      continue;
    }

    if (/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      flushParagraph(paragraph);
      html.push('<hr />');
      index += 1;
      continue;
    }

    // 標題：# 與 ## 都輸出 h2（頁面 h1 由版面提供），### 之後輸出 h3
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph(paragraph);
      const level = (heading[1] ?? '#').length <= 2 ? 'h2' : 'h3';
      html.push(`<${level}>${renderInline(escapeHtml((heading[2] ?? '').trim()))}</${level}>`);
      index += 1;
      continue;
    }

    if (/^\s{0,3}>\s?/.test(line)) {
      flushParagraph(paragraph);
      const quote: string[] = [];
      while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index] ?? '')) {
        quote.push((lines[index] ?? '').replace(/^\s{0,3}>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote><p>${renderInline(escapeHtml(quote.join('\n')).replace(/\n/g, '<br />'))}</p></blockquote>`);
      continue;
    }

    if (isListItem(line) || isOrderedItem(line)) {
      flushParagraph(paragraph);
      const ordered = isOrderedItem(line);
      const matches = ordered ? isOrderedItem : isListItem;
      const items: string[] = [];
      while (index < lines.length && matches(lines[index] ?? '')) {
        const raw = (lines[index] ?? '').replace(ordered ? /^\s{0,3}\d+[.)]\s+/ : /^\s{0,3}[-*]\s+/, '');
        items.push(`<li>${renderInline(escapeHtml(raw))}</li>`);
        index += 1;
      }
      html.push(ordered ? `<ol>${items.join('')}</ol>` : `<ul>${items.join('')}</ul>`);
      continue;
    }

    paragraph.push(line);
    index += 1;
  }
  flushParagraph(paragraph);
  return html.join('\n');
}

/** 取純文字（搜尋索引、摘要、閱讀時間使用）；不產生任何 HTML */
export function markdownToPlainText(source: string): string {
  return String(source ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/!\[([^\]\n]*)\]\([^)\s]+\)/g, '$1')
    .replace(/\[([^\]\n]+)\]\([^)\s]+\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*]\s+/gm, '')
    .replace(/^\s{0,3}\d+[.)]\s+/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 以純文字長度估算閱讀時間（中文每分鐘約 400 字） */
export function estimateReadingMinutes(source: string): number {
  const length = markdownToPlainText(source).replace(/\s/g, '').length;
  return Math.max(1, Math.round(length / 400));
}
