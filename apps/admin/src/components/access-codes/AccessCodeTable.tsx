'use client';

import { ACCESS_CODE_STATUS_LABELS, maskAccessCode, type AccessCodeStatus } from '@syt/shared';
import { buttonClass } from '@syt/ui';
import { useCallback, useState } from 'react';
import { CodeDisplay } from '@/components/ui/CodeDisplay';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { accessCodeTone } from '@/lib/status';

/** 由 server component 預先格式化日期，避免 server / client 時區格式不同造成 hydration mismatch */
export interface AccessCodeRow {
  id: string;
  code: string;
  productLabel: string;
  planName: string;
  status: AccessCodeStatus;
  holder: string;
  redeemer: string;
  createdAt: string;
  redeemedAt: string;
}

const columns = [
  { key: 'code', label: '代碼' },
  { key: 'status', label: '狀態' },
  { key: 'plan', label: '方案類型' },
  { key: 'holder', label: '持有人' },
  { key: 'redeemer', label: '兌換者' },
  { key: 'createdAt', label: '產生時間', className: 'whitespace-nowrap' },
  { key: 'redeemedAt', label: '兌換時間', className: 'whitespace-nowrap' },
  { key: 'actions', label: '操作' },
];

export function AccessCodeTable({ rows, emptyTitle }: { rows: AccessCodeRow[]; emptyTitle: string }) {
  const [revokeTarget, setRevokeTarget] = useState<AccessCodeRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const closeModal = useCallback(() => setRevokeTarget(null), []);

  const tableRows = rows.map((row) => ({
    id: row.id,
    code: <CodeDisplay code={row.code} masked />,
    status: <StatusBadge tone={accessCodeTone[row.status]}>{ACCESS_CODE_STATUS_LABELS[row.status]}</StatusBadge>,
    plan: (
      <div className="min-w-0">
        <p className="font-medium">{row.productLabel}</p>
        <p className="text-xs text-slate-gray">{row.planName}</p>
      </div>
    ),
    holder: <span className="break-all">{row.holder}</span>,
    redeemer: <span className="break-all">{row.redeemer}</span>,
    createdAt: row.createdAt,
    redeemedAt: row.redeemedAt,
    actions: (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          disabled={row.status !== 'issued'}
          onClick={() => setNotice(`重新寄送（placeholder）：${maskAccessCode(row.code)}。串接通知信後才會實際寄出。`)}
        >
          重新寄送
        </button>
        <button
          type="button"
          data-testid="open-revoke-modal"
          className={buttonClass('danger', 'sm')}
          disabled={row.status === 'revoked'}
          onClick={() => setRevokeTarget(row)}
        >
          撤銷
        </button>
      </div>
    ),
  }));

  return (
    <div className="grid min-w-0 gap-4">
      {notice && (
        <p role="status" className="rounded-card border border-teal/30 bg-teal-soft px-4 py-3 text-sm text-ink">
          {notice}
        </p>
      )}
      <DataTablePlaceholder columns={columns} rows={tableRows} caption="權限代碼列表" minWidth={1080} emptyTitle={emptyTitle} />
      <Modal
        open={revokeTarget !== null}
        onClose={closeModal}
        title="撤銷權限代碼"
        description="撤銷後代碼無法再兌換；若已兌換，對應的權限也會一併停用。此操作會寫入操作紀錄。"
        footer={
          <>
            <button type="button" className={buttonClass('secondary')} onClick={closeModal}>
              取消
            </button>
            <button
              type="button"
              className={buttonClass('danger')}
              onClick={() => {
                setNotice('撤銷（placeholder）：Phase 1 尚未連線資料庫，未實際撤銷。');
                closeModal();
              }}
            >
              確認撤銷
            </button>
          </>
        }
      >
        {revokeTarget && (
          <div className="rounded-xl bg-mist-white px-4 py-3 text-sm">
            <p className="break-all font-mono">{maskAccessCode(revokeTarget.code)}</p>
            <p className="mt-1 text-slate-gray">{revokeTarget.planName}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
