import { colors } from '@syt/ui/tokens';
import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { FormSection } from '@/components/ui/FormSection';
import { PageHeader } from '@/components/ui/PageHeader';
import { SelectField, TextInput } from '@/components/ui/fields';
import { requireSiteAccess } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '外觀設定' };

const swatches = [
  { label: '主色', value: colors.deepNavy },
  { label: '強調色', value: colors.teal },
  { label: '背景色', value: colors.mistWhite },
];

export default async function SiteAppearancePage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  await requireSiteAccess(siteId, `/portal/sites/${siteId}/appearance`);
  return (
    <>
      <PageHeader title="外觀設定" description="只能選擇版型允許的顏色、字型與圓角，確保每個頁面都不會跑版。" />
      <FormSection
        title="品牌外觀"
        footer={
          <button type="button" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled>
            儲存（尚未串接）
          </button>
        }
      >
        <SelectField label="版型風格" name="theme_variant" options={[{ value: 'default', label: '預設' }, { value: 'soft', label: '柔和' }]} />
        <SelectField
          label="圓角"
          name="radius"
          options={[
            { value: 'md', label: '中' },
            { value: 'lg', label: '大' },
            { value: 'none', label: '無' },
          ]}
        />
        <TextInput label="Logo" name="logo" type="file" accept="image/png,image/webp,image/jpeg" hint="建議透明背景 PNG" fullWidth />
        <div className="md:col-span-2">
          <p className="text-sm font-medium text-ink">色彩</p>
          <ul className="mt-2 grid gap-3 sm:grid-cols-3">
            {swatches.map((swatch) => (
              <li key={swatch.label} className="flex min-w-0 items-center gap-3 rounded-xl border border-border-gray p-3">
                <span className="h-9 w-9 shrink-0 rounded-lg border border-border-gray" style={{ backgroundColor: swatch.value }} aria-hidden="true" />
                <span className="min-w-0 text-sm">
                  <span className="block text-ink">{swatch.label}</span>
                  <span className="block font-mono text-xs text-slate-gray">{swatch.value}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </FormSection>
    </>
  );
}
