/**
 * 伺服器啟動時驗證資料來源設定。
 * DATA_SOURCE=supabase 缺少 PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY 時直接丟出錯誤，不會默默改用 mock。
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { resolveDataSourceConfig } = await import('@syt/database/data-source');
  const config = resolveDataSourceConfig(process.env);
  // eslint-disable-next-line no-console
  console.info(`[syt] DATA_SOURCE=${config.kind}`);
}
