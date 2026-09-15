import { AUTH_ERROR_MESSAGES, isAuthErrorCode } from '@syt/auth';
import { Notice } from '@/components/ui/Notice';

/** 顯示登入 / 權限錯誤碼對應的訊息；未知錯誤碼不顯示（不直接輸出網址參數內容） */
export function AuthErrorMessage({ code }: { code: string | null | undefined }) {
  if (!isAuthErrorCode(code)) return null;
  const message = AUTH_ERROR_MESSAGES[code];
  return (
    <div role={message.tone === 'danger' ? 'alert' : 'status'} data-testid="auth-error" data-code={code} className="min-w-0 break-words">
      <Notice tone={message.tone} title={message.title}>
        {message.description}
      </Notice>
    </div>
  );
}
