import { createClient } from '@supabase/supabase-js';
import type { SupabaseDataSourceConfig } from './data-source';
import type { CommerceCatalogRepository } from './repositories';
import { createSupabaseCommerceRepositories } from './supabase/commerce-repositories';

/**
 * 官網（Astro static build）以 anon key 讀取公開商品目錄與啟用中的付款方式。
 *
 * - 只使用 PUBLIC anon key：get_purchasable_products / get_enabled_payment_methods 都是 SECURITY DEFINER，
 *   只回傳「已發布、可自助購買、價格啟用」的資料，不會外流金流設定或 secret_refs
 * - 不使用 service role、不保存 session
 * - 讀取失敗時丟出錯誤讓 build 失敗，不改用 mock 目錄
 */
export function createPublicCommerceReaders(config: SupabaseDataSourceConfig): { catalog: CommerceCatalogRepository } {
  const client = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  return { catalog: createSupabaseCommerceRepositories(client).catalog };
}
