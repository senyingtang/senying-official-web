import { createBrowserSupabaseClient } from '@syt/database/client';

/**
 * 前台 Supabase client placeholder。
 * 只使用 PUBLIC anon key，資料權限交給 RLS；未設定時回傳 null（Phase 1 前台全部使用靜態內容）。
 * ⚠️ 前台絕對不可讀取 service role key（伺服器專用金鑰）。
 */
export function getPublicSupabase() {
  return createBrowserSupabaseClient({
    url: import.meta.env.PUBLIC_SUPABASE_URL,
    anonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
  });
}
