import { NextResponse, type NextRequest } from 'next/server';
import { handleProviderCallback } from '@/lib/payments/service';

/**
 * 金流 provider callback（Phase 3.0）。
 *
 * 所有 provider 共用同一條路徑：驗簽 → commerce_webhook_events（idempotency_key 唯一）→
 * mark_payment_success_and_issue_entitlement。重送同一個事件不會重複發碼。
 *
 * 這個端點不需要登入（provider 伺服器呼叫），安全性完全來自簽章驗證：
 * 驗簽失敗一律拒絕，只留下一筆 signature_valid = false 的紀錄。
 */

export const dynamic = 'force-dynamic';

const FORWARD_HEADERS = ['x-sandbox-signature', 'x-line-authorization', 'x-line-authorization-nonce', 'content-type'];

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const body = await request.text();
  const headers: Record<string, string> = {};
  for (const name of FORWARD_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }
  const query = Object.fromEntries(request.nextUrl.searchParams.entries());

  const result = await handleProviderCallback(provider, { body, headers, query });
  return NextResponse.json(
    { status: result.status, message: result.message, changed: result.changed },
    { status: result.httpStatus, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
  );
}
