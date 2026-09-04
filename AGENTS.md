# Base44 Dev Environment — gosuksa stack

## Architecture

Three services (see `docker-compose.base44.yml`):

| Service | Image | Role |
| --- | --- | --- |
| `build` | node:22-slim | One-shot: `npm install` + `vite build` (nitro node-server) |
| `web` | node:22-slim | Runs `.output/server/index.mjs` — TanStack Start SSR server on port 3000 |
| `backend` | node:22-slim | Express + Socket.IO (`backend/server.js`) on port 8000 |

Traffic:
- REST: browser → `/api-proxy/*` (same-origin, TanStack Start server) → `VITE_BACKEND_WS_URL` (backend on port 8000)
- Socket.IO: browser → `VITE_BACKEND_WS_URL` directly (WebSocket/polling to port 8000)

## Directories

- `client/` — TanStack Start frontend (serves the pre-built gosuksa.com bundle with env injection)
- `backend/` — Express + Socket.IO backend (customer + admin endpoints, JSON file DB)
- `cloudflare-worker/` — Cloudflare Worker edge proxy (deploy separately with `wrangler deploy`)
- `worker/` — legacy BeCaree D1 Worker (not used by this stack)
- `server/` — legacy Express/manus SDK server (not used by this stack)

## Env vars (public, in `.env.base44-defaults`)

- `VITE_RECAPTCHA_SITE_KEY` — Google reCAPTCHA v3 site key
- `VITE_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key
- `VITE_BACKEND_WS_URL` — backend URL (overridden to local backend in compose for the preview; production = `https://gosuksa-edge.bcare.workers.dev`)

## Rebuild after frontend edits

```bash
docker compose -f docker-compose.base44.yml up -d --force-recreate build
docker compose -f docker-compose.base44.yml restart web
```

## Cloudflare Worker deployment (separate, by user)

```bash
cd cloudflare-worker
npm install
npx wrangler login
npx wrangler secret put RECAPTCHA_SECRET   # Google reCAPTCHA secret key
npx wrangler deploy
```

`wrangler.toml` vars: `ORIGIN_URL` (Railway backend), `ALLOWED_ORIGINS` (comma-separated frontend origins).
Add the Base44 preview origin to `ALLOWED_ORIGINS` for the funnel to reach the real backend.

## Useful commands

- Start: `docker compose -f docker-compose.base44.yml up -d`
- Logs: `docker compose -f docker-compose.base44.yml logs -f`
- Health: `curl -sf http://localhost:3000/` and `curl -sf http://localhost:8000/health`
