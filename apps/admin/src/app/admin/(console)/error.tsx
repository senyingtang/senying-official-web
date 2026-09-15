'use client';

import { buttonClass } from '@syt/ui';
import { ErrorState } from '@/components/ui/ErrorState';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <ErrorState
      action={
        <button type="button" className={buttonClass('secondary', 'sm')} onClick={reset}>
          重新載入
        </button>
      }
    />
  );
}
