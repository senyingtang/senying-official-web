import type { LoginFormState } from '@syt/auth';
import { badgeClass, cardClass } from '@syt/ui';
import type { ReactNode } from 'react';
import { Notice } from '@/components/ui/Notice';
import { AuthErrorMessage } from './AuthErrorMessage';
import { LoginForm, type DemoAccountOption } from './LoginForm';

export interface LoginCardProps {
  title: string;
  description: string;
  /** unavailable：DATA_SOURCE 設定錯誤，停用登入並顯示原因 */
  mode: 'mock' | 'supabase' | 'unavailable';
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  next: string | null;
  errorCode?: string | null;
  configMessage?: string | null;
  demoAccounts?: DemoAccountOption[];
  footer?: ReactNode;
}

export function LoginCard({ title, description, mode, action, next, errorCode, configMessage, demoAccounts = [], footer }: LoginCardProps) {
  return (
    <main className="flex min-h-dvh items-center bg-mist-white px-4 py-10">
      <div className="mx-auto w-full min-w-0 max-w-md">
        <p className="text-center text-sm font-semibold tracking-wide text-teal-strong">森映 SEN YING</p>
        <section className={`${cardClass} mt-3 min-w-0`} aria-labelledby="login-heading" data-testid="login-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 id="login-heading" className="min-w-0 break-words text-xl font-bold text-ink sm:text-2xl">
              {title}
            </h1>
            {mode === 'mock' && <span className={badgeClass('warning')}>Mock 模式</span>}
          </div>
          <p className="mt-1 text-sm text-slate-gray">{description}</p>
          {errorCode && (
            <div className="mt-4">
              <AuthErrorMessage code={errorCode} />
            </div>
          )}
          {mode === 'unavailable' && (
            <div className="mt-4 break-words">
              <Notice tone="danger" title="資料來源設定錯誤">
                {configMessage ?? '請確認 DATA_SOURCE 設定。'}
              </Notice>
            </div>
          )}
          <div className="mt-6">
            <LoginForm action={action} next={next} mode={mode} demoAccounts={demoAccounts} />
          </div>
          {footer}
        </section>
      </div>
    </main>
  );
}
