'use server';

import type { AuthArea } from '@syt/auth';
import { redirectToLogin } from './redirects';
import { signOut } from './server';

/** 登出：清除 session（mock cookie 或 Supabase Auth），導回對應登入頁 */
export async function logoutAction(formData: FormData): Promise<void> {
  const area: AuthArea = formData.get('area') === 'admin' ? 'admin' : 'portal';
  await signOut();
  redirectToLogin(area, { error: 'logged_out' });
}
