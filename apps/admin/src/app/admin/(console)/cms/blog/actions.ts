'use server';

import { adminRouteMode, canAdmin } from '@syt/auth';
import { isPermissionDeniedError, isSlugConflictError, SupabaseRepositoryError } from '@syt/database';
import { validateBlogPostInput } from '@syt/database/cms-content';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/lib/auth/guards';
import { parseBlogPostForm, type ContentFormState } from '@/lib/cms/form';

const ROUTE = '/admin/cms/blog';

/**
 * 文章 CRUD。
 * 權限在伺服器端再檢查一次（UI disabled 不是安全控制）：
 *   owner / admin / editor：完整 CRUD
 *   author：只能建立與編輯未發布的文章（DB RLS posts_author_insert / posts_author_update 為最後防線）
 *   viewer / customer：不可寫入
 */
async function requireWriter(options: { publishing: boolean }): Promise<{ repos: Awaited<ReturnType<typeof requireAdminPage>>['repos']; canManage: boolean; denied: ContentFormState | null }> {
  const { session, repos } = await requireAdminPage(ROUTE);
  const canManage = adminRouteMode(session.role, ROUTE) === 'manage' && canAdmin(session.role, 'cms_content', 'update');
  const canAuthor = canAdmin(session.role, 'blog_own', 'create');
  if (!canManage && !canAuthor) {
    return { repos, canManage, denied: { status: 'forbidden', message: '你的角色只能檢視文章，不能修改。', errors: {} } };
  }
  if (options.publishing && !canManage) {
    return { repos, canManage, denied: { status: 'forbidden', message: '你的角色可以建立與編輯草稿，但不能發布或下架文章。', errors: { status: '需要編輯以上的角色才能發布' } } };
  }
  return { repos, canManage, denied: null };
}

function failure(error: unknown, operation: string): ContentFormState {
  if (isSlugConflictError(error)) return { status: 'conflict', message: '這個 slug 已經有其他文章使用，請換一個。', errors: { slug: 'slug 必須唯一' } };
  if (isPermissionDeniedError(error)) return { status: 'forbidden', message: '資料庫拒絕寫入：你的角色沒有這項內容的修改權限。', errors: {} };
  const name = error instanceof Error ? error.name : 'UnknownError';
  const code = error instanceof SupabaseRepositoryError ? error.code : null;
  // 伺服器端記錄錯誤類型與代碼（不含內容全文），畫面只顯示一般訊息
  console.error(`[cms.blog] ${operation} failed: ${name} code=${code ?? 'none'}`);
  return { status: 'error', message: '儲存失敗，請稍後再試。', errors: {} };
}

export async function saveBlogPostAction(_state: ContentFormState, formData: FormData): Promise<ContentFormState> {
  const id = String(formData.get('id') ?? '').trim();
  const input = parseBlogPostForm(formData);
  // author 只能存成未發布狀態；同樣的限制由 RLS posts_author_* 再把關一次
  const { repos, denied } = await requireWriter({ publishing: input.status === 'published' || input.status === 'archived' });
  if (denied) return denied;

  const validation = validateBlogPostInput(input);
  if (!validation.ok) return { status: 'invalid', message: '部分欄位需要修正，尚未儲存。', errors: validation.errors };

  let createdId: string | null = null;
  try {
    const result = id ? await repos.cmsBlog.update(id, input) : await repos.cmsBlog.create(input);
    await repos.marketingRebuild.trigger(`文章「${input.title}」已更新`).catch(() => undefined);
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

/** 列表與編輯頁的狀態切換（發布 / 取消發布 / 下架） */
export async function transitionBlogPostAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  const intent = String(formData.get('intent') ?? '');
  const { repos, denied } = await requireWriter({ publishing: true });
  if (denied || !id) redirect(`${ROUTE}?error=forbidden`);
  if (intent !== 'publish' && intent !== 'unpublish' && intent !== 'archive') redirect(`${ROUTE}?error=unknown_intent`);

  // redirect() 以例外實作，必須放在 try 之外，否則會被下面的 catch 攔截
  let outcome: string | null = null;
  try {
    if (intent === 'publish') await repos.cmsBlog.publish(id);
    else if (intent === 'unpublish') await repos.cmsBlog.unpublish(id);
    else await repos.cmsBlog.archive(id);
    await repos.marketingRebuild.trigger(`文章狀態變更（${intent}）`).catch(() => undefined);
  } catch (error) {
    outcome = isPermissionDeniedError(error) ? 'forbidden' : 'failed';
    console.error(`[cms.blog] ${intent} failed: ${error instanceof Error ? error.name : 'UnknownError'}`);
  }
  revalidatePath(ROUTE);
  revalidatePath('/admin/dashboard');
  redirect(outcome ? `${ROUTE}?error=${outcome}` : `${ROUTE}?done=${intent}`);
}
