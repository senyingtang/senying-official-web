import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField, TextArea, TextInput, ToggleField } from '@/components/ui/fields';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: 'SEO 設定' };

export default async function SiteSeoPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAccess(siteId, `/portal/sites/${siteId}/seo`);
  return (
    <>
      <PageHeader title="SEO 設定" description="每個頁面都可以設定搜尋結果顯示的標題與描述，以及分享到社群時的圖片。" />
      <div className="grid gap-6">
        <SelectField
          label="頁面"
          name="seo_page"
          options={[
            { value: 'home', label: '首頁（/）' },
            { value: 'about', label: '關於我們（/about）' },
            { value: 'services', label: '服務項目（/services）' },
            { value: 'contact', label: '聯絡我們（/contact）' },
          ]}
        />
        <FormSection
          title="搜尋結果"
          footer={
            <button type="button" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled>
              儲存草稿（尚未串接）
            </button>
          }
        >
          <TextInput label="SEO 標題" name="seo_title" maxLength={120} hint="建議 30–60 個中文字元等效長度" fullWidth />
          <TextArea label="Meta description" name="meta_description" maxLength={320} hint="建議 80–160 個中文字元等效長度" fullWidth />
          <TextInput label="H1" name="h1" fullWidth />
          <TextInput label="Canonical" name="canonical_url" placeholder="/ 或完整 https 網址" />
          <SelectField
            label="Robots"
            name="robots"
            options={[
              { value: 'index,follow', label: '允許搜尋引擎收錄' },
              { value: 'noindex,nofollow', label: '不收錄' },
            ]}
          />
        </FormSection>
        <FormSection title="社群分享（OG）">
          <TextInput label="OG 標題" name="og_title" />
          <TextInput label="OG 圖片" name="og_image" type="file" accept="image/jpeg,image/png,image/webp" hint="1200 × 630" />
          <TextArea label="OG 描述" name="og_description" fullWidth />
          <div className="md:col-span-2">
            <ToggleField label="自動產生 FAQ 結構化資料" description="頁面有 FAQ 區塊時輸出 FAQPage JSON-LD" name="faq_schema" defaultChecked />
          </div>
        </FormSection>
      </div>
    </>
  );
}
