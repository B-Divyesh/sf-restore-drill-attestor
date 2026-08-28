import { describe, expect, it } from 'vitest';
import { parseVerdict, returnedLicense, verdictIsFresh } from './license';

describe('license return handling', () => {
  it('extracts and strips a license without discarding other URL state', () => {
    const result = returnedLicense(new URL('https://example.test/?campaign=launch&license=abc.123#operator-pack'));
    expect(result).toEqual({ token: 'abc.123', cleanUrl: '/?campaign=launch#operator-pack' });
  });

  it('rejects malformed cached verdicts', () => {
    expect(parseVerdict('{"valid":"yes"}')).toBeNull();
    expect(parseVerdict('not json')).toBeNull();
  });

  it('reuses only the same token verdict for less than one day', () => {
    const verdict = { valid: true, reason: 'ok', checkedAt: 1_000, token: 'abc' };
    expect(verdictIsFresh(verdict, 'abc', 1_000 + 60_000)).toBe(true);
    expect(verdictIsFresh(verdict, 'different', 1_001)).toBe(false);
    expect(verdictIsFresh(verdict, 'abc', 1_000 + 86_400_000)).toBe(false);
  });
});
