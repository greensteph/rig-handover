import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Counts, DigestRow, JobStatus, NightDigest } from './types.js';

const STATUSES: readonly JobStatus[] = ['ok', 'retry', 'fail'];
const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

type Event = { at: string; job: string; status: JobStatus; owner: string | null; error: string | null };

// Parse one JSONL line at the edge. A line that doesn't parse, or isn't a run event, is bad:
// the caller counts it and moves on.
function parseEvent(line: string): Event | null {
  let value: unknown;
  try {
    value = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const o = value as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status as JobStatus)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as JobStatus,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export function readNight(runsDir: string, night: string): NightDigest | null {
  if (!NIGHT.test(night)) return null; // not a night; also keeps the path inside runsDir

  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null; // no file for this night
  }

  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  let badLines = 0;
  const byJob = new Map<string, Event[]>();

  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    const ev = parseEvent(line);
    if (!ev) {
      badLines++; // counted, never thrown; the night still renders
      continue;
    }
    counts[ev.status]++;
    const events = byJob.get(ev.job) ?? [];
    events.push(ev);
    byJob.set(ev.job, events);
  }

  const rows: DigestRow[] = [...byJob.entries()]
    .map(([job, events]) => {
      const ordered = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
      const last = ordered[ordered.length - 1];
      return {
        job,
        owner: last.owner,
        runs: ordered.length,
        retries: ordered.filter((e) => e.status === 'retry').length,
        lastStatus: last.status,
        lastError: last.error,
        firstAt: ordered[0].at,
        lastAt: last.at,
      };
    })
    .sort((a, b) => a.job.localeCompare(b.job));

  return { night, rows, counts, badLines };
}
