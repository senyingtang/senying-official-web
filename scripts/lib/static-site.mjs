// Phase 2.7 驗收共用：靜態 build output 解析、指令執行、報表輸出（asset / seo / perf 驗收使用，不啟動服務）
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { MARKETING_DIR, ROOT } from './servers.mjs';

export const DIST = path.join(MARKETING_DIR, 'dist');
export const SRC = path.join(MARKETING_DIR, 'src');
export const REPORT_DIR = path.join(ROOT, '.phase27-report');

export const PRODUCT_PAGES = ['/products/seo-website', '/products/landing-page', '/products/ecommerce-website', '/products/promo-page-design', '/products/seo-article-generator'];
export const LANDING_PAGES = ['/products/landing-page/group-buy-promo', '/products/landing-page/event-registration', '/products/landing-page/course-enrollment', '/products/landing-page/booking-form'];
/** Phase 2.7 主要行銷頁 */
export const MAIN_PAGES = ['/', '/products', ...PRODUCT_PAGES, '/cases', '/blog', '/about', '/contact', '/solutions'];
export const ALL_PAGES = [...MAIN_PAGES, ...LANDING_PAGES, '/checkout', '/legal/terms', '/legal/privacy'];
/** 各頁對應的 OG 圖 key（content/ogImages.ts）；未列出的頁面使用 default */
export const OG_KEY_BY_ROUTE = {
  '/': 'home',
  '/products': 'products',
  '/products/seo-website': 'seo-website',
  '/products/landing-page': 'landing-page',
  '/products/ecommerce-website': 'ecommerce-website',
  '/products/promo-page-design': 'promo-page-design',
  '/products/seo-article-generator': 'seo-article-generator',
  '/cases': 'cases',
  '/blog': 'blog',
  '/about': 'about',
  '/contact': 'contact',
  '/solutions': 'solutions',
};
export const ogKeyFor = (route) => OG_KEY_BY_ROUTE[route] ?? (route.startsWith('/products/landing-page/') ? 'landing-page' : 'default');

export const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : '');
export const rel = (file) => path.relative(ROOT, file).split(path.sep).join('/');
export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

export function walk(dir, skip = new Set(['node_modules'])) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return skip.has(entry.name) ? [] : walk(full, skip);
    return [full];
  });
}

export const htmlPath = (dist, route) => (route === '/' ? path.join(dist, 'index.html') : path.join(dist, ...route.split('/').filter(Boolean), 'index.html'));
export const tagAttr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
export const decode = (value) => value.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export const titleOf = (html) => decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '').trim();
/** 品牌 Logo（data-brand-logo）不算內容圖片 */
export const contentImgTags = (html) => (html.match(/<img\b[^>]*>/g) ?? []).filter((tag) => !/\sdata-brand-logo(?=[\s=>])/.test(tag));

export function metaContent(html, key, value) {
  const tag = (html.match(/<meta\b[^>]*>/g) ?? []).find((item) => tagAttr(item, key) === value);
  return tag ? decode(tagAttr(tag, 'content') ?? '') : null;
}

export function linkTags(html, relValue) {
  return (html.match(/<link\b[^>]*>/g) ?? []).filter((tag) => tagAttr(tag, 'rel') === relValue);
}

export function jsonLdBlocks(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => {
    try {
      return JSON.parse(match[1]);
    } catch {
      return { parseError: true };
    }
  });
}
export const jsonLdOfType = (html, type) => jsonLdBlocks(html).filter((block) => block['@type'] === type);

export const regionHtml = (html, tagName, attribute) => html.match(new RegExp(`<${tagName}\\b[^>]*${attribute}[\\s\\S]*?</${tagName}>`))?.[0] ?? '';

/** <picture> 區塊：fallback <img> 與各格式 <source> */
export function pictures(html) {
  return [...html.matchAll(/<picture\b[^>]*>([\s\S]*?)<\/picture>/g)].map((match) => {
    const inner = match[1];
    return {
      index: match.index,
      tag: match[0],
      img: inner.match(/<img\b[^>]*>/)?.[0] ?? '',
      sources: [...inner.matchAll(/<source\b[^>]*>/g)].map((source) => ({
        type: tagAttr(source[0], 'type'),
        srcset: decode(tagAttr(source[0], 'srcset') ?? ''),
        sizes: decode(tagAttr(source[0], 'sizes') ?? ''),
      })),
    };
  });
}

export function parseSrcset(srcset) {
  return srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .filter(([src]) => src)
    .map(([src, descriptor]) => ({ src, width: Number(descriptor?.replace(/w$/, '')) || 0 }));
}

/** 找出從 openIndex 的 "(" 開始、對應的 ")" 位置（原始碼檢查用） */
export function matchingParen(text, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < text.length; index += 1) {
    if (text[index] === '(') depth += 1;
    else if (text[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

export function run(label, command, env = {}) {
  console.log(`\n[${label}] $ ${command}${Object.keys(env).length ? `  (${Object.entries(env).map(([key, value]) => `${key}=${value}`).join(' ')})` : ''}`);
  return spawnSync(command, { cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, DATA_SOURCE: process.env.DATA_SOURCE || 'mock', ...env } }).status === 0;
}

export function createReport(title) {
  const results = [];
  return {
    record(no, name, ok, detail = '') {
      results.push({ no, name, ok: Boolean(ok), detail: String(detail ?? '') });
    },
    finish(tag) {
      console.log(`\n━━━━ ${title} ━━━━`);
      for (const item of [...results].sort((a, b) => a.no - b.no)) {
        console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${String(item.no).padStart(2)}. ${item.name}${item.detail ? `  — ${item.detail}` : ''}`);
      }
      const failures = results.filter((item) => !item.ok);
      console.log(`\n[${tag}] ${results.length - failures.length}/${results.length} checks passed`);
      console.log(failures.length ? `[${tag}] FAILED` : `[${tag}] All checks passed.`);
      process.exit(failures.length ? 1 : 0);
    },
  };
}
