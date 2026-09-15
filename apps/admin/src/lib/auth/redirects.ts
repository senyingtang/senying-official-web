import 'server-only';
import { loginPath, type AuthArea, type AuthErrorCode } from '@syt/auth';
import { redirect } from 'next/navigation';

export { defaultHomePath, loginPath, sanitizeNextPath } from '@syt/auth';

/** searchParams 可能是陣列，只取第一個值 */
export function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function redirectToLogin(area: AuthArea, options: { next?: string | null; error?: AuthErrorCode } = {}): never {
  redirect(loginPath(area, options));
}
