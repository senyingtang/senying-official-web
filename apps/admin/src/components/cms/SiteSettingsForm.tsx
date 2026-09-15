'use client';

import { SOCIAL_PLATFORM_LABELS, type MarketingSiteSettings, type SocialPlatform } from '@syt/database/site-settings';
import { buttonClass } from '@syt/ui';
import { useActionState } from 'react';
import { Notice } from '@/components/ui/Notice';
import { FormSection } from '@/components/ui/FormSection';
import { TextInput, ToggleField } from '@/components/ui/fields';
import { initialSiteSettingsFormState, type SiteSettingsFormState } from '@/lib/site-settings/form';

export interface SiteSettingsFormProps {
  initialSettings: MarketingSiteSettings;
  /** false：唯讀（editor / viewer）；伺服器端 action 仍會再檢查權限 */
  canEdit: boolean;
  isMock: boolean;
  action: (state: SiteSettingsFormState, formData: FormData) => Promise<SiteSettingsFormState>;
}

const URL_PLACEHOLDERS: Record<SocialPlatform, string> = {
  line: 'https://line.me/R/ti/p/@帳號',
  facebook: 'https://www.facebook.com/粉絲專頁',
  instagram: 'https://www.instagram.com/帳號',
  threads: 'https://www.threads.net/@帳號',
  youtube: 'https://www.youtube.com/@頻道',
  tiktok: 'https://www.tiktok.com/@帳號',
  email: 'mailto:hello@your-domain',
  phone: 'tel:+886-2-0000-0000',
};

const noticeTone = { saved: 'info', mock: 'warning', invalid: 'danger', forbidden: 'danger', error: 'danger', idle: 'info' } as const;

export function SiteSettingsForm({ initialSettings, canEdit, isMock, action }: SiteSettingsFormProps) {
  const [state, formAction, pending] = useActionState(action, initialSiteSettingsFormState);
  const { brand, socials, floatingActions } = initialSettings;
  const error = (name: string) => state.errors[name];

  return (
    <form action={formAction} className="grid min-w-0 gap-6" data-testid="site-settings-form">
      {isMock && (
        <Notice tone="warning" title="Mock 模式">
          顯示的是 mock 設定；儲存時只會驗證欄位，不會寫入資料庫。
        </Notice>
      )}
      {state.status !== 'idle' && (
        <div role="status" aria-live="polite">
          <Notice tone={noticeTone[state.status]} title={state.message} >
            {Object.keys(state.errors).length > 0 ? `共 ${Object.keys(state.errors).length} 個欄位需要修正。` : ' '}
          </Notice>
        </div>
      )}

      <fieldset disabled={!canEdit || pending} className="grid min-w-0 gap-6">
        <legend className="sr-only">官網全站設定</legend>

        <FormSection title="品牌設定" description="正式品牌：中文「森映」、英文「SEN YING」（全大寫）。">
          <TextInput label="中文品牌名" name="brand_name_zh" defaultValue={brand.brandNameZh} error={error('brand_name_zh')} required />
          <TextInput label="英文品牌名" name="brand_name_en" defaultValue={brand.brandNameEn} error={error('brand_name_en')} hint="全大寫，例如 SEN YING" required />
          <TextInput label="Footer 品牌名稱" name="footer_brand_name" defaultValue={brand.footerBrandName} error={error('footer_brand_name')} />
          <TextInput label="Logo" name="logo_url" defaultValue={brand.logoUrl} error={error('logo_url')} placeholder="/brand/sen-ying-logo.svg" hint="空白時使用內建暫用字標 /brand/sen-ying-logo.svg（TEMPORARY BRAND ASSET）；變更後需重新 build 官網" />
          <TextInput label="Favicon" name="favicon_url" defaultValue={brand.faviconUrl} error={error('favicon_url')} placeholder="/brand/favicon.svg" hint="空白時使用 /brand/favicon.svg" />
        </FormSection>

        <FormSection title="社群媒體" description="網址空白時，即使啟用也不會在官網顯示；只接受 https、mailto:、tel: 或站內路徑。">
          {socials.map((social) => {
            const prefix = `social.${social.platform}`;
            return (
              <fieldset key={social.platform} data-social-setting={social.platform} className="grid min-w-0 content-start gap-3 rounded-xl border border-border-gray p-4">
                <legend className="px-1 text-sm font-semibold text-ink">{SOCIAL_PLATFORM_LABELS[social.platform]}</legend>
                <ToggleField label="啟用" name={`${prefix}.enabled`} defaultChecked={social.enabled} />
                <TextInput label="顯示名稱" name={`${prefix}.label`} defaultValue={social.label} error={error(`${prefix}.label`)} />
                <TextInput
                  label="網址"
                  name={`${prefix}.url`}
                  defaultValue={social.url}
                  placeholder={URL_PLACEHOLDERS[social.platform]}
                  error={error(`${prefix}.url`)}
                  inputMode="url"
                />
                <TextInput label="排序" name={`${prefix}.sort_order`} type="number" min={0} max={9999} step={1} defaultValue={String(social.sortOrder)} error={error(`${prefix}.sort_order`)} />
                <ToggleField label="另開新視窗" name={`${prefix}.open_in_new_tab`} defaultChecked={social.openInNewTab} />
                <ToggleField label="桌機顯示" name={`${prefix}.show_on_desktop`} defaultChecked={social.showOnDesktop} />
                <ToggleField label="手機顯示" name={`${prefix}.show_on_mobile`} defaultChecked={social.showOnMobile} />
              </fieldset>
            );
          })}
        </FormSection>

        <FormSection title="Floating Actions" description="官網右側浮動快捷列（桌機）與右下快捷按鈕（手機）。">
          <ToggleField label="啟用浮動快捷列" name="fa.enabled" defaultChecked={floatingActions.enabled} description="關閉後整組快捷列都不顯示" />
          <ToggleField label="預設收合" name="fa.default_collapsed" defaultChecked={floatingActions.defaultCollapsed} description="使用者手動切換後，以使用者偏好為準" />
          <ToggleField label="桌機顯示" name="fa.desktop_enabled" defaultChecked={floatingActions.desktopEnabled} description="1024px 以上的右側 rail" />
          <ToggleField label="手機顯示" name="fa.mobile_enabled" defaultChecked={floatingActions.mobileEnabled} description="1024px 以下的快捷按鈕與 bottom sheet" />
        </FormSection>

        <FormSection title="Cart Shortcut" description="購物車流程正式上線前請保持關閉；關閉時官網完全不顯示購物車。">
          <ToggleField label="顯示購物車捷徑" name="cart.enabled" defaultChecked={floatingActions.cartEnabled} />
          <ToggleField label="顯示數量 Badge" name="cart.show_badge" defaultChecked={floatingActions.cartBadgeEnabled} description="0 件不顯示，100 件以上顯示 99+" />
          <TextInput label="購物車文字" name="cart.label" defaultValue={floatingActions.cartLabel} error={error('cart.label')} />
          <TextInput label="購物車連結" name="cart.href" defaultValue={floatingActions.cartHref} error={error('cart.href')} placeholder="/cart" hint="站內路徑" />
        </FormSection>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        {!canEdit && <p className="text-sm text-slate-gray">目前角色只能查看，不能修改全站設定。</p>}
        <button type="submit" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled={!canEdit || pending}>
          {pending ? '儲存中…' : '儲存全站設定'}
        </button>
      </div>
    </form>
  );
}
