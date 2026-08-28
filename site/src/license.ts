export const PRODUCT_SLUG = 'restore-drill-attestor';
export const LICENSE_KEY = `sb_license:${PRODUCT_SLUG}`;
export const VERDICT_KEY = `sb_license_verdict:${PRODUCT_SLUG}`;
export const VERIFY_INTERVAL_MS = 86_400_000;

export type Verdict = {
  valid: boolean;
  reason: string;
  checkedAt: number;
  token: string;
};

export function returnedLicense(url: URL): { token: string | null; cleanUrl: string } {
  const token = url.searchParams.get('license')?.trim() || null;
  url.searchParams.delete('license');
  const query = url.searchParams.toString();
  return { token, cleanUrl: `${url.pathname}${query ? `?${query}` : ''}${url.hash}` };
}

export function parseVerdict(value: string | null): Verdict | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<Verdict>;
    if (
      typeof parsed.valid === 'boolean' &&
      typeof parsed.reason === 'string' &&
      typeof parsed.checkedAt === 'number' &&
      typeof parsed.token === 'string'
    ) return parsed as Verdict;
  } catch {
    // A corrupt local value is equivalent to no cached verdict.
  }
  return null;
}

export function verdictIsFresh(verdict: Verdict, token: string, now = Date.now()): boolean {
  return verdict.token === token && now - verdict.checkedAt < VERIFY_INTERVAL_MS;
}
