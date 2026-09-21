// RWD 驗收用的本機服務管理：建置檢查、找空閒 port、啟動 / 等待 / 關閉服務
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync, rmSync, statSync } from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MARKETING_DIR = path.join(ROOT, 'apps', 'marketing');
export const ADMIN_DIR = path.join(ROOT, 'apps', 'admin');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('找不到 Chrome，請設定 CHROME_PATH。');
  return found;
}

/** build output 不存在時自動執行 pnpm build（turbo 會使用快取） */
export function ensureBuilt(apps, { force = false } = {}) {
  const markers = {
    marketing: path.join(MARKETING_DIR, 'dist', 'index.html'),
    admin: path.join(ADMIN_DIR, '.next', 'BUILD_ID'),
  };
  const missing = apps.filter((app) => force || !existsSync(markers[app]));
  if (missing.length === 0) return;
  console.log(`[rwd] build output missing for ${missing.join(', ')} → running pnpm build`);
  // 驗收服務一律使用 mock build：顯式 DATA_SOURCE=mock 並清掉 PUBLIC_SUPABASE_*（與 scripts/lib/build-env.mjs 相同規則）
  const env = { ...process.env, DATA_SOURCE: 'mock' };
  for (const key of ['PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) delete env[key];
  if (missing.includes('marketing')) rmSync(path.join(MARKETING_DIR, 'dist'), { recursive: true, force: true });
  const result = spawnSync('pnpm build', { cwd: ROOT, stdio: 'inherit', shell: true, env });
  if (result.status !== 0) throw new Error('pnpm build failed');
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

/** 是否已有程式在該 port 接受連線（Windows 允許 127.0.0.1 與 0.0.0.0 同 port 並存綁定，只測 listen 會誤判為空閒） */
function hasListener(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    const done = (result) => {
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(800);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** 從偏好 port 往上找空閒 port（被其他程式占用時不關閉對方） */
export async function findFreePort(preferred) {
  for (let port = preferred; port < preferred + 100; port += 1) {
    if (await hasListener(port, '127.0.0.1')) continue;
    if (await hasListener(port, '::1')) continue;
    if ((await canListen(port, '0.0.0.0')) && (await canListen(port, '127.0.0.1'))) return port;
  }
  throw new Error(`no free port found from ${preferred}`);
}

export async function waitForHttp(url, { timeoutMs = 120000, isAlive = () => true, logs = [] } = {}) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (!isAlive()) throw new Error(`server exited before ready: ${url}\n${logs.join('').slice(-2000)}`);
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${url}\n${logs.join('').slice(-2000)}`);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function resolveStaticFile(root, pathname) {
  const base = path.resolve(root, `.${path.posix.normalize(pathname)}`);
  if (!base.startsWith(path.resolve(root))) return null;
  for (const candidate of [base, path.join(base, 'index.html'), `${base}.html`]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Astro 前台：直接 serve Astro static build（apps/marketing/dist），行為與 astro preview 相同
 * （/path → dist/path/index.html，找不到 → 404.html）。
 * 不使用 `astro preview` 子程序：Astro 7 在非 TTY 環境會轉為背景 daemon，無法可靠關閉。
 */
export async function startMarketingServer({ distDir = path.join(MARKETING_DIR, 'dist') } = {}) {
  // 驗收用服務避開常見開發 port（4321 / 3000），避免與本機其他專案的 dev server 互相干擾
  const port = await findFreePort(Number(process.env.MARKETING_PORT ?? 4410));
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405).end();
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
    } catch {
      response.writeHead(400).end();
      return;
    }
    const file = resolveStaticFile(distDir, pathname);
    const target = file ?? path.join(distDir, '404.html');
    if (!existsSync(target)) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(file ? 200 : 404, { 'Content-Type': MIME[path.extname(target)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (request.method === 'HEAD') response.end();
    else createReadStream(target).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${port}`;
  await waitForHttp(`${url}/`);
  return {
    name: 'marketing (Astro static build)',
    url,
    stop: () =>
      new Promise((resolve) => {
        server.closeAllConnections?.();
        server.close(() => resolve());
      }),
  };
}

function killTree(child) {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, 8000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else {
      child.kill('SIGTERM');
    }
  });
}

/**
 * Next.js 後台：以 production build 啟動 next start 子程序。
 * 驗收一律使用 DATA_SOURCE=mock（示範帳號登入、不連 Supabase）；需要測試設定錯誤時以 env 覆寫。
 */
export async function startAdminServer({ env = {}, expectServerError = false } = {}) {
  const port = await findFreePort(Number(process.env.ADMIN_PORT ?? 3310));
  const nextBin = path.join(ADMIN_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!existsSync(nextBin)) throw new Error('next is not installed in apps/admin (run pnpm install)');
  const logs = [];
  const child = spawn(process.execPath, [nextBin, 'start', '--port', String(port), '--hostname', '127.0.0.1'], {
    cwd: ADMIN_DIR,
    env: { ...process.env, NODE_ENV: 'production', DATA_SOURCE: 'mock', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  child.stdout.on('data', (chunk) => logs.push(String(chunk)));
  child.stderr.on('data', (chunk) => logs.push(String(chunk)));
  const url = `http://127.0.0.1:${port}`;
  const stop = () => killTree(child);
  const isAlive = () => child.exitCode === null;
  try {
    if (expectServerError) {
      // 設定錯誤測試：伺服器可能拒絕啟動或每個請求都回 5xx，只等待 port 開始接受連線
      const started = Date.now();
      while (!(await hasListener(port, '127.0.0.1'))) {
        if (!isAlive()) throw new Error(`server exited before ready: ${url}\n${logs.join('').slice(-2000)}`);
        if (Date.now() - started > 120000) throw new Error(`timeout waiting for port ${port}\n${logs.join('').slice(-2000)}`);
        await sleep(300);
      }
    } else {
      await waitForHttp(`${url}/admin/login`, { isAlive, logs });
    }
  } catch (error) {
    await stop();
    throw error;
  }
  return {
    name: 'admin (next start)',
    url,
    stop,
    logs,
    /** 驗收過程中檢查服務是否仍在執行（中途結束時可印出 log 協助診斷） */
    isAlive,
    exitInfo: () => ({ code: child.exitCode, signal: child.signalCode }),
  };
}

export async function stopAll(servers) {
  await Promise.all(servers.splice(0).map((server) => server.stop().catch(() => undefined)));
}

/** Ctrl+C / 終止時也會關閉子程序 */
export function installSignalCleanup(servers) {
  const handler = (signal) => {
    stopAll(servers).finally(() => process.exit(signal === 'SIGINT' ? 130 : 143));
  };
  process.once('SIGINT', handler);
  process.once('SIGTERM', handler);
}
