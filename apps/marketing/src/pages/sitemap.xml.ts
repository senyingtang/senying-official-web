import { buildSitemapXml, type SitemapEntry } from '@syt/seo';
import type { APIRoute } from 'astro';
import { landingVariants } from '../content/landingVariants';
import { products } from '../content/products';
import { siteUrl } from '../lib/site';

const staticPaths = ['/', '/products', '/solutions', '/cases', '/blog', '/about', '/contact', '/legal/terms', '/legal/privacy'];

export const GET: APIRoute = () => {
  const entries: SitemapEntry[] = [
    ...staticPaths.map((path) => ({ path, changeFrequency: 'weekly' as const, priority: path === '/' ? 1 : 0.7 })),
    ...products.map((product) => ({ path: product.path, changeFrequency: 'monthly' as const, priority: 0.8 })),
    ...landingVariants.map((variant) => ({ path: variant.path, changeFrequency: 'monthly' as const, priority: 0.6 })),
    // /checkout 為 noindex，不收錄
  ];
  return new Response(buildSitemapXml(siteUrl, entries), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
