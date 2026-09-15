import { createBrowserSupabaseClient } from '@syt/database/client';

/** 瀏覽器 Supabase client placeholder：只使用 anon key（next.config env 注入），未設定時回傳 null */
export function getBrowserSupabase() {
  return createBrowserSupabaseClient({
    url: process.env.PUBLIC_SUPABASE_URL,
    anonKey: process.env.PUBLIC_SUPABASE_ANON_KEY,
  });
}
