// Mock 模式登入工具（驗收腳本共用）：以登入頁的示範帳號按鈕登入，取得 Playwright storageState。
// 只適用 DATA_SOURCE=mock；不會使用任何真實帳號或密碼。

export const DEMO_EMAILS = {
  owner: 'owner@example.com',
  admin: 'admin@example.com',
  editor: 'editor@example.com',
  author: 'author@example.com',
  viewer: 'viewer@example.com',
  customer: 'customer@example.com',
  otherCustomer: 'other-customer@example.com',
  outsider: 'outsider@example.com',
};

/**
 * 在 /{area}/login 點選示範帳號登入。
 * @returns {{ storageState: object, finalUrl: URL }}
 */
export async function loginAs(browser, baseUrl, { area, email, next }) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const query = next ? `?next=${encodeURIComponent(next)}` : '';
    await page.goto(`${baseUrl}/${area}/login${query}`, { waitUntil: 'networkidle', timeout: 60000 });
    const button = page.locator(`[data-testid="demo-login"][value="${email}"]`);
    if ((await button.count()) === 0) throw new Error(`demo account ${email} not found on /${area}/login`);
    const startUrl = page.url();
    await Promise.all([
      page.waitForURL((url) => url.href !== startUrl && (!url.pathname.endsWith('/login') || url.searchParams.has('error')), { timeout: 60000 }),
      button.click(),
    ]);
    // 登入後可能再經過 guard 轉址（例如沒有 workspace → /portal/redeem-code），等網址穩定再回傳
    let lastUrl = '';
    for (let attempt = 0; attempt < 40 && page.url() !== lastUrl; attempt += 1) {
      lastUrl = page.url();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(300);
    }
    return { storageState: await context.storageState(), finalUrl: new URL(page.url()) };
  } finally {
    await context.close();
  }
}
