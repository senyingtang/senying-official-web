import 'server-only';
import {
  defaultHomePath,
  loginPath,
  sanitizeNextPath,
  type AdminSession,
  type AuthArea,
  type AuthUser,
  type CmsAdminRole,
  type LoginFormState,
  type PortalSession,
  type WorkspaceMembership,
} from '@syt/auth';
import { createRepositories, findMockAccountByEmail, findMockAccountById, type Repositories, type Viewer } from '@syt/database';
import type { DataSourceConfig } from '@syt/database/data-source';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getDataSourceConfig, tryGetDataSourceConfig } from '@/lib/config';
import { serverEnv } from '@/lib/env';
import { createUserSupabaseClient } from '@/lib/supabase/server';
import { MOCK_SESSION_COOKIE, PENDING_REDEEM_COOKIE } from './cookies';
import { createMockSessionToken, MOCK_SESSION_MAX_AGE, verifyMockSessionToken } from './mock-session';

type UserSupabaseClient = Awaited<ReturnType<typeof createUserSupabaseClient>>;

interface AuthState {
  config: DataSourceConfig;
  user: AuthUser | null;
  supabase: UserSupabaseClient | null;
}

export interface AdminContext {
  user: AuthUser | null;
  role: CmsAdminRole | null;
  session: AdminSession | null;
  repos: Repositories | null;
}

export interface PortalContext {
  user: AuthUser | null;
  memberships: WorkspaceMembership[];
  session: PortalSession | null;
  repos: Repositories | null;
}

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    secure: Boolean(serverEnv.adminPublicUrl?.startsWith('https://')),
    maxAge,
  };
}

function displayNameFrom(metadata: unknown, fallback: string): string {
  if (metadata && typeof metadata === 'object') {
    const record = metadata as Record<string, unknown>;
    const value = record.display_name ?? record.full_name;
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return fallback;
}

/**
 * 目前登入者（同一個 request 內快取）。
 * - mock：驗證 HMAC 簽章 cookie
 * - supabase：getUser() 向 Supabase Auth server 驗證 token，不信任 cookie 內容
 */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const config = getDataSourceConfig();
  if (config.kind === 'mock') {
    const cookieStore = await cookies();
    const userId = verifyMockSessionToken(cookieStore.get(MOCK_SESSION_COOKIE)?.value);
    const account = userId ? findMockAccountById(userId) : null;
    return {
      config,
      supabase: null,
      user: account ? { id: account.id, email: account.email, displayName: account.displayName } : null,
    };
  }
  const supabase = await createUserSupabaseClient(config);
  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  return {
    config,
    supabase,
    user: user ? { id: user.id, email: user.email ?? '', displayName: displayNameFrom(user.user_metadata, user.email ?? '使用者') } : null,
  };
});

function repositoriesFor(state: AuthState, viewer?: Viewer): Repositories {
  return createRepositories(state.config, { supabase: state.supabase ?? undefined, viewer });
}

/** 官方後台身分：admin_profiles 中啟用的角色（supabase 模式經 RLS：使用者只能讀自己的 admin_profiles） */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const state = await getAuthState();
  if (!state.user) return { user: null, role: null, session: null, repos: null };
  const role = await repositoriesFor(state).identity.getAdminRole(state.user.id);
  if (!role) return { user: state.user, role: null, session: null, repos: null };
  return {
    user: state.user,
    role,
    session: { mode: state.config.kind, user: state.user, role },
    repos: repositoriesFor(state, { userId: state.user.id, email: state.user.email, scope: 'admin', adminRole: role, workspaceIds: [] }),
  };
});

/** 客戶後台身分：customer_workspace_members 中 active 的 workspace */
export const getPortalContext = cache(async (): Promise<PortalContext> => {
  const state = await getAuthState();
  if (!state.user) return { user: null, memberships: [], session: null, repos: null };
  const memberships = await repositoriesFor(state).identity.listWorkspaceMemberships(state.user.id);
  return {
    user: state.user,
    memberships,
    session: { mode: state.config.kind, user: state.user, memberships },
    repos: repositoriesFor(state, {
      userId: state.user.id,
      email: state.user.email,
      scope: 'portal',
      adminRole: null,
      workspaceIds: memberships.map((membership) => membership.workspaceId),
    }),
  };
});

/** 登入（由 app/{admin,portal}/login/actions.ts 呼叫）。成功時 redirect，失敗回傳錯誤碼。 */
export async function performLogin(area: AuthArea, formData: FormData): Promise<LoginFormState> {
  const demoEmail = String(formData.get('demo_email') ?? '');
  const email = (demoEmail || String(formData.get('email') ?? '')).trim().toLowerCase().slice(0, 254);
  const password = String(formData.get('password') ?? '');
  const next = sanitizeNextPath(String(formData.get('next') ?? ''), area);
  const configState = tryGetDataSourceConfig();
  if (!configState.ok) return { error: 'config_error', email };
  const config = configState.config;
  const invalid: LoginFormState = { error: 'invalid_credentials', email };
  if (!email) return invalid;

  let userId: string;
  let supabase: UserSupabaseClient | null = null;
  if (config.kind === 'mock') {
    const account = findMockAccountByEmail(email);
    if (!account) return invalid;
    const cookieStore = await cookies();
    cookieStore.set(MOCK_SESSION_COOKIE, createMockSessionToken(account.id), authCookieOptions(MOCK_SESSION_MAX_AGE));
    userId = account.id;
  } else {
    if (!password) return invalid;
    supabase = await createUserSupabaseClient(config);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return invalid;
    userId = data.user.id;
  }

  if (area === 'admin') {
    let role: CmsAdminRole | null;
    try {
      role = await createRepositories(config, { supabase: supabase ?? undefined }).identity.getAdminRole(userId);
    } catch {
      return { error: 'config_error', email };
    }
    if (!role) redirect(loginPath('admin', { error: 'not_admin' }));
  }
  redirect(next ?? defaultHomePath(area));
}

export async function signOut(): Promise<void> {
  const cookieStore = await cookies();
  const configState = tryGetDataSourceConfig();
  if (configState.ok && configState.config.kind === 'supabase') {
    const supabase = await createUserSupabaseClient(configState.config);
    await supabase.auth.signOut();
  }
  cookieStore.delete(MOCK_SESSION_COOKIE);
  cookieStore.delete(PENDING_REDEEM_COOKIE);
}
