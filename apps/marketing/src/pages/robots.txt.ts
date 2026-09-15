import { buildRobotsTxt } from '@syt/seo';
import type { APIRoute } from 'astro';
import { allowIndexing, siteUrl } from '../lib/site';

export const GET: APIRoute = () =>
  new Response(buildRobotsTxt(siteUrl, { allowIndexing }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
