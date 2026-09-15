import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import astro from 'eslint-plugin-astro';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * 森映 monorepo 共用 ESLint flat config。
 * @param {{ nextAppDir: string }} options Next.js app 相對於 repo 根目錄的路徑
 */
export function createEslintConfig({ nextAppDir }) {
  return defineConfig([
    globalIgnores([
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.astro/**',
      '**/.turbo/**',
      '**/next-env.d.ts',
      'docs/**',
      'supabase/**',
    ]),
    js.configs.recommended,
    tseslint.configs.recommended,
    {
      languageOptions: {
        globals: { ...globals.browser, ...globals.node },
      },
      rules: {
        '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        'no-console': ['warn', { allow: ['warn', 'error'] }],
      },
    },
    astro.configs.recommended,
    {
      // astro-eslint-parser 不提供型別資訊，此規則在 .astro 檔無法執行
      files: ['**/*.astro'],
      languageOptions: {
        // pnpm 嚴格 node_modules 下 astro-eslint-parser 無法自行解析 TS parser，需直接傳入
        parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.astro'] },
      },
      rules: { '@typescript-eslint/consistent-type-imports': 'off' },
    },
    {
      files: [`${nextAppDir}/**/*.{ts,tsx}`],
      plugins: {
        '@next/next': nextPlugin,
        'react-hooks': reactHooks,
      },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        ...nextPlugin.configs['core-web-vitals'].rules,
        // 本專案只使用 App Router（沒有 pages/ 目錄）；此規則只適用 Pages Router，
        // 保留會輸出「Pages directory cannot be found」的誤導訊息
        '@next/next/no-html-link-for-pages': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    {
      files: ['scripts/**/*.mjs'],
      rules: { 'no-console': 'off' },
    },
  ]);
}
