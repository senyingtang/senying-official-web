'use client';

import type { CaseStudyDetail } from '@syt/database/cms-content';
import { CASE_INDUSTRY_OPTIONS, CASE_SERVICE_TYPE_OPTIONS, CONTENT_STATUS_LABELS, CONTENT_STATUSES } from '@syt/database/cms-content';
import { buttonClass } from '@syt/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { MarkdownField } from '@/components/cms/MarkdownField';
import { FormSection } from '@/components/ui/FormSection';
import { Notice } from '@/components/ui/Notice';
import { SelectField, TextArea, TextInput, ToggleField } from '@/components/ui/fields';
import { GALLERY_SLOTS, initialContentFormState, toDateTimeLocal, type ContentFormState } from '@/lib/cms/form';

export interface CaseStudyFormProps {
  item: CaseStudyDetail | null;
  canEdit: boolean;
  isMock: boolean;
  action: (state: ContentFormState, formData: FormData) => Promise<ContentFormState>;
}

const noticeTone = { saved: 'info', mock: 'warning', invalid: 'danger', forbidden: 'danger', conflict: 'danger', error: 'danger', idle: 'info' } as const;

export function CaseStudyForm({ item, canEdit, isMock, action }: CaseStudyFormProps) {
  const [state, formAction, pending] = useActionState(action, initialContentFormState);
  const error = (name: string) => state.errors[name];
  const gallery = item?.gallery ?? [];

  return (
    <form action={formAction} className="grid min-w-0 gap-6" data-testid="case-study-form">
      {item && <input type="hidden" name="id" value={item.id} />}
      {isMock && (
        <Notice tone="warning" title="Mock 模式">
          顯示的是 mock 內容；儲存只會驗證欄位並暫存在記憶體，不會寫入資料庫，重新啟動後還原。
        </Notice>
      )}
      {state.status !== 'idle' && (
        <div role="status" aria-live="polite">
          <Notice tone={noticeTone[state.status]} title={state.message}>
            {Object.keys(state.errors).length > 0 ? `共 ${Object.keys(state.errors).length} 個欄位需要修正。` : ' '}
          </Notice>
        </div>
      )}

      <fieldset disabled={!canEdit || pending} className="grid min-w-0 gap-6">
        <legend className="sr-only">案例內容</legend>

        <FormSection title="基本資料" description="slug 會成為案例網址 /cases/{slug}。">
          <TextInput label="案例名稱" name="title" defaultValue={item?.title ?? ''} error={error('title')} required maxLength={150} />
          <TextInput label="網址代稱（slug）" name="slug" defaultValue={item?.slug ?? ''} error={error('slug')} required placeholder="brand-website-case" hint="小寫英數字與連字號" />
          <TextInput label="產業" name="industry" defaultValue={item?.industry ?? ''} error={error('industry')} list="case-industry-options" placeholder="品牌形象" />
          <TextInput label="服務類型" name="service_type" defaultValue={item?.serviceType ?? ''} error={error('service_type')} list="case-service-type-options" placeholder="SEO 形象官網" />
          <TextInput label="客戶 / 專案標示" name="client_label" defaultValue={item?.clientLabel ?? ''} error={error('client_label')} hint="沒有取得客戶授權時請使用「版型示意」等非具名標示" />
          <TextInput label="狀態文字" name="display_status" defaultValue={item?.displayStatus ?? ''} error={error('display_status')} placeholder="案例整理中" hint="顯示在案例卡上的狀態，不是成效數據" />
          <TextArea label="需求摘要" name="excerpt" defaultValue={item?.excerpt ?? ''} error={error('excerpt')} fullWidth maxLength={300} hint="案例卡與搜尋結果會顯示這段文字" />
          <TextInput label="封面圖網址" name="cover_image_url" defaultValue={item?.coverImageUrl ?? ''} error={error('cover_image_url')} fullWidth placeholder="/images/cases/example.webp" hint="留空時使用版面示意圖，不會宣稱是客戶實際畫面" />
          <datalist id="case-industry-options">
            {CASE_INDUSTRY_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
          <datalist id="case-service-type-options">
            {CASE_SERVICE_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </FormSection>

        <FormSection title="案例內容" description="Markdown：## 標題、- 清單、**粗體**、[連結](網址)。禁止 HTML 標籤與 javascript: 連結。" columns={1}>
          <MarkdownField label="案例說明" name="content" defaultValue={item?.content ?? ''} error={error('content')} rows={14} />
        </FormSection>

        <FormSection title="問題 / 做法 / 成果" description="沒有取得客戶同意並完成統計的成效數字請留空，不要填入未經確認的百分比或金額。">
          <TextArea label="面對的問題" name="challenge" defaultValue={item?.challenge ?? ''} error={error('challenge')} rows={4} />
          <TextArea label="做法" name="solution" defaultValue={item?.solution ?? ''} error={error('solution')} rows={4} />
          <TextArea
            label="成果說明（選填）"
            name="result_summary"
            defaultValue={item?.resultSummary ?? ''}
            error={error('result_summary')}
            rows={4}
            fullWidth
            hint="留空時前台不顯示成果區；請以文字描述實際完成的事，不要填未經確認的數據"
          />
        </FormSection>

        <FormSection title="相簿" description="最多 4 張；留空的欄位會被忽略。" columns={1}>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: GALLERY_SLOTS }, (_, index) => (
              <fieldset key={index} className="grid min-w-0 content-start gap-3 rounded-xl border border-border-gray p-4">
                <legend className="px-1 text-sm font-semibold text-ink">圖片 {index + 1}</legend>
                <TextInput label="圖片網址" name={`gallery.${index}.url`} defaultValue={gallery[index]?.url ?? ''} error={error(`gallery.${index}.url`)} placeholder="/images/cases/example-1.webp" />
                <TextInput label="替代文字" name={`gallery.${index}.alt`} defaultValue={gallery[index]?.alt ?? ''} error={error(`gallery.${index}.alt`)} />
              </fieldset>
            ))}
          </div>
        </FormSection>

        <FormSection title="發布設定" description="前台只會輸出「已發布且發布時間已到」的案例。">
          <SelectField
            label="狀態"
            name="status"
            defaultValue={item?.status ?? 'draft'}
            error={error('status')}
            options={CONTENT_STATUSES.map((value) => ({ value, label: CONTENT_STATUS_LABELS[value] }))}
          />
          <TextInput label="發布時間" name="published_at" type="datetime-local" defaultValue={toDateTimeLocal(item?.publishedAt ?? null)} error={error('published_at')} hint="狀態為「已發布」時必填；留空會自動填入儲存時間" />
          <TextInput label="排序" name="sort_order" type="number" min={0} max={9999} step={10} defaultValue={String(item?.sortOrder ?? 0)} error={error('sort_order')} hint="數字小的排前面" />
          <div className="grid content-start gap-3 rounded-xl border border-border-gray p-4">
            <ToggleField label="設為精選案例" name="is_featured" defaultChecked={item?.isFeatured ?? false} />
            <ToggleField label="版型 / 設計示意（非客戶專案）" name="is_sample" defaultChecked={item?.isSample ?? false} description="開啟後前台會標示「非客戶專案」" />
          </div>
        </FormSection>

        <FormSection title="SEO" description="留空時使用案例名稱與需求摘要；欄位存在 seo_metadata。">
          <TextInput label="SEO 標題" name="seo_title" defaultValue={item?.seo.seoTitle ?? ''} error={error('seo_title')} maxLength={120} />
          <TextInput label="Canonical 覆寫" name="canonical_override" defaultValue={item?.seo.canonicalOverride ?? ''} error={error('canonical_override')} />
          <TextArea label="SEO 描述" name="seo_description" defaultValue={item?.seo.seoDescription ?? ''} error={error('seo_description')} fullWidth maxLength={320} />
          <TextInput label="OG 圖網址" name="og_image_url" defaultValue={item?.seo.ogImageUrl ?? ''} error={error('og_image_url')} fullWidth placeholder="/images/og/cases-og-1200x630.png" />
        </FormSection>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/admin/cms/cases" className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
          回案例列表
        </Link>
        <button type="submit" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled={!canEdit || pending}>
          {pending ? '儲存中…' : '儲存案例'}
        </button>
      </div>
    </form>
  );
}
