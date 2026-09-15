import 'server-only';
import { createServiceRoleClient } from '@syt/database/server';

/**
 * Service role client（繞過 RLS）。
 * ⚠️ 整個 repo 中唯一讀取 SUPABASE_SERVICE_ROLE_KEY 的應用程式檔案；`server-only` 確保不會被打包進瀏覽器。
 * - Phase 2 沒有任何頁面、proxy 或登入流程使用它
 * - 保留給 webhook、排程、受控的森映 admin 操作（Phase 3+），使用前必須先通過 requireAdminPage
 * - 一般查詢一律使用 lib/supabase/server.ts 的「使用者 session」client（RLS 生效）
 */
export function getServiceRoleSupabase() {
  return createServiceRoleClient({
    url: process.env.PUBLIC_SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
