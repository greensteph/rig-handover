// Local reproduction of the Worker's test-writer path. Runs handleTest against a local reply
// endpoint and a local mock tracker, with the real model key. Prints exactly what (if anything)
// the agent would POST back. No external services.
import http from 'node:http';
import fs from 'node:fs';
import { handleTest } from './worker.bundle.js';

const key = fs.readFileSync('SECRETS-to-paste.local.txt', 'utf8')
  .split('\n').find((l) => l.includes('MODEL_API_KEY') && !l.includes('paste your own'))
  ?.split('MODEL_API_KEY')[1].trim();
if (!key) { console.error('no key'); process.exit(1); }

const read = (p) => fs.readFileSync('../rig/rig/' + p, 'utf8');
const files = {
  'src/digest/read.ts': read('src/digest/read.ts'),
  'src/digest/owner.ts': read('src/digest/owner.ts'),
  'src/digest/types.ts': read('src/digest/types.ts'),
};

const issue12 = {
  number: 12, title: 'Digest prints null instead of — for a missing owner', state: 'open', labels: [], by: 'rook',
  body: '`owner: null` renders as `null` on the digest page. Plan says `—`.',
  comments: [
    { by: 'worker', body: 'done: missing owner renders as —' },
    { by: 'rook', body: 'back: runs/2026-10-04.jsonl has 6 jobs, the digest shows 5. The missing one ran at 04:04 +00:00 and its owner is `—`, not null. The fix renders a missing owner as `—` and drops a row whose owner already is one.' },
  ],
};

let captured = null;
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.method === 'GET' && req.url.includes('/rig/tracker/issues/12')) {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(issue12));
    } else if (req.method === 'POST' && req.url.includes('/reply')) {
      captured = body;
      res.writeHead(202); res.end('ok');
    } else {
      res.writeHead(404); res.end('nf');
    }
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const base = `http://127.0.0.1:${port}`;

const env = {
  MODEL_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/openai',
  MODEL_NAME_PULSE: 'gemini-flash-lite-latest',
  MODEL_NAME_TEST: 'gemini-flash-latest',
  MODEL_API_KEY: key,
};
const ping = { kind: 'test', issue: 12, reply: `${base}/reply`, files };

console.log('running handleTest...');
const t0 = Date.now();
try {
  await handleTest(ping, env);
} catch (e) {
  console.log('handleTest threw:', e?.message || e);
}
console.log('elapsed', ((Date.now() - t0) / 1000).toFixed(1) + 's');

if (!captured) {
  console.log('RESULT: NO REPLY POSTED (agent sent nothing)');
} else {
  const j = JSON.parse(captured);
  console.log('RESULT: reply posted. keys:', Object.keys(j));
  console.log('path:', j.path);
  console.log('red:', j.red);
  console.log('test imports read.js:', (j.test || '').includes('../src/digest/read.js'));
  console.log('asserts 6:', /6/.test(j.test || ''), '| 2026-10-04:', (j.test || '').includes('2026-10-04'));
  console.log('--- test (first 1600) ---\n' + (j.test || '').slice(0, 1600));
}
server.close();
process.exit(0);
