'use client';

import { ACCESS_CODE_EXAMPLE } from '@syt/shared';
import { buttonClass, cardClass } from '@syt/ui';
import { useActionState } from 'react';
import { redeemAccessCodeAction, type RedeemFormState } from '@/app/portal/redeem-code/actions';
import { TextInput } from '@/components/ui/fields';
import { RedeemCodeResult } from './RedeemCodeResult';

export function RedeemCodeForm({ defaultCode = '', isAuthenticated }: { defaultCode?: string; isAuthenticated: boolean }) {
  const [state, formAction, pending] = useActionState<RedeemFormState, FormData>(redeemAccessCodeAction, { status: 'idle', code: defaultCode });

  return (
    <section className={`${cardClass} min-w-0`} aria-labelledby="redeem-heading">
      <h2 id="redeem-heading" className="text-lg font-bold text-ink">
        輸入權限代碼
      </h2>
      <p className="mt-1 text-sm text-slate-gray">
        代碼可在付款確認信或購買紀錄中找到。{isAuthenticated ? '兌換後會綁定目前登入的帳號。' : '送出後會先請你登入，登入完成會回到這個頁面。'}
      </p>
      <form action={formAction} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <TextInput
          key={state.code}
          label="權限代碼"
          name="code"
          id="access-code"
          defaultValue={state.code}
          placeholder={ACCESS_CODE_EXAMPLE}
          hint={`格式：SYT-產品代碼-年份-6 碼，例如 ${ACCESS_CODE_EXAMPLE}（不分大小寫）`}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          required
          className="font-mono uppercase"
        />
        <button type="submit" data-testid="redeem-submit" className={buttonClass('primary', 'md', 'w-full md:mt-7 md:w-auto')} disabled={pending}>
          {pending ? '兌換中…' : isAuthenticated ? '兌換代碼' : '登入並兌換'}
        </button>
      </form>

      {state.status !== 'idle' && (
        <div aria-live="polite" className="mt-4">
          <RedeemCodeResult status={state.status} />
        </div>
      )}
    </section>
  );
}
