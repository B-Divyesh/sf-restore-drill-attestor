import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const repo = resolve(import.meta.dirname, '../..');

async function runCli(args: string[], cwd = repo, environment: Record<string, string> = {}) {
  return exec('cargo', ['run', '--quiet', '--manifest-path', join(repo, 'Cargo.toml'), '--', ...args], {
    cwd,
    timeout: 60_000,
    env: { ...process.env, ...environment }
  });
}

type CliFailure = Error & { code: number; stdout: string; stderr: string };

async function failedCli(args: string[], cwd = repo): Promise<CliFailure> {
  try {
    await runCli(args, cwd);
  } catch (error) {
    return error as CliFailure;
  }
  throw new Error('CLI unexpectedly exited successfully');
}

test('@claim:demo-sandbox bundled CLI demo restores, checks, cleans up, and prints evidence', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-consumer-'));
  try {
    const sentinel = join(consumer, 'existing-user-data');
    await writeFile(sentinel, 'untouched');
    const { stdout, stderr } = await runCli(['demo', '--json'], consumer);
    expect(stderr).toBe('');
    const result = JSON.parse(stdout) as Record<string, unknown>;
    expect(result).toMatchObject({ demo: true, status: 'passed', target_removed: true, real_data_touched: false });
    expect(String(result.path)).toContain(String(result.sandbox));
    const evidence = JSON.parse(await readFile(String(result.path), 'utf8')) as { status: string; stages: Array<{ stage: string; status: string }>; checks: unknown[] };
    expect(evidence.status).toBe('passed');
    expect(evidence.stages.find(stage => stage.stage === 'restore')?.status).toBe('passed');
    expect(evidence.checks).toHaveLength(3);
    expect(await readFile(sentinel, 'utf8')).toBe('untouched');
    await rm(String(result.sandbox), { recursive: true });
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('@claim:evidence-minimization demo evidence omits sample values, labels, commands, and output', async () => {
  const { stdout } = await runCli(['demo', '--json']);
  const result = JSON.parse(stdout) as { path: string; sandbox: string };
  try {
    const evidence = await readFile(result.path, 'utf8');
    for (const privateValue of ['acme-garden', 'account_id', 'bundled customer database sample', 'three customer records restored', 'grep -q', 'restored.tsv']) {
      expect(evidence).not.toContain(privateValue);
    }
    expect(evidence).toContain('"check_id": "check-1"');
  } finally {
    await rm(result.sandbox, { recursive: true, force: true });
  }
});

test('@claim:target-safety production-looking targets are refused before commands run', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-safety-'));
  try {
    const marker = join(consumer, 'command-ran');
    const config = join(consumer, 'unsafe.toml');
    await writeFile(config, `version = 1\n[drill]\nname = "unsafe"\n[target]\nid = "production01"\nisolated = true\n[commands]\nrestore = "touch ${marker}"\ncleanup = "true"\n[[checks]]\nname = "smoke"\nkind = "command"\ncommand = "true"\n`);
    await expect(runCli(['run', '--config', config, '--confirm', 'production01'], consumer)).rejects.toMatchObject({ code: 2 });
    await expect(readFile(marker)).rejects.toThrow();

    const safeConfig = join(consumer, 'safe.toml');
    await writeFile(safeConfig, `version = 1\n[drill]\nname = "safe"\n[target]\nid = "isolated-claim-target"\nisolated = true\n[commands]\nrestore = "touch ${marker}"\ncleanup = "true"\n[[checks]]\nname = "smoke"\nkind = "command"\ncommand = "true"\n`);
    await expect(runCli(['run', '--config', safeConfig, '--confirm', 'wrong-target'], consumer)).rejects.toMatchObject({ code: 2 });
    await expect(readFile(marker)).rejects.toThrow();
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('@claim:cleanup-recovery failures and interruption retain the lock, stop children, clean up, and write evidence', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-cleanup-'));
  try {
    for (const [name, restore, check] of [['restore', 'false', 'true'], ['check', 'true', 'false']]) {
      const target = join(consumer, `${name}-target`);
      const cleaned = join(consumer, `${name}-cleaned`);
      const output = join(consumer, `${name}-evidence`);
      const config = join(consumer, `${name}.toml`);
      await writeFile(config, `version = 1\n[drill]\nname = "${name} failure"\n[target]\nid = "${name}-failure-target"\nisolated = true\n[commands]\nprepare = "mkdir -p ${target}"\nrestore = "${restore}"\ncleanup = "rm -rf ${target}; touch ${cleaned}"\n[[checks]]\nname = "smoke"\nkind = "command"\ncommand = "${check}"\n`);
      const failure = await failedCli(['run', '--json', '--config', config, '--confirm', `${name}-failure-target`, '--output', output], consumer);
      expect(failure.code).toBe(3);
      expect(JSON.parse(failure.stdout)).toMatchObject({ status: 'failed', interrupted: false });
      expect(await readFile(cleaned, 'utf8')).toBe('');
      await expect(readFile(target)).rejects.toThrow();
    }

    const timeoutTarget = join(consumer, 'timeout-target');
    const timeoutCleaned = join(consumer, 'timeout-cleaned');
    const timeoutOutput = join(consumer, 'timeout-evidence');
    const timeoutConfig = join(consumer, 'timeout.toml');
    await writeFile(timeoutConfig, `version = 1\n[drill]\nname = "timeout failure"\n[target]\nid = "timeout-failure-target"\nisolated = true\n[commands]\nprepare = "mkdir -p ${timeoutTarget}"\nrestore = "true"\ncleanup = "rm -rf ${timeoutTarget}; touch ${timeoutCleaned}"\n[[checks]]\nname = "slow check"\nkind = "command"\ncommand = "sleep 2"\ntimeout_seconds = 1\n`);
    const timeoutFailure = await failedCli(['run', '--json', '--config', timeoutConfig, '--confirm', 'timeout-failure-target', '--output', timeoutOutput], consumer);
    expect(timeoutFailure.code).toBe(3);
    const timeoutSummary = JSON.parse(timeoutFailure.stdout);
    const timeoutEvidence = JSON.parse(await readFile(timeoutSummary.path, 'utf8'));
    expect(timeoutEvidence.checks[0].status).toBe('failed');
    expect(timeoutEvidence.stages.at(-1)).toMatchObject({ stage: 'cleanup', status: 'passed' });
    expect(await readFile(timeoutCleaned, 'utf8')).toBe('');
    await expect(readFile(timeoutTarget)).rejects.toThrow();

    const { stdout } = await exec('cargo', [
      'test', '--quiet', '--manifest-path', join(repo, 'Cargo.toml'), '--test', 'cli_json',
      'interrupted_run_kills_command_tree_keeps_lock_cleans_up_and_writes_evidence', '--', '--exact'
    ], { cwd: repo, timeout: 60_000 });
    expect(stdout).toContain('1 passed');
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('@claim:automation-contract exit codes and JSON output are stable for automation', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-automation-'));
  try {
    const demo = JSON.parse((await runCli(['demo', '--json'], consumer)).stdout);
    expect(demo.status).toBe('passed');

    const cases = [
      { id: 'config', target: 'production01', restore: 'true', cleanup: 'true', check: 'true', code: 2, stream: 'stderr', status: undefined },
      { id: 'drill', target: 'drill-failure-target', restore: 'false', cleanup: 'true', check: 'true', code: 3, stream: 'stdout', status: 'failed' },
      { id: 'cleanup', target: 'cleanup-failure-target', restore: 'true', cleanup: 'false', check: 'true', code: 4, stream: 'stdout', status: 'cleanup_failed' }
    ] as const;
    for (const item of cases) {
      const config = join(consumer, `${item.id}.toml`);
      await writeFile(config, `version = 1\n[drill]\nname = "${item.id}"\n[target]\nid = "${item.target}"\nisolated = true\n[commands]\nrestore = "${item.restore}"\ncleanup = "${item.cleanup}"\n[[checks]]\nname = "smoke"\nkind = "command"\ncommand = "${item.check}"\n`);
      const failure = await failedCli(['run', '--json', '--config', config, '--confirm', item.target, '--output', join(consumer, `${item.id}-out`)], consumer);
      expect(failure.code).toBe(item.code);
      const summary = JSON.parse(item.stream === 'stdout' ? failure.stdout : failure.stderr);
      if (item.status) expect(summary.status).toBe(item.status);
      else expect(summary).toMatchObject({ ok: false, exit_code: 2, error: { kind: 'configuration' } });
    }
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('@claim:target-lock a concurrent run for one target is refused before its commands start', async () => {
  const { stdout } = await exec('cargo', [
    'test', '--quiet', '--manifest-path', join(repo, 'Cargo.toml'), '--test', 'cli_json',
    'concurrent_runs_for_one_target_refuse_before_second_commands_start', '--', '--exact'
  ], { cwd: repo, timeout: 60_000 });
  expect(stdout).toContain('1 passed');
});

test('@claim:attestation-metadata defaults, fingerprint, freshness, and durations are recorded', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-metadata-'));
  try {
    const config = join(consumer, 'defaults.toml');
    const source = `version = 1\n[drill]\nname = "metadata"\n[target]\nid = "metadata-claim-target"\nisolated = true\n[commands]\nrestore = "true"\ncleanup = "true"\n[[checks]]\nname = "smoke"\nkind = "command"\ncommand = "true"\n`;
    await writeFile(config, source);
    const validation = JSON.parse((await runCli(['validate', '--json', '--config', config], consumer)).stdout);
    expect(validation.effective_defaults).toEqual({ command_timeout_seconds: 900, check_timeout_seconds: [900], attestation_ttl_days: 30 });
    const summary = JSON.parse((await runCli(['run', '--json', '--config', config, '--confirm', 'metadata-claim-target', '--output', join(consumer, 'evidence')], consumer)).stdout);
    const evidence = JSON.parse(await readFile(summary.path, 'utf8'));
    expect(evidence.config_sha256).toBe(createHash('sha256').update(source).digest('hex'));
    expect(evidence.duration_ms).toBeGreaterThanOrEqual(0);
    expect(evidence.stages.every((stage: { duration_ms: number }) => Number.isInteger(stage.duration_ms))).toBe(true);
    expect(Date.parse(evidence.fresh_until) - Date.parse(evidence.completed_at)).toBe(30 * 24 * 60 * 60 * 1000);
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

test('@claim:shell-environment commands run through the platform shell with inherited environment variables', async () => {
  const consumer = await mkdtemp(join(tmpdir(), 'rda-claim-env-'));
  try {
    const config = join(consumer, 'environment.toml');
    await writeFile(config, `version = 1\n[drill]\nname = "environment"\n[target]\nid = "environment-claim-target"\nisolated = true\n[commands]\nrestore = 'test "$RDA_CLAIM_ENV" = inherited-value'\ncleanup = "true"\n[[checks]]\nname = "shell"\nkind = "command"\ncommand = 'test "$RDA_CLAIM_ENV" = inherited-value'\n`);
    const result = JSON.parse((await runCli(['run', '--json', '--config', config, '--confirm', 'environment-claim-target', '--output', join(consumer, 'evidence')], consumer, { RDA_CLAIM_ENV: 'inherited-value' })).stdout);
    expect(result.status).toBe('passed');
  } finally {
    await rm(consumer, { recursive: true, force: true });
  }
});

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
  expect(policy.navigationFallback).toBeUndefined();
  expect(policy.globalHeaders['X-Frame-Options']).toBe('DENY');
  expect(policy.globalHeaders['Content-Security-Policy']).toContain("frame-ancestors 'none'");
  expect(policy.globalHeaders['Content-Security-Policy']).toContain("script-src 'self'");
  expect(policy.responseOverrides['404']).toEqual({ rewrite: '/404.html', statusCode: 404 });
});

test('social metadata, touch icon, sitemap, and designed 404 are shipped', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /og-image\.jpg$/);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');
  for (const path of ['/og-image.jpg', '/apple-touch-icon.png']) {
    const response = await request.get(path);
    expect(response.ok()).toBe(true);
  }
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain('<loc>https://restore-drill-attestor.sociobot.in/privacy/</loc>');

  await page.goto('/404.html');
  await expect(page).toHaveTitle('Page not found — Restore Drill Attestor');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This page did not restore.');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(violation => ['critical', 'serious'].includes(violation.impact || ''))).toEqual([]);
});

test('verification 5 regression: unavailable checkout is not advertised', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('a[href*="/checkout"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /buy the operator pack/i })).toHaveCount(0);
  await expect(page.getByText('New licenses are not currently offered.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Restore an existing license' })).toBeVisible();

  await page.goto('/terms/');
  await expect(page.getByRole('heading', { name: 'Existing Operator Pack licenses' })).toBeVisible();
  await expect(page.getByText('New Operator Pack licenses are not currently offered.', { exact: false })).toBeVisible();
});

test('verification 5 regression: public privacy copy stays within tested attestation behavior', async ({ page }) => {
  const stalePromises = [
    'Backups and checks stay in your environment.',
    'No backup storage.',
    'No data upload.'
  ];

  await page.goto('/');
  const landingCopy = await page.locator('body').innerText();
  for (const promise of stalePromises) expect(landingCopy).not.toContain(promise);
  await expect(page.getByText('Attestations omit restored values and command output.')).toBeVisible();

  await page.goto('/privacy/');
  const privacyCopy = await page.locator('main').innerText();
  for (const promise of stalePromises) expect(privacyCopy).not.toContain(promise);
  await expect(page.getByText('Those commands keep your account\'s file and network access.')).toBeVisible();
});

test('sample drill shows success and failure with cleanup', async ({ page }) => {
  await page.goto('/#demo');
  await page.getByRole('button', { name: 'Run sample drill' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
  await page.getByRole('button', { name: 'Simulate failed check' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('FAILED / CLEANED', { timeout: 6_000 });
  await expect(page.locator('[data-stage]').last().locator('small')).toHaveText('Cleanup still completed');
});

test('reduced-motion mode completes the sample without animated transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#demo');
  const transition = await page.locator('[data-stage]').first().evaluate(element => getComputedStyle(element).transitionDuration);
  expect(Number.parseFloat(transition)).toBeLessThanOrEqual(0.001);
  await page.getByRole('button', { name: 'Run sample drill' }).press(' ');
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 1_500 });
});

test('returned license strips token and unlocks after verification', async ({ page }) => {
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

test('@claim:offline-reload service worker keeps docs and demo usable after an offline reload', async ({ page, context }) => {
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

test('@claim:site-local-only clean demo flow sends no third-party request', async ({ page }) => {
  const origins = new Set<string>();
  page.on('request', request => origins.add(new URL(request.url()).origin));
  await page.goto('/?demo=1#demo');
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
  expect([...origins]).toEqual([new URL(page.url()).origin]);
});

test('keyboard flows retain visible focus', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  const focusStyle = await page.getByRole('link', { name: 'Skip to main content' }).evaluate(element => {
    const style = getComputedStyle(element);
    return { outlineWidth: style.outlineWidth, boxShadow: style.boxShadow };
  });
  expect(Number.parseFloat(focusStyle.outlineWidth)).toBeGreaterThanOrEqual(3);
  expect(focusStyle.boxShadow).not.toBe('none');

  await page.getByRole('button', { name: 'Restore an existing license' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('License token')).toBeFocused();
});

test('@claim:operator-pack the page verifies an existing license without gating the free CLI', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
  }));
  await page.goto('/?license=claim-token#operator-pack');
  await expect(page.locator('.price-ticket')).toContainText('Existing license');
  await expect(page.locator('.price-ticket')).toContainText('New sales are paused');
  await expect(page.locator('[data-operator-content]')).toBeVisible();
  await expect(page.locator('[data-license-status]')).toContainText('License active');
  await expect(page.locator('.pricing-section')).toContainText('GitHub Actions and cron scheduling recipes');
  await expect(page.locator('[data-operator-content]')).toContainText('Monthly review agenda');
  await expect(page.locator('.pricing-section')).toContainText('multi-database evidence policy template');
  await expect(page.getByRole('button', { name: 'Run sample drill' })).toBeEnabled();
});

test('first-screen sample action enters an isolated, resettable demo namespace', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('sb_license:restore-drill-attestor', 'real-license');
    localStorage.setItem('sb_license_verdict:restore-drill-attestor', JSON.stringify({ valid: true, reason: 'ok', checkedAt: Date.now(), token: 'real-license' }));
  });
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveTitle('Demo — Restore Drill Attestor');
  await expect(page.locator('[data-demo-banner]')).toBeVisible();
  await expect(page.locator('[data-operator-content]')).toBeHidden();
  await expect(page.locator('.demo-recording')).toContainText('restore-drill demo');
  await expect(page.locator('.demo-recording')).toContainText('PASSED: restore, 3 checks, and cleanup completed.');
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
  expect(await page.evaluate(() => localStorage.getItem('sb_license:restore-drill-attestor'))).toBe('real-license');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('[data-sheet-status]')).toHaveText('PASSED', { timeout: 6_000 });
  await page.getByRole('link', { name: 'Start for real' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-demo-banner]')).toBeHidden();
});

test('every same-tab exit from demo discards demo-prefixed storage', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
  }));
  await page.goto('/?demo=1#operator-pack');
  await page.getByRole('button', { name: 'Restore an existing license' }).click();
  await page.getByLabel('License token').fill('demo-only-token');
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.locator('[data-license-status]')).toContainText('License active');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('demo:')))).toHaveLength(2);
  await page.getByRole('link', { name: 'Restore Drill Attestor home' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('demo:')))).toEqual([]);
});

test('an invalid license relocks paid content without blocking the free product', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ valid: false, reason: 'revoked', expires_at: null })
  }));
  await page.goto('/?license=revoked-token');
  await expect(page.locator('[data-license-status]')).toContainText('not active');
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
