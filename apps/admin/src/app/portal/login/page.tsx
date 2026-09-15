import { sanitizeNextPath, WORKSPACE_ROLE_LABELS } from '@syt/auth';
import { MOCK_ACCOUNTS } from '@syt/database';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginCard } from '@/components/auth/LoginCard';
import { logoutAction } from '@/lib/auth/actions';
import { firstParam } from '@/lib/auth/redirects';
import { getPortalContext } from '@/lib/auth/server';
import { tryGetDataSourceConfig } from '@/lib/config';
import { portalLoginAction } from './actions';

export const metadata: Metadata = { title: '客戶後台登入' };

const DEMO_ACCOUNTS = MOCK_ACCOUNTS.filter((account) => account.adminRole === null).map((account) => {
  const membership = account.memberships[0];
  return {
    email: account.email,
    roleLabel: membership ? WORKSPACE_ROLE_LABELS[membership.role] : '未開通',
    description: account.description,
  };
});

export default async function PortalLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const next = sanitizeNextPath(firstParam(params.next), 'portal');
  const configState = tryGetDataSourceConfig();
  const portal = configState.ok ? await getPortalContext() : null;
  if (portal?.session) redirect(next ?? '/portal/dashboard');

  return (
    <LoginCard
      title="登入建站後台"
      description="登入後可以兌換權限代碼、建立網站與編輯內容。"
      mode={configState.ok ? configState.config.kind : 'unavailable'}
      configMessage={configState.ok ? null : configState.message}
      action={portalLoginAction}
      next={next}
      errorCode={firstParam(params.error)}
      demoAccounts={DEMO_ACCOUNTS}
      footer={
        <div className="mt-5 grid gap-3 text-sm">
          {portal?.user && (
            <form action={logoutAction} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-mist-white px-3 py-2">
              <input type="hidden" name="area" value="portal" />
              <span className="min-w-0 break-all text-slate-gray">目前登入：{portal.user.email}</span>
              <button type="submit" className="font-medium text-teal-strong hover:underline">
                登出並切換帳號
              </button>
            </form>
          )}
          <p className="text-center text-slate-gray">
            已收到權限代碼？
            <Link href="/portal/redeem-code" className="ml-1 font-medium text-teal-strong hover:underline">
              前往兌換
            </Link>
          </p>
        </div>
      }
    />
  );
}
