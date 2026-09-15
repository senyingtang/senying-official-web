import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 瀏覽器 / 前台可用的 Supabase client。
 * 只接受 PUBLIC anon key；未設定時回傳 null，畫面改用 mock repository。
 */
export interface PublicSupabaseConfig {
  url: string | undefined;
  anonKey: string | undefined;
}

export function isSupabaseConfigured(config: PublicSupabaseConfig): config is { url: string; anonKey: string } {
  return Boolean(config.url?.trim() && config.anonKey?.trim());
}

export function createBrowserSupabaseClient(config: PublicSupabaseConfig): SupabaseClient | null {
  if (!isSupabaseConfigured(config)) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
