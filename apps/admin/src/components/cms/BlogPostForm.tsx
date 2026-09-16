'use client';

import type { BlogCategoryOption, BlogPostDetail, ContentStatus } from '@syt/database/cms-content';
import { CONTENT_STATUS_LABELS, CONTENT_STATUSES } from '@syt/database/cms-content';
import { buttonClass } from '@syt/ui';
import Link from 'next/link';
import { useActionState } from 'react';
import { MarkdownField } from '@/components/cms/MarkdownField';
import { FormSection } from '@/components/ui/FormSection';
import { Notice } from '@/components/ui/Notice';
import { SelectField, TextArea, TextInput, ToggleField } from '@/components/ui/fields';
import { initialContentFormState, toDateTimeLocal, type ContentFormState } from '@/lib/cms/form';

export interface BlogPostFormProps {
  post: BlogPostDetail | null;
  categories: BlogCategoryOption[];
  canEdit: boolean;
  isMock: boolean;
  action: (state: ContentFormState, formData: FormData) => Promise<ContentFormState>;
  /** author 只能存成草稿 / 排程；UI 隱藏不是安全控制，server action 與 RLS 會再檢查 */
  allowedStatuses?: readonly ContentStatus[];
}

const noticeTone = { saved: 'info', mock: 'warning', invalid: 'danger', forbidden: 'danger', conflict: 'danger', error: 'danger', idle: 'info' } as const;

export function BlogPostForm({ post, categories, canEdit, isMock, action, allowedStatuses = CONTENT_STATUSES }: BlogPostFormProps) {
  const [state, formAction, pending] = useActionState(action, initialContentFormState);
  const error = (name: string) => state.errors[name];

  return (
    <form action={formAction} className="grid min-w-0 gap-6" data-testid="blog-post-form">
      {post && <input type="hidden" name="id" value={post.id} />}
      {isMock && (
        <Notice tone="warning" title="Mock 模式">
          顯示的是 mock 內容；儲存只會驗證欄位並暫存在記憶體，不會寫入資料庫，重新啟動後還原。
        </Notice>
      )}
      {state.status !== 'idle' && (
        <div role="status" aria-live="polite">
          <Notice tone={noticeTone[state.status]} title={state.message}>
            {Object.keys(state.errors).length > 0 ? `共 ${Object.keys(state.errors).length} 個欄位需要修正。` : ' '}
          </Notice>
        </div>
      )}

      <fieldset disabled={!canEdit || pending} className="grid min-w-0 gap-6">
        <legend className="sr-only">文章內容</legend>

        <FormSection title="基本資料" description="slug 會成為文章網址 /blog/{slug}，發布後盡量不要更動。">
          <TextInput label="標題" name="title" defaultValue={post?.title ?? ''} error={error('title')} required maxLength={150} />
          <TextInput label="網址代稱（slug）" name="slug" defaultValue={post?.slug ?? ''} error={error('slug')} required placeholder="new-site-seo-guide" hint="小寫英數字與連字號" />
          <SelectField
            label="分類"
            name="category_slug"
            defaultValue={post?.categorySlug ?? ''}
            error={error('category_slug')}
            options={[{ value: '', label: '未分類' }, ...categories.map((item) => ({ value: item.slug, label: item.name }))]}
          />
          <TextInput label="作者顯示名稱" name="author_name" defaultValue={post?.authorName ?? ''} error={error('author_name')} placeholder="森映編輯台" />
          <TextArea label="摘要" name="excerpt" defaultValue={post?.excerpt ?? ''} error={error('excerpt')} fullWidth maxLength={300} hint="列表與搜尋結果會顯示這段文字" />
          <TextInput label="封面圖網址" name="cover_image_url" defaultValue={post?.coverImageUrl ?? ''} error={error('cover_image_url')} fullWidth placeholder="/images/blog/example.webp" hint="站內路徑或 https 網址；留空時使用分類色塊" />
        </FormSection>

        <FormSection title="內容" description="Markdown：## 標題、- 清單、**粗體**、[連結](網址)、![圖片](網址)、> 引用、`程式碼`。禁止 HTML 標籤與 javascript: 連結。" columns={1}>
          <MarkdownField label="文章內容" name="content" defaultValue={post?.content ?? ''} error={error('content')} hint="預覽與前台輸出使用同一套 sanitize 規則" />
        </FormSection>

        <FormSection title="發布設定" description="前台只會輸出「已發布且發布時間已到」的文章；草稿、排程與已下架不會出現在官網或搜尋索引。">
          <SelectField
            label="狀態"
            name="status"
            defaultValue={post?.status ?? 'draft'}
            error={error('status')}
            options={allowedStatuses.map((value) => ({ value, label: CONTENT_STATUS_LABELS[value] }))}
          />
          <TextInput label="發布時間" name="published_at" type="datetime-local" defaultValue={toDateTimeLocal(post?.publishedAt ?? null)} error={error('published_at')} hint="狀態為「已發布」時必填；留空會自動填入儲存時間" />
          <TextInput label="排程時間" name="scheduled_at" type="datetime-local" defaultValue={toDateTimeLocal(post?.scheduledAt ?? null)} error={error('scheduled_at')} hint="狀態為「排程中」時必填" />
          <div className="grid content-start gap-3 rounded-xl border border-border-gray p-4">
            <ToggleField label="設為精選文章" name="is_featured" defaultChecked={post?.isFeatured ?? false} description="部落格首頁的精選位置只會顯示一篇" />
          </div>
        </FormSection>

        <FormSection title="SEO" description="留空時使用文章標題與摘要；這裡的欄位存在 seo_metadata，不是第二套頁面設定。">
          <TextInput label="SEO 標題" name="seo_title" defaultValue={post?.seo.seoTitle ?? ''} error={error('seo_title')} maxLength={120} />
          <TextInput label="Canonical 覆寫" name="canonical_override" defaultValue={post?.seo.canonicalOverride ?? ''} error={error('canonical_override')} placeholder="https://example.com/blog/slug" hint="轉載或同步發布時才需要" />
          <TextArea label="SEO 描述" name="seo_description" defaultValue={post?.seo.seoDescription ?? ''} error={error('seo_description')} fullWidth maxLength={320} />
          <TextInput label="OG 圖網址" name="og_image_url" defaultValue={post?.seo.ogImageUrl ?? ''} error={error('og_image_url')} fullWidth placeholder="/images/og/blog-og-1200x630.png" />
        </FormSection>
      </fieldset>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/admin/cms/blog" className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
          回文章列表
        </Link>
        <button type="submit" className={buttonClass('primary', 'md', 'w-full sm:w-auto')} disabled={!canEdit || pending}>
          {pending ? '儲存中…' : '儲存文章'}
        </button>
      </div>
    </form>
  );
}
