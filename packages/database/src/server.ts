import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 伺服器端 Supabase client。
 * ⚠️ 禁止在瀏覽器、Astro client script、React client component import 本檔。
 *    Next.js 請透過 apps/admin/src/lib/supabase/server.ts（含 `server-only`）使用。
 */

function assertServerRuntime(): void {
  if (typeof window !== 'undefined') {
    throw new Error('@syt/database/server must not be imported in the browser.');
  }
}

export interface ServerSupabaseConfig {
  url: string | undefined;
  anonKey: string | undefined;
  /** 使用者 access token（來自 Supabase Auth cookie），讓查詢以使用者身分經過 RLS */
  accessToken?: string;
}

/** 以使用者身分查詢（RLS 生效）。未設定時回傳 null。 */
export function createServerSupabaseClient(config: ServerSupabaseConfig): SupabaseClient | null {
  assertServerRuntime();
  if (!config.url?.trim() || !config.anonKey?.trim()) return null;
  return createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: config.accessToken ? { headers: { Authorization: `Bearer ${config.accessToken}` } } : undefined,
  });
}

export interface ServiceRoleConfig {
  url: string | undefined;
  serviceRoleKey: string | undefined;
}

/**
 * Service role client：繞過 RLS，只用於 webhook、排程、森映 admin 的受控操作。
 * 未設定時丟出錯誤（不回傳 null，避免靜默改用其他權限）。
 */
export function createServiceRoleClient(config: ServiceRoleConfig): SupabaseClient {
  assertServerRuntime();
  if (!config.url?.trim() || !config.serviceRoleKey?.trim()) {
    throw new Error('Service role client is not configured (SUPABASE_SERVICE_ROLE_KEY is empty).');
  }
  return createClient(config.url, config.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
