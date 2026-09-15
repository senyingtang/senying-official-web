import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { DataTablePlaceholder } from '@/components/ui/DataTablePlaceholder';
import { FormSection } from '@/components/ui/FormSection';
import { SelectField, TextArea, TextInput } from '@/components/ui/fields';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'SEO 管理' };

const rows = [
  { id: 'home', page: '首頁', title: '已設定', description: '已設定', canonical: '已設定', schema: 'Organization / WebSite / FAQPage' },
  { id: 'seo-website', page: 'SEO 形象官網', title: '已設定', description: '已設定', canonical: '已設定', schema: 'Service / FAQPage' },
  { id: 'checkout', page: '方案與結帳', title: '已設定', description: '已設定', canonical: '已設定', schema: 'noindex' },
];

export default async function CmsSeoPage() {
  await requireAdminPage('/admin/cms/seo');
  return (
    <>
      <PageHeader eyebrow="官網 CMS" title="SEO 管理" description="每頁 SEO title、meta description、canonical、OG、robots 與 JSON-LD。" />
      <div className="grid gap-6">
        <DataTablePlaceholder
          caption="頁面 SEO 狀態"
          columns={[
            { key: 'page', label: '頁面' },
            { key: 'title', label: 'SEO title' },
            { key: 'description', label: 'Description' },
            { key: 'canonical', label: 'Canonical' },
            { key: 'schema', label: '結構化資料' },
          ]}
          rows={rows.map((row) => ({
            ...row,
            title: <StatusBadge tone="success">{row.title}</StatusBadge>,
            description: <StatusBadge tone="success">{row.description}</StatusBadge>,
            canonical: <StatusBadge tone="success">{row.canonical}</StatusBadge>,
          }))}
        />
        <FormSection
          title="預設 SEO"
          description="頁面沒有自訂時使用的預設值（cms_site_settings）。"
          footer={
            <button type="button" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled>
              儲存（尚未串接）
            </button>
          }
        >
          <TextInput label="網站名稱" name="site_name" defaultValue="森映 SEN YING" />
          <SelectField
            label="Robots 預設"
            name="robots"
            options={[
              { value: 'index,follow', label: 'index, follow' },
              { value: 'noindex,nofollow', label: 'noindex, nofollow' },
            ]}
          />
          <TextArea label="預設描述" name="default_description" fullWidth hint="建議 80–160 個中文字元等效長度" />
          <TextInput label="預設 OG 圖片" name="og_image" fullWidth placeholder="/og/default-og.png" hint="1200 × 630" />
        </FormSection>
      </div>
    </>
  );
}
