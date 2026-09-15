/**
 * 資料來源設定解析（無其他 import，可直接被 Node 驗收腳本載入）。
 *
 * - DATA_SOURCE 未設定或 mock → mock repository，不需要 Supabase env
 * - DATA_SOURCE=supabase → 必須有 PUBLIC_SUPABASE_URL 與 PUBLIC_SUPABASE_ANON_KEY，缺少就丟出錯誤
 * - 其他值（例如打錯字）→ 丟出錯誤
 * 絕不在設定錯誤時默默改用 mock，避免誤以為已接上真實資料。
 */
export type DataSourceKind = 'mock' | 'supabase';

export interface MockDataSourceConfig {
  kind: 'mock';
}

export interface SupabaseDataSourceConfig {
  kind: 'supabase';
  url: string;
  anonKey: string;
}

export type DataSourceConfig = MockDataSourceConfig | SupabaseDataSourceConfig;

export class DataSourceConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DataSourceConfigError';
  }
}

export function resolveDataSourceConfig(env: Record<string, string | undefined>): DataSourceConfig {
  const raw = (env.DATA_SOURCE ?? '').trim();
  if (raw === '' || raw === 'mock') return { kind: 'mock' };
  if (raw !== 'supabase') {
    throw new DataSourceConfigError(`Invalid DATA_SOURCE="${raw}". Use "mock" or "supabase".`);
  }
  const url = (env.PUBLIC_SUPABASE_URL ?? '').trim();
  const anonKey = (env.PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  const missing = [url ? null : 'PUBLIC_SUPABASE_URL', anonKey ? null : 'PUBLIC_SUPABASE_ANON_KEY'].filter((item): item is string => item !== null);
  if (missing.length > 0) {
    throw new DataSourceConfigError(`DATA_SOURCE=supabase requires ${missing.join(' and ')}. Refusing to fall back to mock data.`);
  }
  if (!/^https?:\/\//.test(url)) {
    throw new DataSourceConfigError('PUBLIC_SUPABASE_URL must start with http:// or https://.');
  }
  return { kind: 'supabase', url: url.replace(/\/+$/, ''), anonKey };
}
