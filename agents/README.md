# rig-agents (Cloudflare Worker)

Hosts rig's two agents that wake alone, for MEGA S01E05. The whole Worker is one self-contained file, `worker.bundle.js` (no build step, only built-in web APIs). It can be pasted straight into the Cloudflare dashboard, or deployed with `wrangler` as below. `local-testharness.mjs` runs the test-writer path in Node against a local endpoint.

One Worker, one origin:

- `GET /.well-known/mega-pulse.json` — owner code + the agents' `may` list, for the course to read.
- `POST /` — a signed course ping (Standard Webhooks). `kind: "pulse"` wakes the pulse; `kind: "test"` wakes the test writer. The reply goes to the ping's `reply` URL.
- `GET /health` — liveness.

## Config

Vars (in `wrangler.jsonc`), default to Google AI Studio's OpenAI-compatible endpoint:

- `MODEL_BASE_URL`, `MODEL_NAME_PULSE`, `MODEL_NAME_TEST`

Secrets (set with `wrangler secret put <NAME>`), never committed:

- `OWNER_CODE` — `own-...` from start-challenge.
- `PING_KEY` — `whsec_...` from start-challenge; the course signs pings with it.
- `MODEL_API_KEY` — the model vendor key.

## Deploy

```sh
npm install
npx wrangler login
npx wrangler secret put OWNER_CODE
npx wrangler secret put PING_KEY
npx wrangler secret put MODEL_API_KEY
npx wrangler deploy
```

The deployed address `https://rig-agents.<subdomain>.workers.dev` is what the course pings.
