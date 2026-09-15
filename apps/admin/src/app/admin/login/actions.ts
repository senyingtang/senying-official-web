'use server';

import type { LoginFormState } from '@syt/auth';
import { performLogin } from '@/lib/auth/server';

/** 官方後台登入：登入後確認 admin_profiles 角色，不是後台成員 → /admin/login?error=not_admin */
export async function adminLoginAction(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  return performLogin('admin', formData);
}
