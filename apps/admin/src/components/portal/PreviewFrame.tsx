'use client';

import { useState } from 'react';

const DEVICES = [
  { key: 'mobile', label: '手機', width: 375 },
  { key: 'tablet', label: '平板', width: 768 },
  { key: 'desktop', label: '桌機', width: 1280 },
] as const;

/** 預覽框寬度以 min(裝置寬度, 100%) 呈現，不會撐破版面 */
export function PreviewFrame({ siteName }: { siteName: string }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['key']>('mobile');
  const current = DEVICES.find((item) => item.key === device) ?? DEVICES[0];

  return (
    <div className="grid min-w-0 gap-4">
      <div role="radiogroup" aria-label="預覽裝置" className="grid grid-cols-3 gap-2 sm:inline-grid sm:w-auto">
        {DEVICES.map((item) => (
          <button
            key={item.key}
            type="button"
            role="radio"
            aria-checked={device === item.key}
            onClick={() => setDevice(item.key)}
            className={`min-h-11 rounded-button border px-4 text-sm ${
              device === item.key ? 'border-teal-strong bg-teal-soft text-teal-strong' : 'border-border-gray bg-surface text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="min-w-0 overflow-hidden rounded-card border border-border-gray bg-surface p-3 sm:p-4">
        <div className="mx-auto w-full" style={{ maxWidth: current.width }}>
          <div className="flex aspect-[9/16] max-h-[70dvh] w-full flex-col items-center justify-center rounded-xl bg-gradient-to-br from-deep-navy to-deep-navy-soft p-6 text-center text-white">
            <p className="text-sm text-slate-300">{current.label}預覽（{current.width}px）</p>
            <p className="mt-2 break-words text-lg font-bold">{siteName}</p>
            <p className="mt-2 text-xs text-slate-300">串接 Astro 預覽後，這裡會載入草稿內容。</p>
          </div>
        </div>
      </div>
    </div>
  );
}
