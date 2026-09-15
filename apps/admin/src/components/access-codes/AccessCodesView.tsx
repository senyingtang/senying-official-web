import type { Repositories } from '@syt/database';
import { formatDateTime, PRODUCT_CODE_LABELS, type AccessCodeStatus } from '@syt/shared';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { AccessCodeTable, type AccessCodeRow } from './AccessCodeTable';

/** repos 由 requireAdminPage() 提供（已通過角色檢查） */
export async function AccessCodesView({ repos, title, description, statuses }: { repos: Repositories; title: string; description: string; statuses?: AccessCodeStatus[] }) {
  const codes = await repos.accessCodes.list();
  const rows: AccessCodeRow[] = codes
    .filter((code) => !statuses || statuses.includes(code.status))
    .map((code) => ({
      id: code.id,
      code: code.code,
      productLabel: PRODUCT_CODE_LABELS[code.productCode],
      planName: code.planName,
      status: code.status,
      holder: code.holderEmail ?? '—',
      redeemer: code.redeemerEmail ?? '—',
      createdAt: formatDateTime(code.createdAt),
      redeemedAt: formatDateTime(code.redeemedAt),
    }));

  return (
    <>
      <PageHeader eyebrow="權限代碼" title={title} description={description} />
      <div className="grid gap-4">
        <Notice title="代碼由系統自動產生">
          付款成功或後台標記付款成功後，系統會以 SYT-產品代碼-年份-6 碼的格式自動產生代碼。後台不提供人工輸入自訂代碼。
        </Notice>
        <AccessCodeTable rows={rows} emptyTitle="沒有符合條件的代碼" />
      </div>
    </>
  );
}
