import { absoluteUrl } from './metadata';

export interface SitemapEntry {
  path: string;
  lastModified?: string;
  changeFrequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
  /** false 時不收錄（草稿、預覽、noindex 頁） */
  indexable?: boolean;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function buildSitemapXml(siteUrl: string, entries: SitemapEntry[]): string {
  const urls = entries
    .filter((entry) => entry.indexable !== false)
    .map((entry) => {
      const parts = [`<loc>${escapeXml(absoluteUrl(siteUrl, entry.path))}</loc>`];
      if (entry.lastModified) parts.push(`<lastmod>${escapeXml(entry.lastModified)}</lastmod>`);
      if (entry.changeFrequency) parts.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      if (entry.priority !== undefined) parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
      return `  <url>${parts.join('')}</url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function buildRobotsTxt(siteUrl: string, options: { allowIndexing: boolean }): string {
  if (!options.allowIndexing) {
    return 'User-agent: *\nDisallow: /\n';
  }
  return `User-agent: *\nAllow: /\nDisallow: /checkout\n\nSitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}\n`;
}
