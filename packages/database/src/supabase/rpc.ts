import type { SupabaseClient } from '@supabase/supabase-js';
import { RPC } from '../tables';
import { SupabaseRepositoryError } from './errors';

/**
 * DB SQL v2.0 RPC 呼叫邊界（函式名稱來自 tables.ts 的 RPC 對照）。
 * 一律使用「使用者 session」的 client：函式內以 auth.uid() 判斷身分，RLS 與 SECURITY DEFINER 規則生效。
 */

export interface AccessCodeRpcResult {
  ok: boolean;
  result: string;
  workspaceId: string | null;
  accessCodeId: string | null;
  userEntitlementId: string | null;
  productCode: string | null;
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value : null;
}

function parseAccessCodeResult(operation: string, data: unknown): AccessCodeRpcResult {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SupabaseRepositoryError(operation, 'unexpected RPC response shape');
  }
  const record = data as Record<string, unknown>;
  return {
    ok: record.ok === true,
    result: readString(record, 'result') ?? 'unknown',
    workspaceId: readString(record, 'workspace_id'),
    accessCodeId: readString(record, 'access_code_id'),
    userEntitlementId: readString(record, 'user_entitlement_id'),
    productCode: readString(record, 'product_code'),
  };
}

/** create_workspace_from_access_code(code, workspace_name)：兌換 + 建立 workspace（冪等） */
export async function rpcCreateWorkspaceFromAccessCode(client: SupabaseClient, code: string, workspaceName?: string): Promise<AccessCodeRpcResult> {
  const operation = RPC.createWorkspaceFromAccessCode;
  const { data, error } = await client.rpc(operation, workspaceName ? { code, workspace_name: workspaceName } : { code });
  if (error) throw new SupabaseRepositoryError(operation, error.message, error.code ?? null);
  return parseAccessCodeResult(operation, data);
}

/** redeem_access_code(code)：只兌換，不建立 workspace */
export async function rpcRedeemAccessCode(client: SupabaseClient, code: string): Promise<AccessCodeRpcResult> {
  const operation = RPC.redeemAccessCode;
  const { data, error } = await client.rpc(operation, { code });
  if (error) throw new SupabaseRepositoryError(operation, error.message, error.code ?? null);
  return parseAccessCodeResult(operation, data);
}

/** generate_dns_instruction(domain)：DNS 指示（驗證碼只回給網站成員） */
export async function rpcGenerateDnsInstruction(client: SupabaseClient, domain: string): Promise<Record<string, unknown>> {
  const operation = RPC.generateDnsInstruction;
  const { data, error } = await client.rpc(operation, { domain });
  if (error) throw new SupabaseRepositoryError(operation, error.message, error.code ?? null);
  if (!data || typeof data !== 'object') throw new SupabaseRepositoryError(operation, 'unexpected RPC response shape');
  return data as Record<string, unknown>;
}
