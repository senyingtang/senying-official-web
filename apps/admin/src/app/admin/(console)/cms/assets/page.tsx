import { buttonClass } from '@syt/ui';
import type { Metadata } from 'next';
import { EmptyState } from '@/components/ui/EmptyState';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { requireAdminPage } from '@/lib/auth/guards';

export const metadata: Metadata = { title: '媒體庫' };

export default async function CmsAssetsPage() {
  await requireAdminPage('/admin/cms/assets');
  return (
    <>
      <PageHeader eyebrow="官網 CMS" title="媒體庫" description="對應 Storage bucket public-assets 與 cms_assets。" />
      <div className="grid gap-4">
        <Notice title="上傳規則">單檔 10 MB 以內；JPEG、PNG、WebP、AVIF、SVG；檔名使用 UUID；alt 文字必填提醒；仍被引用的媒體不可直接刪除。</Notice>
        <EmptyState
          title="尚未上傳任何媒體"
          description="串接 Supabase Storage 後即可上傳圖片。"
          action={
            <button type="button" className={buttonClass('primary')} disabled>
              上傳圖片
            </button>
          }
        />
      </div>
    </>
  );
}
