'use client';

import { buttonClass } from '@syt/ui';
import { useState } from 'react';

export function CopyButton({ value, label = '複製', disabled = false }: { value: string; label?: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button type="button" onClick={handleCopy} disabled={disabled} className={buttonClass('secondary', 'sm', 'shrink-0')} aria-live="polite">
      {copied ? '已複製' : label}
    </button>
  );
}
