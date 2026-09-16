/** Supabase repository 錯誤：保留 operation 與 Postgres / PostgREST code，訊息不含 token 或 key */
export class SupabaseRepositoryError extends Error {
  readonly operation: string;
  readonly code: string | null;

  constructor(operation: string, message: string, code: string | null = null) {
    super(`[${operation}] ${message}`);
    this.name = 'SupabaseRepositoryError';
    this.operation = operation;
    this.code = code;
  }
}

/** Phase 2 只接 auth / access code / workspace / site project；其他 repository 明確丟錯，不回傳假資料 */
export class NotImplementedInPhaseError extends Error {
  readonly operation: string;

  constructor(operation: string) {
    super(`${operation} 尚未接上 Supabase（規劃於 Phase 3）。請使用 DATA_SOURCE=mock 檢視此畫面。`);
    this.name = 'NotImplementedInPhaseError';
    this.operation = operation;
  }
}

/**
 * 權限不足：Postgres 42501（RLS with check / insufficient_privilege），或 RLS using 條件讓寫入影響 0 列。
 * 訊息固定，不帶資料內容。
 */
export class SupabasePermissionError extends SupabaseRepositoryError {
  constructor(operation: string) {
    super(operation, 'permission denied by row level security', '42501');
    this.name = 'SupabasePermissionError';
  }
}

/** repository 尚未接上 Supabase（Phase 3 模組）：畫面顯示「尚未啟用」，不可當成錯誤讓整頁 crash */
export function isNotImplementedError(error: unknown): boolean {
  return error instanceof NotImplementedInPhaseError || (error instanceof Error && error.name === 'NotImplementedInPhaseError');
}

export function isPermissionDeniedError(error: unknown): boolean {
  return error instanceof SupabasePermissionError || (error instanceof SupabaseRepositoryError && error.code === '42501');
}

interface PostgrestLikeError {
  message: string;
  code?: string;
}

export function unwrap<T>(operation: string, result: { data: T; error: PostgrestLikeError | null }): T {
  if (result.error) {
    if (result.error.code === '42501') throw new SupabasePermissionError(operation);
    throw new SupabaseRepositoryError(operation, result.error.message, result.error.code ?? null);
  }
  return result.data;
}
