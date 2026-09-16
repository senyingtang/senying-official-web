import { createClient } from '@supabase/supabase-js';
import type { SupabaseDataSourceConfig } from './data-source';
import { createSupabaseCmsRepositories } from './supabase/cms-repositories';
import type { CmsBlogRepository, CmsCaseRepository, CmsStructureRepository } from './repositories';

/**
 * 官網（Astro static build）以 anon key 讀取已發布的 CMS 內容。
 *
 * - 只使用 PUBLIC anon key，範圍由 RLS 決定（posts_public_read / cases_public_read：published 且 published_at <= now）
 * - 不使用 service role、不保存 session
 * - 讀取失敗時丟出錯誤讓 build 失敗，不改用 mock 內容
 */
export interface PublicCmsReaders {
  blog: Pick<CmsBlogRepository, 'listPublished' | 'getPublishedBySlug' | 'listCategories'>;
  cases: Pick<CmsCaseRepository, 'listPublished' | 'getPublishedBySlug'>;
  structure: Pick<CmsStructureRepository, 'listNavigation'>;
}

export function createPublicCmsReaders(config: SupabaseDataSourceConfig): PublicCmsReaders {
  const client = createClient(config.url, config.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const cms = createSupabaseCmsRepositories(client);
  return { blog: cms.cmsBlog, cases: cms.cmsCases, structure: cms.cmsStructure };
}
