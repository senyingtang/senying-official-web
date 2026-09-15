import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { FormSection } from '@/components/ui/FormSection';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField, TextArea, TextInput, ToggleField } from '@/components/ui/fields';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '內容設定' };

const saveButton = (
  <button type="button" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled>
    儲存草稿（尚未串接）
  </button>
);

export default async function SiteContentPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAccess(siteId, `/portal/sites/${siteId}/content`);
  return (
    <>
      <PageHeader title="內容設定" description="版型已經排好版面，只要依欄位填寫內容。修改會先存成草稿，發布後才會出現在網站上。" />
      <div className="grid gap-6">
        <Notice>模板制網站：可以修改文字與圖片、調整區塊排序或暫時隱藏，不能自由新增區塊。</Notice>
        <SelectField
          label="編輯頁面"
          name="page"
          options={[
            { value: 'home', label: '首頁' },
            { value: 'about', label: '關於我們' },
            { value: 'services', label: '服務項目' },
            { value: 'contact', label: '聯絡我們' },
          ]}
        />
        <FormSection title="主視覺（Hero）" description="網站最上方的第一個區塊" footer={saveButton}>
          <TextInput label="主標題（H1）" name="hero_heading" required defaultValue="在這裡寫下你的品牌主張" hint="建議 30 字以內" fullWidth />
          <TextArea label="副標說明" name="hero_description" fullWidth hint="用一兩句話說明你提供什麼服務、適合誰" />
          <TextInput label="按鈕文字" name="hero_cta_label" defaultValue="聯絡我們" />
          <TextInput label="按鈕連結" name="hero_cta_href" defaultValue="/contact" />
          <TextInput label="主視覺圖片" name="hero_image" type="file" accept="image/jpeg,image/png,image/webp" hint="建議 1600×900，WebP" fullWidth />
        </FormSection>
        <FormSection title="服務項目" description="最多 6 張服務卡片" footer={saveButton}>
          <TextInput label="區塊標題（H2）" name="services_title" required fullWidth />
          <TextInput label="服務名稱 1" name="service_1_title" />
          <TextInput label="服務名稱 2" name="service_2_title" />
          <div className="md:col-span-2">
            <ToggleField label="在網站上顯示這個區塊" name="services_enabled" defaultChecked />
          </div>
        </FormSection>
      </div>
    </>
  );
}
