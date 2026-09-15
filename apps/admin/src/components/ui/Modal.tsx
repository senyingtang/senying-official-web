'use client';

import { useEffect, useId, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

/** 手機由底部滑出、桌機置中；寬高都限制在視窗內，內容過長時內部捲動 */
export function Modal({ open, title, description, children, footer, onClose }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="關閉對話框" className="absolute inset-0 h-full w-full bg-navy-black/60" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-5 shadow-card sm:p-6"
      >
        <h2 id={titleId} className="text-lg font-bold text-ink">
          {title}
        </h2>
        {description && <p className="mt-2 text-sm text-slate-gray">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
      </div>
    </div>
  );
}
