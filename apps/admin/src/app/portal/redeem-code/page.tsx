import { loginPath, WORKSPACE_ROLE_LABELS } from '@syt/auth';
import { isAccessCodeFormat, isRedeemStatus, REDEEM_STATUS_MESSAGES, type RedeemStatus } from '@syt/shared';
import { badgeClass, buttonClass, cardClass } from '@syt/ui';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { AuthErrorMessage } from '@/components/auth/AuthErrorMessage';
import { SessionStatusCard } from '@/components/auth/SessionStatusCard';
import { RedeemCodeForm } from '@/components/portal/RedeemCodeForm';
import { RedeemCodeResult } from '@/components/portal/RedeemCodeResult';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PENDING_REDEEM_COOKIE } from '@/lib/auth/cookies';
import { firstParam } from '@/lib/auth/redirects';
import { getPortalContext } from '@/lib/auth/server';
import { tryGetDataSourceConfig } from '@/lib/config';

export const metadata: Metadata = { title: '兌換權限代碼' };

const LOGIN_HREF = loginPath('portal', { next: '/portal/redeem-code' });

const RESULT_GUIDE: RedeemStatus[] = ['valid', 'invalid', 'expired', 'already_redeemed_by_other_user', 'revoked', 'rate_limited'];
const BADGE_TONE = { success: 'success', info: 'teal', warning: 'warning', danger: 'danger' } as const;

const MOCK_CODES = [
  { code: 'SYT-SEO-2026-A8K3Q9', label: '可兌換' },
  { code: 'SYT-LP-2026-P7X2M4', label: 'customer 本人已兌換' },
  { code: 'SYT-SEO-2026-R7T4W2', label: '其他帳號已兌換' },
  { code: 'SYT-DM-2026-H4M8T2', label: '已過期' },
  { code: 'SYT-AI-2026-N3Q8Z5', label: '已撤銷' },
  { code: 'SYT-SEO-2026-ZZZZZZ', label: '不存在' },
];

/**
 * 公開頁面：未登入也可以開啟並輸入代碼；送出兌換時才要求登入（登入後回到本頁並帶回代碼）。
 */
export default async function RedeemCodePage({ searchParams }: { searchParams: Promise<{ result?: string | string[]; reason?: string | string[] }> }) {
  const params = await searchParams;
  const result = firstParam(params.result);
  const configState = tryGetDataSourceConfig();
  const session = configState.ok ? (await getPortalContext()).session : null;
  const pendingCode = (await cookies()).get(PENDING_REDEEM_COOKIE)?.value ?? '';
  const defaultCode = session && isAccessCodeFormat(pendingCode) ? pendingCode : '';
  const isMock = configState.ok && configState.config.kind === 'mock';
  const membership = session?.memberships[0];

  return (
    <main className="min-h-dvh bg-mist-white px-4 py-8 md:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href={membership ? '/portal/dashboard' : '/'} className="font-bold text-ink">
            森映建站後台
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            {isMock && <span className={badgeClass('warning')}>Mock 模式</span>}
            {membership && (
              <Link href="/portal/dashboard" className={buttonClass('secondary', 'sm')}>
                回到總覽
              </Link>
            )}
          </div>
        </div>

        <PageHeader title="兌換權限代碼" description="兌換後系統會建立工作區，並依方案開通網站額度。第一版每組代碼可以建立 1 個網站。" />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="grid min-w-0 content-start gap-4">
            {!configState.ok && <AuthErrorMessage code="config_error" />}
            {firstParam(params.reason) === 'no_workspace' && <AuthErrorMessage code="no_workspace" />}
            {configState.ok && !session && (
              <RedeemCodeResult
                status="not_authenticated"
                action={
                  <Link href={LOGIN_HREF} className={buttonClass('primary', 'sm')}>
                    登入
                  </Link>
                }
              />
            )}
            {session && isRedeemStatus(result) && (
              <RedeemCodeResult
                status={result}
                action={
                  result === 'valid' ? (
                    <Link href="/portal/sites/new" className={buttonClass('primary', 'sm')}>
                      開始建立網站
                    </Link>
                  ) : undefined
                }
              />
            )}
            <RedeemCodeForm defaultCode={defaultCode} isAuthenticated={Boolean(session)} />
            <Notice title="兌換前可以轉讓">代碼兌換前可以轉讓給實際使用網站的人；兌換後會綁定兌換的帳號，無法再轉讓。</Notice>
          </div>

          <aside className="grid min-w-0 content-start gap-4">
            <SessionStatusCard
              area="portal"
              user={session?.user ?? null}
              roleLabel={membership ? WORKSPACE_ROLE_LABELS[membership.role] : null}
              workspaceName={membership?.workspaceName ?? null}
              isMock={isMock}
              loginHref={LOGIN_HREF}
            />
            <section className={`${cardClass} min-w-0`}>
              <h2 className="text-base font-bold text-ink">可能出現的結果</h2>
              <ul className="mt-3 grid gap-3">
                {RESULT_GUIDE.map((status) => (
                  <li key={status} className="flex min-w-0 flex-col items-start gap-1">
                    <StatusBadge tone={BADGE_TONE[REDEEM_STATUS_MESSAGES[status].tone]}>{REDEEM_STATUS_MESSAGES[status].title}</StatusBadge>
                    <span className="text-sm text-slate-gray">{REDEEM_STATUS_MESSAGES[status].description}</span>
                  </li>
                ))}
              </ul>
            </section>
            {isMock && (
              <section className={`${cardClass} min-w-0`}>
                <h2 className="text-base font-bold text-ink">Mock 測試代碼</h2>
                <ul className="mt-3 grid gap-2">
                  {MOCK_CODES.map((item) => (
                    <li key={item.code} className="min-w-0">
                      <span className="block break-all font-mono text-xs text-ink">{item.code}</span>
                      <span className="text-xs text-slate-gray">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
