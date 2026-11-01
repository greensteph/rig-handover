import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

// Reads the real fixture night, read-only (styleguide: don't touch runs/).
describe('readNight', () => {
  it('reads 2026-10-28 into 5 jobs and counts the 1 bad line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest).not.toBeNull();
    expect(digest!.rows.length).toBe(5);
    expect(digest!.badLines).toBe(1);
  });

  it('keeps a null owner as null, and keeps rows sorted by job', () => {
    const digest = readNight('runs', '2026-10-28')!;
    const jobs = digest.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort((a, b) => a.localeCompare(b)));
    const render = digest.rows.find((r) => r.job === 'digest/render')!;
    expect(render.owner).toBeNull();
  });

  it('counts retries and carries the last status and error per job', () => {
    const digest = readNight('runs', '2026-10-28')!;
    const fixtures = digest.rows.find((r) => r.job === 'fixtures/refresh')!;
    expect(fixtures.retries).toBe(3);
    expect(fixtures.lastStatus).toBe('ok');
    const backup = digest.rows.find((r) => r.job === 'notes/backup')!;
    expect(backup.lastStatus).toBe('fail');
    expect(backup.lastError).toBe('quota exceeded');
  });

  it('keeps the log offset on the timestamps, never converting to UTC', () => {
    const digest = readNight('runs', '2026-10-28')!;
    for (const row of digest.rows) {
      expect(row.firstAt).toContain('+01:00');
      expect(row.lastAt).toContain('+01:00');
    }
  });

  it('returns null for a night with no file', () => {
    expect(readNight('runs', '1999-01-01')).toBeNull();
  });
});
