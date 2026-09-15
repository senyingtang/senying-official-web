import 'server-only';
import { DataSourceConfigError, resolveDataSourceConfig, type DataSourceConfig } from '@syt/database/data-source';

/**
 * 資料來源設定（每次讀取 runtime env）。
 * DATA_SOURCE=supabase 缺少 PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY 時丟出 DataSourceConfigError，不會改用 mock。
 */
export function getDataSourceConfig(): DataSourceConfig {
  return resolveDataSourceConfig(process.env);
}

export type DataSourceConfigState = { ok: true; config: DataSourceConfig } | { ok: false; message: string };

/** 登入頁等公開頁面使用：設定錯誤時顯示明確錯誤訊息，而不是整頁崩潰 */
export function tryGetDataSourceConfig(): DataSourceConfigState {
  try {
    return { ok: true, config: getDataSourceConfig() };
  } catch (error) {
    if (error instanceof DataSourceConfigError) return { ok: false, message: error.message };
    throw error;
  }
}
