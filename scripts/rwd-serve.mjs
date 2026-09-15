// 啟動 RWD 驗收用服務（前台 Astro static build + 後台 next start），供手動檢視；Ctrl+C 會一併關閉
import { ensureBuilt, installSignalCleanup, startAdminServer, startMarketingServer } from './lib/servers.mjs';

const servers = [];
installSignalCleanup(servers);

try {
  ensureBuilt(['marketing', 'admin'], { force: process.argv.includes('--rebuild') });
  const marketing = await startMarketingServer();
  servers.push(marketing);
  const admin = await startAdminServer();
  servers.push(admin);
  console.log(`marketing: ${marketing.url}`);
  console.log(`admin:     ${admin.url}/admin/dashboard`);
  console.log(`portal:    ${admin.url}/portal/dashboard`);
  console.log('Press Ctrl+C to stop.');
  setInterval(() => undefined, 1 << 30);
} catch (error) {
  console.error(error.message);
  for (const server of servers) await server.stop();
  process.exit(1);
}
