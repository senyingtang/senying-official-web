'use client';

import { buttonClass } from '@syt/ui';
import { ErrorState } from '@/components/ui/ErrorState';

export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      description="請重新整理頁面；若持續發生，請到客服協助頁面聯絡我們。"
      action={
        <button type="button" className={buttonClass('secondary', 'sm')} onClick={reset}>
          重新載入
        </button>
      }
    />
  );
}
