import { formatDateTime } from '@syt/shared';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '表單紀錄' };

const STATUS = {
  new: { label: '新紀錄', tone: 'teal' },
  read: { label: '已讀', tone: 'neutral' },
  replied: { label: '已回覆', tone: 'success' },
  archived: { label: '封存', tone: 'neutral' },
  spam: { label: '垃圾訊息', tone: 'danger' },
} as const;

export default async function SiteFormsPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const { repos } = await requireSiteAccess(siteId, `/portal/sites/${siteId}/forms`);
  const submissions = await repos.customerSites.listFormSubmissions(siteId);
  return (
    <>
      <PageHeader title="表單紀錄" description="訪客從網站送出的聯絡、報名或預約資料，只有你的工作區成員看得到。" />
      <DataTablePlaceholder
        caption="表單紀錄"
        minWidth={560}
        columns={[
          { key: 'createdAt', label: '時間', className: 'whitespace-nowrap' },
          { key: 'form', label: '表單' },
          { key: 'summary', label: '內容摘要' },
          { key: 'status', label: '狀態' },
        ]}
        rows={submissions.map((item) => ({
          id: item.id,
          createdAt: formatDateTime(item.createdAt),
          form: item.formName,
          summary: item.summary,
          status: <StatusBadge tone={STATUS[item.status].tone}>{STATUS[item.status].label}</StatusBadge>,
        }))}
        emptyTitle="還沒有表單紀錄"
        emptyDescription="網站發布後，訪客送出的資料會出現在這裡。"
      />
    </>
  );
}
