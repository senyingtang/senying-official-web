import { SITE_TYPE_LABELS, SELF_SERVE_SITE_TYPES, SITE_TYPES } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import Link from 'next/link';
import { TemplateCard } from '@/components/templates/TemplateCard';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { requirePortalPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '建立網站' };

export default async function NewSitePage() {
  const { repos } = await requirePortalPage('/portal/sites/new');
  const templates = await repos.templates.listTemplates();
  return (
    <>
      <PageHeader title="建立網站" description="選擇網站類型與版型。建立網站會使用 1 個網站額度。" />
      <div className="grid gap-6">
        <Notice tone="warning">目前沒有可用的網站額度（mock）。請先兌換權限代碼。</Notice>

        <section aria-labelledby="site-type-heading">
          <h2 id="site-type-heading" className="mb-3 text-lg font-bold text-ink">
            1. 選擇網站類型
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {SITE_TYPES.map((type) => {
              const selfServe = SELF_SERVE_SITE_TYPES.includes(type);
              return (
                <li key={type} className={`${cardClass} min-w-0`}>
                  <StatusBadge tone={selfServe ? 'teal' : 'neutral'}>{selfServe ? '可自助建立' : '客製報價'}</StatusBadge>
                  <p className="mt-3 font-semibold text-ink">{SITE_TYPE_LABELS[type]}</p>
                  {!selfServe && (
                    <Link href="/portal/support" className="mt-2 inline-block text-sm text-teal-strong hover:underline">
                      聯絡客服報價
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="template-heading">
          <h2 id="template-heading" className="mb-3 text-lg font-bold text-ink">
            2. 選擇版型
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Link href="/portal/redeem-code" className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
            兌換權限代碼
          </Link>
          <button type="button" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled>
            建立網站（尚未串接）
          </button>
        </div>
      </div>
    </>
  );
}
