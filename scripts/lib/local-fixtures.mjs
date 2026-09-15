// Phase 2.8 本機 Supabase 測試帳號（只用於 local stack，用完即刪）
//
// - email 使用 .test 保留網域；密碼每次執行隨機產生，只存在記憶體，不寫檔、不輸出
// - 帳號以 GoTrue admin API（本機 service role，僅限此伺服器端測試程序）建立
// - 後台角色（admin_profiles）以 postgres 在本專案 DB container 內建立（第一位 owner 只能由受信任環境 bootstrap）
// - customer：已登入但不是後台成員的使用者（不建立 workspace，避免清理時需要繞過 workspace guard）
// - 驗收結束一定呼叫 cleanupTestAccounts：測試帳號不可留在 DB
//   （既有 rls_smoke_test 假設 DB 內沒有其他 owner；殘留 owner 會讓「最後一位 owner」測試失敗）
import { randomBytes } from 'node:crypto';
import { psql, psqlJson, sqlLiteral } from './local-supabase.mjs';

export const TEST_ROLES = ['owner', 'admin', 'editor', 'viewer', 'author', 'customer'];
export const TEST_EMAIL_DOMAIN = 'syt-local.test';
export const testEmail = (role) => `phase28.${role}@${TEST_EMAIL_DOMAIN}`;
const isTestEmail = (email) => /^phase28\.[a-z]+@syt-local\.test$/i.test(String(email));

async function adminApi(env, method, pathname, body) {
  const response = await fetch(`${env.apiUrl}/auth/v1${pathname}`, {
    method,
    headers: { apikey: env.serviceRoleKey, Authorization: `Bearer ${env.serviceRoleKey}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`GoTrue admin ${method} ${pathname.replace(/[0-9a-f-]{36}/g, ':id')} → HTTP ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function listTestUsers(env) {
  const list = await adminApi(env, 'GET', '/admin/users?page=1&per_page=1000');
  return (list?.users ?? []).filter((user) => isTestEmail(user.email));
}

/**
 * 刪除測試帳號與角色。admin_profiles 的「最後一位 owner」guard 在本機清理時以 session_replication_role=replica 略過
 * （admin_profiles 沒有其他資料表參照；auth.users 以 GoTrue 正常刪除，外鍵 on delete set null 照常執行）。
 * @returns {Promise<number>} 刪除的帳號數
 */
export async function cleanupTestAccounts(env) {
  const users = await listTestUsers(env);
  if (users.length > 0) {
    const ids = users.map((user) => `${sqlLiteral(user.id)}::uuid`).join(', ');
    const result = psql(`begin;\nset local session_replication_role = replica;\ndelete from public.admin_profiles where user_id in (${ids});\ncommit;`);
    if (!result.ok) throw new Error('清除測試 admin_profiles 失敗');
    for (const user of users) await adminApi(env, 'DELETE', `/admin/users/${user.id}`);
  }
  const remaining = psqlJson(`select count(*) from auth.users where email like 'phase28.%@${TEST_EMAIL_DOMAIN}'`);
  if (Number(remaining) !== 0) throw new Error(`測試帳號未清除（剩 ${remaining}）`);
  return users.length;
}

/**
 * 建立測試帳號並設定角色（先清掉殘留帳號）。
 * @returns {Promise<Record<string, { id: string, email: string, password: string }>>}
 */
export async function ensureTestAccounts(env) {
  await cleanupTestAccounts(env);
  const accounts = {};
  for (const role of TEST_ROLES) {
    const email = testEmail(role);
    const password = `P28-${randomBytes(18).toString('base64url')}`;
    const user = await adminApi(env, 'POST', '/admin/users', { email, password, email_confirm: true, user_metadata: { display_name: `Phase 2.8 ${role}` } });
    accounts[role] = { id: user.id, email, password };
  }

  const profileRows = TEST_ROLES.filter((role) => role !== 'customer')
    .map((role) => `(${sqlLiteral(accounts[role].id)}::uuid, ${sqlLiteral(`Phase 2.8 ${role}`)}, ${sqlLiteral(role)}::public.cms_admin_role, true)`)
    .join(',\n    ');
  const setup = psql(`insert into public.admin_profiles(user_id, display_name, role, is_active) values\n    ${profileRows};`);
  if (!setup.ok) throw new Error(`建立測試角色失敗：${setup.stderr.split('\n').find((line) => /ERROR/.test(line)) ?? ''}`);

  const roles = psqlJson(`select json_object_agg(u.email, coalesce(p.role::text, 'none')) from auth.users u left join public.admin_profiles p on p.user_id = u.id and p.is_active where u.email like 'phase28.%@${TEST_EMAIL_DOMAIN}'`);
  for (const role of TEST_ROLES) {
    const expected = role === 'customer' ? 'none' : role;
    if (roles?.[testEmail(role)] !== expected) throw new Error(`測試帳號角色不符：${testEmail(role)} = ${roles?.[testEmail(role)]}`);
  }
  return accounts;
}
