import { buildSitemapXml, type SitemapEntry } from '@syt/seo';
import type { APIRoute } from 'astro';
import { landingVariants } from '../content/landingVariants';
import { products } from '../content/products';
import { getMarketingCmsContent } from '../lib/cms';
import { siteUrl } from '../lib/site';

const staticPaths = ['/', '/products', '/solutions', '/cases', '/blog', '/about', '/contact', '/legal/terms', '/legal/privacy'];

export const GET: APIRoute = async () => {
  // 只收錄已發布的文章與案例（repository 已套用相同規則）；
  // /cart、/checkout、/checkout/success、/checkout/failed 與 /search 都是 noindex 的交易 / 工具頁，一律不收錄
  const { posts, cases } = await getMarketingCmsContent();
  const entries: SitemapEntry[] = [
    ...staticPaths.map((path) => ({ path, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...products.map((product) => ({ path: product.path, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...landingVariants.map((variant) => ({ path: variant.path, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...posts.map((post) => ({ path: `/blog/${post.slug}`, lastModified: post.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
    ...cases.map((item) => ({ path: `/cases/${item.slug}`, lastModified: item.updatedAt, changeFrequency: 'monthly' as const, priority: 0.6 })),
  ];
  return new Response(buildSitemapXml(siteUrl, entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
