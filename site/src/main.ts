import './styles.css';
import {
  LICENSE_KEY,
  PRODUCT_SLUG,
  VERDICT_KEY,
  parseVerdict,
  returnedLicense,
  verdictIsFresh,
  type Verdict
} from './license';

const select = <T extends Element>(selector: string): T | null => document.querySelector<T>(selector);
const selectAll = <T extends Element>(selector: string): T[] => Array.from(document.querySelectorAll<T>(selector));
const demoMode = new URLSearchParams(location.search).get('demo') === '1';
const demoPrefix = 'demo:';

function localKey(key: string): string {
  return demoMode ? `${demoPrefix}${key}` : key;
}

function clearDemoStorage(): void {
  Object.keys(localStorage)
    .filter(key => key.startsWith(demoPrefix))
    .forEach(key => localStorage.removeItem(key));
}

function setConnectionState(online = navigator.onLine): void {
  const strip = select<HTMLElement>('[data-connection]');
  if (!strip) return;
  strip.hidden = online;
  strip.textContent = online ? '' : 'Offline — cached documentation and the free demo remain available. License verification will resume when connected.';
}

async function checkConnectionState(): Promise<void> {
  if (!navigator.onLine) {
    setConnectionState(false);
    return;
  }
  try {
    const response = await fetch('/robots.txt', { method: 'HEAD', cache: 'no-store' });
    setConnectionState(response.ok);
  } catch {
    setConnectionState(false);
  }
}

window.addEventListener('online', () => void checkConnectionState());
window.addEventListener('offline', () => setConnectionState(false));
void checkConnectionState();

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}

selectAll<HTMLButtonElement>('[data-copy-target]').forEach(button => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget || '');
    if (!target) return;
    const original = button.textContent || 'Copy';
    try {
      await navigator.clipboard.writeText(target.textContent || '');
      button.textContent = 'Copied';
    } catch {
      button.textContent = 'Select and copy';
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    window.setTimeout(() => { button.textContent = original; }, 1800);
  });
});

let demoRun = 0;
const delay = (milliseconds: number) => new Promise(resolve => window.setTimeout(resolve, milliseconds));

async function runDemo(shouldFail: boolean): Promise<void> {
  const stages = selectAll<HTMLElement>('[data-stage]');
  const status = select<HTMLElement>('[data-sheet-status]');
  const stamp = select<HTMLElement>('[data-sheet-stamp]');
  const announcer = select<HTMLElement>('[data-demo-announcer]');
  const buttons = selectAll<HTMLButtonElement>('[data-run-demo], [data-fail-demo]');
  if (!stages.length || !status || !stamp || !announcer) return;

  const currentRun = ++demoRun;
  buttons.forEach(button => { button.disabled = true; });
  status.textContent = 'RUNNING';
  status.className = 'running';
  stamp.textContent = 'DRILL IN PROGRESS';
  stamp.className = 'sheet-stamp running';
  stages.forEach(stage => {
    stage.className = '';
    const detail = stage.querySelector('small');
    const time = stage.querySelector('time');
    if (detail) detail.textContent = 'Waiting';
    if (time) time.textContent = '—';
  });

  const labels = ['Creating isolated target', 'Restoring latest backup', 'Running declared checks', 'Removing target and volumes'];
  const timings = ['1.8s', '42.7s', shouldFail ? '0.9s' : '2.4s', '1.3s'];
  for (let index = 0; index < stages.length; index += 1) {
    if (currentRun !== demoRun) return;
    const stage = stages[index];
    stage.className = 'active';
    const detail = stage.querySelector('small');
    if (detail) detail.textContent = labels[index];
    announcer.textContent = `Stage ${index + 1} of 4: ${labels[index]}.`;
    await delay(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 60 : 520);
    const failedCheck = shouldFail && index === 2;
    stage.className = failedCheck ? 'failed' : 'passed';
    if (detail) detail.textContent = failedCheck ? 'Schema marker not found' : index === 3 && shouldFail ? 'Cleanup still completed' : 'Passed';
    const time = stage.querySelector('time');
    if (time) time.textContent = timings[index];
  }

  const outcome = shouldFail ? 'FAILED / CLEANED' : 'PASSED';
  status.textContent = outcome;
  status.className = shouldFail ? 'failed' : 'passed';
  stamp.textContent = shouldFail ? 'CHECK FAILED' : 'RESTORE VERIFIED';
  stamp.className = `sheet-stamp ${shouldFail ? 'failed' : 'passed'}`;
  announcer.textContent = shouldFail
    ? 'Sample drill failed its schema check. Cleanup still passed and failure evidence is ready.'
    : 'Sample restore verified. The isolated target was destroyed and evidence is ready.';
  buttons.forEach(button => { button.disabled = false; });
}

select<HTMLButtonElement>('[data-run-demo]')?.addEventListener('click', () => void runDemo(false));
select<HTMLButtonElement>('[data-fail-demo]')?.addEventListener('click', () => void runDemo(true));

if (demoMode) {
  document.title = 'Demo — Restore Drill Attestor';
  const banner = select<HTMLElement>('[data-demo-banner]');
  if (banner) banner.hidden = false;
  window.setTimeout(() => void runDemo(false), 0);
}

select<HTMLButtonElement>('[data-reset-demo]')?.addEventListener('click', () => {
  clearDemoStorage();
  demoRun += 1;
  void runDemo(false);
});
select<HTMLAnchorElement>('[data-start-real]')?.addEventListener('click', clearDemoStorage);

if (demoMode) {
  document.addEventListener('click', event => {
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!link || link.target === '_blank') return;
    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin || new URLSearchParams(destination.search).get('demo') !== '1') {
      clearDemoStorage();
    }
  });
}

const licenseForm = select<HTMLFormElement>('[data-license-form]');
const licenseStatus = select<HTMLElement>('[data-license-status]');
const operatorContent = select<HTMLElement>('[data-operator-content]');

function showUnlocked(unlocked: boolean): void {
  if (operatorContent) operatorContent.hidden = !unlocked;
  document.documentElement.classList.toggle('licensed', unlocked);
}

function setLicenseStatus(message: string, state = ''): void {
  if (!licenseStatus) return;
  licenseStatus.textContent = message;
  licenseStatus.dataset.state = state;
}

async function verifyLicense(token: string, optimistic = false): Promise<void> {
  if (optimistic) showUnlocked(true);
  if (!navigator.onLine) {
    setLicenseStatus('License saved locally. Verification will retry when you are online.', 'quiet');
    return;
  }
  setLicenseStatus('Verifying license…', 'quiet');
  try {
    const endpoint = `https://api.sociobot.in/api/v1/products/${PRODUCT_SLUG}/verify?license=${encodeURIComponent(token)}`;
    const response = await fetch(endpoint, { headers: { accept: 'application/json' } });
    if (!response.ok) throw new Error('verification unavailable');
    const data = await response.json() as { valid?: boolean; reason?: string };
    const verdict: Verdict = { valid: data.valid === true, reason: data.reason || 'invalid', checkedAt: Date.now(), token };
    localStorage.setItem(localKey(VERDICT_KEY), JSON.stringify(verdict));
    showUnlocked(verdict.valid);
    setLicenseStatus(verdict.valid ? 'License active. Operator Pack is available below.' : 'License no longer active. You can purchase a new license.', verdict.valid ? 'valid' : 'invalid');
  } catch {
    setLicenseStatus('Could not verify right now. The free CLI and documentation are still available.', 'quiet');
  }
}

function initializeLicense(): void {
  if (!licenseForm) return;
  const returned = returnedLicense(new URL(location.href));
  let token = localStorage.getItem(localKey(LICENSE_KEY))?.trim() || '';
  if (returned.token) {
    token = returned.token;
    localStorage.setItem(localKey(LICENSE_KEY), token);
    history.replaceState({}, '', returned.cleanUrl);
    showUnlocked(true);
    setLicenseStatus('Purchase returned. Verifying your license…', 'quiet');
    void verifyLicense(token, true);
    return;
  }
  if (!token) return;
  const verdict = parseVerdict(localStorage.getItem(localKey(VERDICT_KEY)));
  if (verdict?.token === token) {
    showUnlocked(verdict.valid);
    setLicenseStatus(verdict.valid ? 'License active. Operator Pack is available below.' : 'License no longer active.', verdict.valid ? 'valid' : 'invalid');
  }
  if (!verdict || !verdictIsFresh(verdict, token)) void verifyLicense(token, verdict?.valid === true);
}

select<HTMLButtonElement>('[data-show-license]')?.addEventListener('click', () => {
  if (!licenseForm) return;
  licenseForm.hidden = false;
  select<HTMLInputElement>('#license-token')?.focus();
});

licenseForm?.addEventListener('submit', event => {
  event.preventDefault();
  const field = select<HTMLInputElement>('#license-token');
  const token = field?.value.trim() || '';
  if (!token) {
    setLicenseStatus('Paste the complete license token to continue.', 'invalid');
    field?.focus();
    return;
  }
  localStorage.setItem(localKey(LICENSE_KEY), token);
  localStorage.removeItem(localKey(VERDICT_KEY));
  void verifyLicense(token, true);
});

window.addEventListener('online', () => {
  const token = localStorage.getItem(localKey(LICENSE_KEY))?.trim();
  const verdict = parseVerdict(localStorage.getItem(localKey(VERDICT_KEY)));
  if (token && (!verdict || !verdictIsFresh(verdict, token))) void verifyLicense(token, verdict?.valid === true);
});

initializeLicense();
