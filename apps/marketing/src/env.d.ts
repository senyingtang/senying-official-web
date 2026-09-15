/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SITE_PUBLIC_URL?: string;
  readonly DATA_SOURCE?: string;
  /** 只給 pnpm global-ui:verify 的驗收 build 使用（mock 模式） */
  readonly SITE_SETTINGS_MOCK_PRESET?: string;
  readonly SITE_ALLOW_INDEXING?: string;
  readonly ADMIN_PUBLIC_URL?: string;
  readonly PUBLIC_LINE_OA_URL?: string;
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
