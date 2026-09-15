import type { ReactNode } from 'react';
import { AdminShell } from '@/components/shell/AdminShell';
import { requireAdminSession } from '@/lib/auth/guards';

/** layout 層 guard：已登入 + admin_profiles 角色。各 page 另外呼叫 requireAdminPage 檢查路由權限。 */
export default async function AdminConsoleLayout({ children }: { children: ReactNode }) {
  const { session } = await requireAdminSession();
  return <AdminShell session={session}>{children}</AdminShell>;
}
