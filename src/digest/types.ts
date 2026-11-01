// The digest contract. Section 2 of the morning-digest plan builds against this file alone.

export type JobStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // null stays null; the view shows it as —
  runs: number;
  retries: number;
  lastStatus: JobStatus;
  lastError: string | null;
  firstAt: string; // the 'at' string from the log, offset kept, never converted
  lastAt: string;
};

export type Counts = { ok: number; retry: number; fail: number };

// What one night reads into: rows per job, event counts for the board, and how many lines
// could not be parsed (counted, never thrown).
export type NightDigest = {
  night: string;
  rows: DigestRow[];
  counts: Counts;
  badLines: number;
};

// Read runs/<night>.jsonl into a NightDigest. Returns null when the night has no file,
// so a route can answer 404.
export type ReadNight = (runsDir: string, night: string) => NightDigest | null;
