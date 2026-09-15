import { badgeClass, type BadgeTone } from '@syt/ui';
import type { ReactNode } from 'react';

export function StatusBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={badgeClass(tone)}>{children}</span>;
}
