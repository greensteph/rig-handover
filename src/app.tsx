import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/reader.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Digest } from './views/digest.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // The digest page. Same rows as the JSON below, by construction (ADR 0001).
  app.get('/digest/:night', (c) => {
    const digest = readNight(config.runsDir, c.req.param('night'));
    if (!digest) {
      return c.html(
        <Layout title="digest" lane={lane()}>
          <p class="warn">no run log for that night</p>
        </Layout>,
        404,
      );
    }
    return c.html(
      <Layout title={`digest · ${digest.night}`} lane={lane()}>
        <Digest digest={digest} />
      </Layout>,
    );
  });

  // The same digest as JSON. Agents read this one; it must not disagree with the page (ADR 0001).
  app.get('/api/digest/:night', (c) => {
    const digest = readNight(config.runsDir, c.req.param('night'));
    if (!digest) return c.json({ error: 'no run log for that night' }, 404);
    return c.json(digest);
  });

  return app;
}
