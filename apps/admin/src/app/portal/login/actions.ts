'use server';

import type { LoginFormState } from '@syt/auth';
import { performLogin } from '@/lib/auth/server';

/** 客戶後台登入：登入後導回 next（例如 /portal/redeem-code），預設 /portal/dashboard */
export async function portalLoginAction(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  return performLogin('portal', formData);
}
