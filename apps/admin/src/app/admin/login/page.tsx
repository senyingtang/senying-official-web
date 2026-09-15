import { CMS_ADMIN_ROLE_LABELS, sanitizeNextPath } from '@syt/auth';
import { MOCK_ACCOUNTS } from '@syt/database';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LoginCard } from '@/components/auth/LoginCard';
import { logoutAction } from '@/lib/auth/actions';
import { firstParam } from '@/lib/auth/redirects';
import { getAdminContext } from '@/lib/auth/server';
import { tryGetDataSourceConfig } from '@/lib/config';
import { adminLoginAction } from './actions';

export const metadata: Metadata = { title: '官方後台登入' };

const DEMO_ACCOUNTS = MOCK_ACCOUNTS.filter((account) => account.adminRole !== null || account.email === 'customer@example.com').map((account) => ({
  email: account.email,
  roleLabel: account.adminRole ? CMS_ADMIN_ROLE_LABELS[account.adminRole] : '非後台成員',
  description: account.description,
}));

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  const params = await searchParams;
  const next = sanitizeNextPath(firstParam(params.next), 'admin');
  const configState = tryGetDataSourceConfig();
  const admin = configState.ok ? await getAdminContext() : null;
  if (admin?.session) redirect(next ?? '/admin/dashboard');

  return (
    <LoginCard
      title="森映官方後台登入"
      description="限 admin_profiles 中啟用的後台帳號（owner / admin / editor / author / viewer）。"
      mode={configState.ok ? configState.config.kind : 'unavailable'}
      configMessage={configState.ok ? null : configState.message}
      action={adminLoginAction}
      next={next}
      errorCode={firstParam(params.error)}
      demoAccounts={DEMO_ACCOUNTS}
      footer={
        <div className="mt-5 grid gap-3 text-sm">
          {admin?.user && (
            <form action={logoutAction} className="flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl bg-mist-white px-3 py-2">
              <input type="hidden" name="area" value="admin" />
              <span className="min-w-0 break-all text-slate-gray">目前登入：{admin.user.email}</span>
              <button type="submit" className="font-medium text-teal-strong hover:underline">
                登出並切換帳號
              </button>
            </form>
          )}
          <p className="text-center text-slate-gray">
            客戶請改用
            <Link href="/portal/login" className="ml-1 font-medium text-teal-strong hover:underline">
              客戶後台登入
            </Link>
          </p>
        </div>
      }
    />
  );
}
