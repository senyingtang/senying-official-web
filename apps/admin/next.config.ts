import path from 'node:path';
import type { NextConfig } from 'next';

const monorepoRoot = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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
