import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseDataSourceConfig } from '@syt/database/data-source';
import { cookies } from 'next/headers';

/**
 * 使用者 session 的 Supabase client（anon key + Supabase Auth cookie，RLS 生效）。
 * - 每個 request 建立新的 client，不可跨 request 共用
 * - Server Component render 期間無法寫 cookie：token refresh 由 proxy.ts 處理；Server Action 可寫入
 * - 不使用 service role key（只在 service-role.ts 讀取）
 */
export async function createUserSupabaseClient(config: SupabaseDataSourceConfig) {
  const cookieStore = await cookies();
  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Component 無法寫 cookie；由 proxy.ts 更新 session
        }
      },
    },
  });
}
