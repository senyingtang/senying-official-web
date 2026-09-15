import type { TemplateSummary } from '@syt/database';
import { SITE_TYPE_LABELS, TEMPLATE_PRICING_LABELS } from '@syt/shared';
import { badgeClass, buttonClass, cardClass } from '@syt/ui';

export function TemplateCard({ template, actionLabel = '使用這個版型' }: { template: TemplateSummary; actionLabel?: string }) {
  return (
    <article className={`${cardClass} flex h-full min-w-0 flex-col`}>
      <div
        className="mb-4 flex aspect-[16/10] items-center justify-center rounded-xl bg-gradient-to-br from-deep-navy to-deep-navy-soft text-sm text-slate-300"
        role="img"
        aria-label={`${template.name} 預覽圖（準備中）`}
      >
        預覽圖準備中
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={badgeClass(template.pricingType === 'free' ? 'teal' : 'neutral')}>{TEMPLATE_PRICING_LABELS[template.pricingType]}</span>
        <span className={badgeClass('neutral')}>{SITE_TYPE_LABELS[template.siteType]}</span>
        {template.status === 'draft' && <span className={badgeClass('warning')}>草稿</span>}
      </div>
      <h3 className="mt-3 text-base font-bold text-ink">{template.name}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-gray">{template.description}</p>
      {template.pages.length > 0 && <p className="mt-3 text-xs text-slate-gray">頁面：{template.pages.join('、')}</p>}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button type="button" className={buttonClass('secondary', 'sm', 'w-full sm:w-auto')} disabled>
          預覽
        </button>
        <button type="button" className={buttonClass('primary', 'sm', 'w-full sm:w-auto')} disabled>
          {actionLabel}
        </button>
      </div>
    </article>
  );
}
