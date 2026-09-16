'use client';

import { renderMarkdown } from '@syt/shared';
import { cn } from '@syt/shared';
import { inputClass } from '@syt/ui';
import { useId, useState } from 'react';

export interface MarkdownFieldProps {
  label: string;
  name: string;
  defaultValue?: string;
  hint?: string;
  error?: string;
  rows?: number;
  required?: boolean;
}

/**
 * Markdown 編輯欄位（Phase 2.9 不引入富文字編輯器）。
 *
 * 預覽使用 @syt/shared 的 renderMarkdown：先把原始碼整份 HTML escape，再只產生白名單標籤
 * （h2 / h3 / p / ul / ol / li / blockquote / a / img / strong / em / code / pre / hr），
 * 因此 <script>、<iframe>、on* 事件屬性只會以純文字顯示，不會變成 HTML。前台輸出走同一個函式。
 */
export function MarkdownField({ label, name, defaultValue = '', hint, error, rows = 16, required }: MarkdownFieldProps) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="grid min-w-0 content-start gap-1.5 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
          {required && <span className="text-danger-strong"> *</span>}
        </label>
        <div className="flex gap-1 rounded-lg border border-border-gray p-0.5" role="group" aria-label="編輯與預覽切換">
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            aria-pressed={!showPreview}
            className={cn('min-h-9 rounded-md px-3 text-sm', showPreview ? 'text-slate-gray' : 'bg-teal-soft font-semibold text-teal-strong')}
          >
            編輯
          </button>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            aria-pressed={showPreview}
            className={cn('min-h-9 rounded-md px-3 text-sm', showPreview ? 'bg-teal-soft font-semibold text-teal-strong' : 'text-slate-gray')}
          >
            預覽
          </button>
        </div>
      </div>

      <textarea
        id={id}
        name={name}
        rows={rows}
        required={required}
        hidden={showPreview}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(inputClass, 'min-h-64 font-mono text-sm leading-relaxed', error && 'border-danger')}
      />

      {showPreview && (
        <div
          data-markdown-preview
          className="syt-prose min-h-64 overflow-x-auto rounded-input border border-border-gray bg-surface px-4 py-3 text-base text-ink"
          // renderMarkdown 只輸出白名單標籤（原始碼已整份 escape），不會有 script / iframe / on* 屬性
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
        />
      )}

      {hint && (
        <p id={`${id}-hint`} className="text-xs text-slate-gray">
          {hint}
        </p>
      )}
      {error && <p className="text-xs text-danger-strong">{error}</p>}
    </div>
  );
}
