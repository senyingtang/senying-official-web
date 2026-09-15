'use client';

import { maskAccessCode } from '@syt/shared';
import { useState } from 'react';
import { CopyButton } from './CopyButton';

export interface CodeDisplayProps {
  code: string;
  /** 預設遮蔽權限代碼後三碼，點「顯示」才完整顯示 */
  masked?: boolean;
  copyLabel?: string;
}

export function CodeDisplay({ code, masked = false, copyLabel = '複製' }: CodeDisplayProps) {
  const [revealed, setRevealed] = useState(!masked);
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <code className="break-all rounded-md bg-mist-white px-2 py-1 font-mono text-xs text-ink sm:text-sm">{revealed ? code : maskAccessCode(code)}</code>
      {masked && (
        <button type="button" onClick={() => setRevealed((value) => !value)} className="text-xs font-medium text-teal-strong hover:underline">
          {revealed ? '隱藏' : '顯示'}
        </button>
      )}
      <CopyButton value={code} label={copyLabel} />
    </div>
  );
}
