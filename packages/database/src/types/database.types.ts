/**
 * Database 型別：由本機 Supabase 產生（不連正式專案）。
 *   pnpm db:types   （= supabase gen types typescript --local > packages/database/src/generated/supabase.ts）
 * schema 變更、db reset 後重新產生；不要手動修改 generated/supabase.ts。
 */
export type { Database, Json } from '../generated/supabase';
