// Phase 2.8 本機 DB smoke test（只連本專案 local Supabase：API 54421 / DB 54422）
//
//   1. 本機 Supabase 可連線（安全檢查：只接受本機 port）
//   2. migrations 全部套用（supabase_migrations.schema_migrations 與 supabase/migrations 一致，含 0016）
//   3. cms_site_settings 三個官網設定存在、公開、created_at / updated_at、品牌 森映 / SEN YING
//   4. JSON payload 可解析並通過 validateMarketingSiteSettings
//   5. supabase/tests/*.sql（含 site_settings_rls.sql，全程 rollback）
//   6. public（anon，PostgREST）只讀得到 is_public 設定
//   7. anon 寫入失敗
//   8. owner / admin 寫入成功（真實 GoTrue 登入 + RLS）
//   9. editor / viewer / author / customer 寫入失敗
//  10. updated_at trigger 更新
//  11. 測試後資料（內容與 updated_at）完全還原
//
// 測試帳號密碼每次隨機產生、不寫檔；service role 只用於本程序建立本機測試帳號（GoTrue admin API）。
// 用法：pnpm db:smoke
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cleanupTestAccounts, ensureTestAccounts } from './lib/local-fixtures.mjs';
import { getLocalSupabaseEnv, maskSecret, psql, psqlJson, sqlLiteral } from './lib/local-supabase.mjs';
import { ROOT } from './lib/servers.mjs';
import { createReport } from './lib/static-site.mjs';

const report = createReport('Phase 2.8 DB smoke（本機 Supabase）');
const { record } = report;
const { createClient } = createRequire(path.join(ROOT, 'packages', 'database', 'package.json'))('@supabase/supabase-js');
const settingsModule = await import(pathToFileURL(path.join(ROOT, 'packages', 'database', 'src', 'site-settings.ts')).href);
const KEYS = ['site.brand', 'site.socials', 'site.floating_actions'];
const TABLE = 'cms_site_settings';

let env;
try {
  env = getLocalSupabaseEnv();
  record(1, '本機 Supabase 可連線（只允許本專案 local stack）', true, `API ${env.apiUrl} · DB 127.0.0.1:54422 · anon ${maskSecret(env.anonKey)}`);
} catch (error) {
  record(1, '本機 Supabase 可連線', false, error.message);
  report.finish('db:smoke');
}

const snapshot = () => psqlJson(`select json_agg(json_build_object('k', setting_key, 'v', setting_value, 'u', updated_at, 'p', is_public) order by setting_key) from public.cms_site_settings`) ?? [];
/** 以 postgres 還原內容與 updated_at（session_replication_role=replica 暫停 trigger，只在本機測試使用） */
function restore(rows) {
  const current = snapshot();
  const statements = rows.map((row) => `update public.cms_site_settings set setting_value = ${sqlLiteral(JSON.stringify(row.v))}::jsonb, is_public = ${row.p}, updated_at = ${sqlLiteral(row.u)}::timestamptz where setting_key = ${sqlLiteral(row.k)};`);
  const extra = current.filter((row) => !rows.some((item) => item.k === row.k)).map((row) => `delete from public.cms_site_settings where setting_key = ${sqlLiteral(row.k)};`);
  return psql(`begin;\nset local session_replication_role = replica;\n${[...statements, ...extra].join('\n')}\ncommit;`);
}

// ---------------------------------------------------------------------------
// 2–5. migrations / rows / JSON / SQL tests
// ---------------------------------------------------------------------------
// 先清除上次中斷可能殘留的測試帳號（既有 SQL smoke test 假設 DB 內沒有其他後台 owner）
await cleanupTestAccounts(env);
{
  const files = readdirSync(path.join(ROOT, 'supabase', 'migrations')).filter((file) => file.endsWith('.sql')).map((file) => file.split('_')[0]).sort();
  const applied = psqlJson('select json_agg(version order by version) from supabase_migrations.schema_migrations') ?? [];
  record(2, `migrations 全部依序套用（${files.length} 支，含 0016）`, files.length >= 16 && JSON.stringify(files) === JSON.stringify(applied) && applied.includes('0016'), `applied: ${applied.join(', ')}`);

  const rows = psqlJson(`select json_agg(json_build_object('setting_key', setting_key, 'setting_value', setting_value, 'is_public', is_public, 'created_at', created_at, 'updated_at', updated_at) order by setting_key)
    from public.cms_site_settings where setting_key in ('site.brand', 'site.socials', 'site.floating_actions')`) ?? [];
  const parsed = settingsModule.siteSettingsFromRows(rows);
  const duplicates = psqlJson(`select count(*) - count(distinct setting_key) from public.cms_site_settings`);
  record(
    3,
    'cms_site_settings：三個官網設定各一列、is_public、created_at / updated_at、品牌 森映 / SEN YING',
    rows.length === 3 && rows.every((row) => row.is_public && row.created_at && row.updated_at) && parsed.brand.brandNameZh === '森映' && parsed.brand.brandNameEn === 'SEN YING' && duplicates === 0,
    rows.map((row) => `${row.setting_key}=public:${row.is_public}`).join(' · '),
  );
  const brand = rows.find((row) => row.setting_key === 'site.brand')?.setting_value ?? {};
  const socials = rows.find((row) => row.setting_key === 'site.socials')?.setting_value ?? {};
  const validation = settingsModule.validateMarketingSiteSettings(parsed);
  record(
    4,
    'JSON payload 有效（brand 含 logo_url / favicon_url、socials.items 8 筆、通過 validateMarketingSiteSettings）',
    validation.ok && typeof brand.logo_url === 'string' && typeof brand.favicon_url === 'string' && Array.isArray(socials.items) && socials.items.length === 8,
    validation.ok ? `favicon_url=${brand.favicon_url} logo_url=${JSON.stringify(brand.logo_url)}` : JSON.stringify(validation.errors),
  );

  const testsDir = path.join(ROOT, 'supabase', 'tests');
  const results = readdirSync(testsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => {
      const result = psql(readFileSync(path.join(testsDir, file), 'utf8'));
      return { file, ok: result.ok, error: result.stderr.split('\n').find((line) => /ERROR/.test(line)) ?? '' };
    });
  record(5, `supabase/tests SQL smoke tests（${results.length} 支，含 site_settings_rls.sql，全程 rollback）`, results.length >= 6 && results.every((item) => item.ok), results.map((item) => `${item.ok ? '✓' : '✗'} ${item.file}${item.error ? ` ${item.error}` : ''}`).join(' · '));
}

// ---------------------------------------------------------------------------
// 6–11. PostgREST + GoTrue（真實 RLS 路徑）
// ---------------------------------------------------------------------------
const original = snapshot();
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };
try {
  const accounts = await ensureTestAccounts(env);
  const signIn = async (role) => {
    const client = createClient(env.apiUrl, env.anonKey, clientOptions);
    const { data, error } = await client.auth.signInWithPassword({ email: accounts[role].email, password: accounts[role].password });
    if (error || !data.session) throw new Error(`${role} 登入失敗`);
    return client;
  };
  const probeWrite = async (client, key) => {
    const update = await client.from(TABLE).update({ setting_value: { ...original.find((row) => row.k === key).v, smoke_probe: true } }).eq('setting_key', key).select('setting_key');
    const insert = await client.from(TABLE).insert({ setting_key: `smoke.probe_${Date.now()}`, setting_value: {}, is_public: true }).select('setting_key');
    const remove = await client.from(TABLE).delete().eq('setting_key', 'site.floating_actions').select('setting_key');
    return {
      updated: update.error ? 0 : (update.data ?? []).length,
      updateCode: update.error?.code ?? null,
      inserted: insert.error ? 0 : (insert.data ?? []).length,
      insertCode: insert.error?.code ?? null,
      deleted: remove.error ? 0 : (remove.data ?? []).length,
    };
  };
  const unchanged = () => JSON.stringify(snapshot()) === JSON.stringify(original);

  // 6. anon read
  const anon = createClient(env.apiUrl, env.anonKey, clientOptions);
  const publicRead = await anon.from(TABLE).select('setting_key, is_public');
  const visible = publicRead.data ?? [];
  const privateCount = original.filter((row) => !row.p).length;
  record(
    6,
    'public（anon）透過 PostgREST 只讀得到 is_public=true 的設定',
    !publicRead.error && KEYS.every((key) => visible.some((row) => row.setting_key === key)) && visible.every((row) => row.is_public) && privateCount > 0 && visible.length === original.length - privateCount,
    `可見 ${visible.length} / 全部 ${original.length}（非公開 ${privateCount} 列不可見）`,
  );

  // 7. anon write
  const anonWrite = await probeWrite(anon, 'site.brand');
  record(7, 'anon insert / update / delete 全部失敗', anonWrite.updated === 0 && anonWrite.inserted === 0 && anonWrite.deleted === 0 && unchanged(), JSON.stringify(anonWrite));

  // 8 / 10. owner / admin write + updated_at
  const writeChecks = [];
  for (const [role, key] of [
    ['owner', 'site.brand'],
    ['admin', 'site.floating_actions'],
  ]) {
    const client = await signIn(role);
    const before = snapshot().find((row) => row.k === key);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const result = await client.from(TABLE).update({ setting_value: { ...before.v, smoke_probe: role } }).eq('setting_key', key).select('setting_key, updated_at');
    const after = snapshot();
    const row = after.find((item) => item.k === key);
    const others = after.filter((item) => item.k !== key);
    const othersUnchanged = others.every((item) => JSON.stringify(item) === JSON.stringify(original.find((source) => source.k === item.k)));
    writeChecks.push({ role, key, ok: !result.error && (result.data ?? []).length === 1 && row.v.smoke_probe === role && row.u !== before.u && othersUnchanged, updatedAtChanged: row.u !== before.u });
    const restored = restore(original);
    if (!restored.ok) throw new Error('還原失敗');
    await client.auth.signOut();
  }
  record(8, 'owner / admin 寫入成功（真實登入，RLS cms_site_settings_admin_manage），只改目標列', writeChecks.every((item) => item.ok), writeChecks.map((item) => `${item.role}→${item.key}:${item.ok}`).join(' · '));
  record(10, 'updated_at trigger：寫入後 updated_at 更新', writeChecks.every((item) => item.updatedAtChanged), writeChecks.map((item) => `${item.role}:${item.updatedAtChanged}`).join(' · '));

  // 9. editor / viewer / author / customer
  const denied = [];
  for (const role of ['editor', 'viewer', 'author', 'customer']) {
    const client = await signIn(role);
    const result = await probeWrite(client, 'site.socials');
    denied.push({ role, ok: result.updated === 0 && result.inserted === 0 && result.deleted === 0 && unchanged(), ...result });
    await client.auth.signOut();
  }
  record(9, 'editor / viewer / author / customer 寫入失敗（update / delete 0 列、insert 42501）', denied.every((item) => item.ok), denied.map((item) => `${item.role}:${item.ok ? 'denied' : JSON.stringify(item)}(insert ${item.insertCode})`).join(' · '));
} catch (error) {
  record(8, 'PostgREST / GoTrue 權限測試', false, error.message);
} finally {
  if (JSON.stringify(snapshot()) !== JSON.stringify(original)) restore(original);
  let removed = 'cleanup failed';
  try {
    removed = `${await cleanupTestAccounts(env)} 個測試帳號已刪除`;
  } catch (error) {
    removed = error.message;
  }
  const final = snapshot();
  const parsed = settingsModule.siteSettingsFromRows(final.filter((row) => KEYS.includes(row.k)).map((row) => ({ setting_key: row.k, setting_value: row.v })));
  record(
    11,
    '測試後 cms_site_settings 內容與 updated_at 完全還原、JSON 仍有效、測試帳號已刪除',
    JSON.stringify(final) === JSON.stringify(original) && settingsModule.validateMarketingSiteSettings(parsed).ok && /已刪除/.test(removed),
    `${final.length} rows · ${removed}`,
  );
}

report.finish('db:smoke');
