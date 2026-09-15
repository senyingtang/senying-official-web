# @syt/config

- `eslint/base.mjs`：monorepo 共用 ESLint flat config（TypeScript、Astro、Next.js、React Hooks）。根目錄 `eslint.config.mjs` 使用。

TypeScript 設定統一放在根目錄 `tsconfig.base.json`，各 app / package 以**相對路徑** extends。
不使用 `@syt/config/tsconfig/*` 套件路徑：Vite 8（rolldown）會沿 symlink 位置解析巢狀 extends，導致找不到 base 設定。

版本鎖定原因：
- ESLint 9.39：eslint-plugin-astro 2.x / 3.x 需要 Node ≥ 24.16（目前環境 24.13），故使用 eslint-plugin-astro 1.7 + ESLint 9。
- TypeScript 5.9：typescript-eslint 8.70 支援 < 6.1，@astrojs/check 支援 5 / 6。
- `.astro` 檔需直接傳入 `tseslint.parser`（pnpm 嚴格 node_modules 下 astro-eslint-parser 無法自行解析）。
