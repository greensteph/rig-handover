import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

// Route tests use a temp runs dir, because runs/ is read-only (styleguide, plan § 2d).
const dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir };
const app = createApp(config);

beforeAll(() => {
  // A night with two jobs, one fail, plus one line that does not parse.
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      '{"at":"2026-01-01T01:00:00+01:00","job":"a/one","status":"ok","owner":"rook"}',
      '{"at":"2026-01-01T02:00:00+01:00","job":"b/two","status":"fail","owner":null,"error":"boom"}',
      'not json at all',
    ].join('\n') + '\n',
  );
  // An empty night.
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
});

afterAll(() => {
  // temp dir is left for the OS to reap; nothing under runs/ was touched.
});

describe('digest routes', () => {
  it('renders the page for a night that has a file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain('a/one');
    expect(html).toContain('b/two');
    expect(html).toContain('—'); // the null owner
  });

  it('404s for a night with no file', async () => {
    expect((await app.request('/digest/2026-01-09')).status).toBe(404);
    expect((await app.request('/api/digest/2026-01-09')).status).toBe(404);
  });

  it('renders "nothing ran" for an empty night', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('counts a bad line without dropping the night', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['a/one', 'b/two']);
  });

  it('page and JSON agree on the jobs and their order', async () => {
    const html = await (await app.request('/digest/2026-01-01')).text();
    const body = (await (await app.request('/api/digest/2026-01-01')).json()) as { rows: { job: string }[] };
    const order = body.rows.map((r) => r.job);
    const inPage = order.filter((job) => html.includes(job));
    expect(inPage).toEqual(order);
  });
});
