'use client';

import type { LoginFormState } from '@syt/auth';
import { badgeClass, buttonClass } from '@syt/ui';
import { useActionState } from 'react';
import { TextInput } from '@/components/ui/fields';
import { AuthErrorMessage } from './AuthErrorMessage';

export interface DemoAccountOption {
  email: string;
  roleLabel: string;
  description: string;
}

export interface LoginFormProps {
  action: (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;
  next: string | null;
  mode: 'mock' | 'supabase' | 'unavailable';
  demoAccounts: DemoAccountOption[];
}

const initialState: LoginFormState = { error: null, email: '' };

export function LoginForm({ action, next, mode, demoAccounts }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const unavailable = mode === 'unavailable';

  return (
    <form action={formAction} className="grid min-w-0 gap-4">
      {next && <input type="hidden" name="next" value={next} />}
      {state.error && <AuthErrorMessage code={state.error} />}
      <TextInput label="Email" name="email" type="email" autoComplete="email" defaultValue={state.email} required disabled={unavailable} />
      <TextInput
        label="密碼"
        name="password"
        type="password"
        autoComplete="current-password"
        required={mode === 'supabase'}
        disabled={unavailable}
        hint={mode === 'mock' ? 'Mock 模式不驗證密碼，只接受下方示範帳號的 Email。' : undefined}
      />
      <button type="submit" className={buttonClass('primary', 'lg', 'w-full')} disabled={pending || unavailable}>
        {pending ? '登入中…' : '登入'}
      </button>

      {mode === 'mock' && demoAccounts.length > 0 && (
        <div className="grid min-w-0 gap-2 border-t border-border-gray pt-4">
          <p className="text-sm font-semibold text-ink">示範帳號（僅 Mock 模式）</p>
          <ul className="grid min-w-0 gap-2">
            {demoAccounts.map((account) => (
              <li key={account.email} className="min-w-0">
                <button
                  type="submit"
                  name="demo_email"
                  value={account.email}
                  formNoValidate
                  disabled={pending}
                  data-testid="demo-login"
                  className="flex w-full min-w-0 flex-col items-start gap-1 rounded-xl border border-border-gray px-3 py-2.5 text-left transition-colors hover:bg-mist-white disabled:opacity-60"
                >
                  <span className="flex w-full min-w-0 items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-ink">{account.email}</span>
                    <span className={badgeClass('teal')}>{account.roleLabel}</span>
                  </span>
                  <span className="text-xs text-slate-gray">{account.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
