import 'server-only';
import { isNotImplementedError, isPermissionDeniedError } from '@syt/database';

/**
 * Widget 級別的安全載入。
 *
 * 儀表板由多個模組組成，其中一部分（Commerce / 訂閱 / 部署）要到 Phase 3 才會接上 Supabase。
 * 這些 repository 會明確丟出 NotImplementedInPhaseError，不能因此讓整個 /admin/dashboard 變成 500，
 * 也不可以改用假數字冒充真實資料 —— 取而代之的是把該區塊標示為「尚未啟用」。
 */
export type LoadFailureReason = 'not_implemented' | 'permission' | 'error';

export type Loaded<T> = { ok: true; data: T } | { ok: false; reason: LoadFailureReason };

export async function safeLoad<T>(operation: string, loader: () => Promise<T>): Promise<Loaded<T>> {
  try {
    return { ok: true, data: await loader() };
  } catch (error) {
    if (isNotImplementedError(error)) return { ok: false, reason: 'not_implemented' };
    if (isPermissionDeniedError(error)) return { ok: false, reason: 'permission' };
    // 伺服器端記錄錯誤類型（不含資料內容），畫面只顯示一般訊息
    console.error(`[dashboard] ${operation} failed: ${error instanceof Error ? `${error.name}: ${error.message.slice(0, 200)}` : 'UnknownError'}`);
    return { ok: false, reason: 'error' };
  }
}
