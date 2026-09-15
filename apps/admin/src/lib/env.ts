import 'server-only';
import { normalizeBaseUrl } from '@syt/shared';

/**
 * 伺服器端一般環境變數。
 * - 不含 service role key（只在 lib/supabase/service-role.ts 讀取）
 * - DATA_SOURCE 與 Supabase 連線設定由 lib/config.ts 解析（缺少時明確失敗）
 */
export const serverEnv = {
  platformSubdomainRoot: process.env.PLATFORM_SUBDOMAIN_ROOT?.trim() || null,
  lineOaUrl: process.env.PUBLIC_LINE_OA_URL?.trim() || null,
  sitePublicUrl: normalizeBaseUrl(process.env.SITE_PUBLIC_URL),
  adminPublicUrl: normalizeBaseUrl(process.env.ADMIN_PUBLIC_URL),
};
