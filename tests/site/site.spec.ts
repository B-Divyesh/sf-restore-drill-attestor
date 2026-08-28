import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('home is semantic, error-free, and accessible', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/');
  await expect(page).toHaveTitle(/Restore Drill Attestor/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('img')).toHaveAttribute('alt', /four-stage halftone proof press/i);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.locator('#install-code')).toContainText('cargo install --git https://github.com/B-Divyesh/sf-restore-drill-attestor.git --locked');
  await expect(page.locator('#install-code')).not.toContainText('cargo install restore-drill-attestor');
});

test('visible controls and operational copy meet the product baseline', async ({ page }) => {
  await page.goto('/');
  const undersizedControls = await page.locator('a, button, input, summary').evaluateAll(elements =>
    elements.filter(element => {
      const node = element as HTMLElement;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none' && (box.width < 44 || box.height < 44);
    }).map(element => ({ text: (element.textContent || '').trim(), box: element.getBoundingClientRect().toJSON() }))
  );
  expect(undersizedControls).toEqual([]);

  const undersizedText = await page.locator('main').evaluate(main => {
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
    const failures: Array<{ text: string; fontSize: string }> = [];
    while (walker.nextNode()) {
      const text = walker.currentNode.textContent?.trim() || '';
      const parent = walker.currentNode.parentElement;
      if (!text || !parent || parent.closest('[hidden]')) continue;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      if (Number.parseFloat(style.fontSize) < 16) failures.push({ text, fontSize: style.fontSize });
    }
    return failures;
  });
  expect(undersizedText).toEqual([]);
});

test('deployment policy prevents framing and restricts executable content', async () => {
  const { readFile } = await import('node:fs/promises');
  const policy = JSON.parse(await readFile('site/public/staticwebapp.config.json', 'utf8'));
  expect(policy.globalHeaders['X-Frame-Options']).toBe('DENY');
  expect(policy.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  expect(policy.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'");
});

test('sample drill shows success and failure with cleanup', async ({ page }) => {
  await page.goto('/#demo');
  await page.getByRole('button', { name: 'Run sample drill' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
  await page.getByRole('button', { name: 'Simulate failed check' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('FAILED / CLEANED', { timeout: 6_000 });
  await expect(page.locator('[data-stage]').last().locator('small')).toHaveText('Cleanup still completed');
});

test('returned purchase strips token and unlocks after verification', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
  }));
  await page.goto('/?license=test-token#operator-pack');
  await expect(page).toHaveURL(/\/#operator-pack$/);
  await expect(page.locator('[data-operator-content]')).toBeVisible();
  await expect(page.locator('[data-license-status]')).toContainText('License active');
  expect(await page.evaluate(() => localStorage.getItem('sb_license:restore-drill-attestor'))).toBe('test-token');
});

test('offline state is explicit and layout fits the viewport', async ({ page, context }) => {
  await page.goto('/');
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.locator('[data-connection]')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});

test('service worker updates and keeps the product usable after an offline reload', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>(resolve => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
  });
  await page.reload({ waitUntil: 'networkidle' });
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect.poll(() => page.evaluate(async () => {
    const cache = await caches.open((await caches.keys()).find(key => key.startsWith('rda-shell-v2:')) || 'missing');
    const requests = await cache.keys();
    const script = requests.find(request => /\/assets\/main-[^/]+\.js$/.test(new URL(request.url).pathname));
    const response = script ? await cache.match(script) : null;
    return response ? (await response.text()).length > 100 : false;
  })).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/Restore Drill Attestor/);
  await expect(page.locator('[data-connection]')).toContainText('Offline');
  await page.getByRole('button', { name: 'Run sample drill' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
});

test('clean first load stays first-party and keyboard flows retain visible focus', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/');
  expect([...origins]).toEqual(['http://127.0.0.1:4173']);

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const focusStyle = await page.getByRole('link', { name: 'Skip to main content' }).evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(focusStyle.boxShadow).not.toBe('none');

  await page.getByRole('button', { name: 'Have a license? Paste it' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('License token')).toBeFocused();
});

test('an invalid license relocks paid content without blocking the free product', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: false, reason: 'revoked', expires_at: null })
  }));
  await page.goto('/?license=revoked-token');
  await expect(page.locator('[data-license-status]')).toContainText('no longer active');
  await expect(page.locator('[data-operator-content]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Run sample drill' })).toBeEnabled();
});

test('legal pages have one heading and no serious accessibility issues', async ({ page }) => {
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
  }
});
