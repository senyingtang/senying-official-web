'use server';

import { adminRouteMode, canAdmin } from '@syt/auth';
import { isPermissionDeniedError, isSlugConflictError, SupabaseRepositoryError } from '@syt/database';
import { validateCaseStudyInput } from '@syt/database/cms-content';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth/guards';
import { parseCaseStudyForm, type ContentFormState } from '@/lib/cms/form';

const ROUTE = '/admin/cms/cases';

/**
 * 案例 CRUD。
 * owner / admin / editor 可寫（cms_content）；viewer 唯讀；author 不在此路由的可進入角色內。
 * DB RLS（case_studies_editor_manage：can_publish_content）為最後防線。
 */
async function requireWriter() {
  const { session, repos } = await requireAdminPage(ROUTE);
  const canManage = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');
  if (!canManage) return { repos, denied: { status: 'forbidden' as const, message: '你的角色只能檢視案例，不能修改。', errors: {} } };
  return { repos, denied: null };
}

function failure(error: unknown, operation: string): ContentFormState {
  if (isSlugConflictError(error)) return { status: 'conflict', message: '這個 slug 已經有其他案例使用，請換一個。', errors: { slug: 'slug 必須唯一' } };
  if (isPermissionDeniedError(error)) return { status: 'forbidden', message: '資料庫拒絕寫入：你的角色沒有這項內容的修改權限。', errors: {} };
  const name = error instanceof Error ? error.name : 'UnknownError';
  const code = error instanceof SupabaseRepositoryError ? error.code : null;
  console.error(`[cms.case] ${operation} failed: ${name} code=${code ?? 'none'}`);
  return { status: 'error', message: '儲存失敗，請稍後再試。', errors: {} };
}

export async function saveCaseStudyAction(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const id = String(formData.get('id') ?? '').trim();
  const { repos, denied } = await requireWriter();
  if (denied) return denied;

  const input = parseCaseStudyForm(formData);
  const validation = validateCaseStudyInput(input);
  if (!validation.ok) return { status: 'invalid', message: '部分欄位需要修正，尚未儲存。', errors: validation.errors };

  let createdId: string | null = null;
  try {
    const result = id ? await repos.cmsCases.update(id, input) : await repos.cmsCases.create(input);
    await repos.marketingRebuild.trigger(`案例「${input.title}」已更新`).catch(() => undefined);
    if (!id) createdId = result.id;
    if (!result.persisted) {
      revalidatePath(ROUTE);
      return { status: 'mock', message: 'Mock 模式：欄位驗證通過，內容只暫存在記憶體，不會寫入資料庫。', errors: {}, savedId: result.id };
    }
  } catch (error) {
    return failure(error, id ? 'update' : 'create');
  }

  revalidatePath(ROUTE);
  revalidatePath('/admin/dashboard');
  if (createdId) redirect(`${ROUTE}/${createdId}?saved=1`);
  return { status: 'saved', message: '已儲存。官網為靜態網站，重新建置後才會套用新內容。', errors: {} };
}

export async function transitionCaseStudyAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  const intent = String(formData.get('intent') ?? '');
  const { repos, denied } = await requireWriter();
  if (denied || !id) redirect(`${ROUTE}?error=forbidden`);
  if (intent !== 'publish' && intent !== 'unpublish' && intent !== 'archive') redirect(`${ROUTE}?error=unknown_intent`);

  // redirect() 以例外實作，必須放在 try 之外，否則會被下面的 catch 攔截
  let outcome: string | null = null;
  try {
    if (intent === 'publish') await repos.cmsCases.publish(id);
    else if (intent === 'unpublish') await repos.cmsCases.unpublish(id);
    else await repos.cmsCases.archive(id);
    await repos.marketingRebuild.trigger(`案例狀態變更（${intent}）`).catch(() => undefined);
  } catch (error) {
    outcome = isPermissionDeniedError(error) ? 'forbidden' : 'failed';
    console.error(`[cms.case] ${intent} failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
  }
  revalidatePath(ROUTE);
  revalidatePath('/admin/dashboard');
  redirect(outcome ? `${ROUTE}?error=${outcome}` : `${ROUTE}?done=${intent}`);
}
