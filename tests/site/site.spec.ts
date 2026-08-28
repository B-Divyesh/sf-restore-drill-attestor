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

test('legal pages have one heading and no serious accessibility issues', async ({ page }) => {
  for (const path of ['/privacy/', '/terms/']) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
  }
});
