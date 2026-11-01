import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import type { Counts } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightSummary = { night: string; counts: Counts };

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightSummary[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  const nights: NightSummary[] = nightsOnDisk(config.runsDir).map((night) => {
    const digest = readNight(config.runsDir, night);
    return { night, counts: digest?.counts ?? { ok: 0, retry: 0, fail: 0 } };
  });
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights,
  };
}
