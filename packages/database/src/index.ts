import type { SupabaseClient } from '@supabase/supabase-js';
import { DataSourceConfigError, type DataSourceConfig } from './data-source';
import { createMockRepositories } from './mock/repositories';
import type { Repositories, RepositoryContext } from './repositories';
import { createSupabaseRepositories } from './supabase/repositories';

export * from './tables';
export type * from './models';
export type * from './repositories';
export type { Database, Json } from './types/database.types';
export * from './data-source';
export * from './site-settings';
export { createMockRepositories } from './mock/repositories';
export { createSupabaseRepositories } from './supabase/repositories';
export { MOCK_ACCOUNTS, MOCK_WORKSPACES, findMockAccountByEmail, findMockAccountById, type MockAccount } from './mock/identities';
export { isPermissionDeniedError, NotImplementedInPhaseError, SupabasePermissionError, SupabaseRepositoryError } from './supabase/errors';
export { rpcCreateWorkspaceFromAccessCode, rpcGenerateDnsInstruction, rpcRedeemAccessCode, type AccessCodeRpcResult } from './supabase/rpc';

/**
 * 依資料來源建立 repository。
 * supabase 模式必須傳入「使用者 session」client（由 app 的 server-only 模組建立）；不接受 service role client 作為一般資料來源。
 */
export function createRepositories(config: DataSourceConfig, context: RepositoryContext & { supabase?: SupabaseClient } = {}): Repositories {
  if (config.kind === 'mock') return createMockRepositories({ viewer: context.viewer });
  if (!context.supabase) {
    throw new DataSourceConfigError('DATA_SOURCE=supabase requires a user-scoped Supabase client.');
  }
  return createSupabaseRepositories(context.supabase, { viewer: context.viewer });
}
