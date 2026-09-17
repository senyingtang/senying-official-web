import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // 驗收腳本（pnpm commerce-integration:verify）以本機 Supabase 設定另外 build 一份時使用；
  // 一般 build 固定輸出到 .next。PUBLIC_* 會在 build 時內嵌，所以不同設定必須分開 build。
  distDir: process.env.ADMIN_DIST_DIR || '.next',
  transpilePackages: ['@syt/auth', '@syt/database', '@syt/shared', '@syt/ui'],
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  // 只暴露 anon 等公開值給瀏覽器；SUPABASE_SERVICE_ROLE_KEY 絕對不可加在這裡
  env: {
    PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL ?? '',
    PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
