import { createClient } from '@supabase/supabase-js';
import type { SupabaseDataSourceConfig } from './data-source';
import { SITE_SETTING_KEYS, siteSettingsFromRows, type MarketingSiteSettings } from './site-settings';
import { TABLES } from './tables';

/**
 * 官網（Astro static build）讀取公開的全站設定。
 * 只使用 anon key：RLS policy site_public_read 限制為 is_public = true；不使用 service role、不保存 session。
 * 讀取失敗時丟出錯誤讓 build 失敗，不改用 mock 設定。
 */
export async function readPublicMarketingSiteSettings(config: SupabaseDataSourceConfig): Promise<MarketingSiteSettings> {
  const client = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client
    .from(TABLES.cms.siteSettings)
    .select('setting_key, setting_value')
    .in('setting_key', Object.values(SITE_SETTING_KEYS))
    .eq('is_public', true);
  if (error) throw new Error(`Failed to read public site settings: ${error.message}`);
  const rows = Array.isArray(data) ? data : [];
  return siteSettingsFromRows(rows.map((row) => ({ setting_key: String(row.setting_key), setting_value: row.setting_value })));
}
