# Base44 Dev Environment

## What this app is

BeCaree — an Arabic RTL car-insurance funnel (Vite + React + TanStack Router frontend)
with an Express + tRPC server and an optional Cloudflare Worker + D1 backend (`worker/`).

## How it runs here

- Single compose service `web` (node:22-slim) runs the Express dev server via
  `pnpm dev` (`tsx watch server/_core/index.ts`). The Express server uses Vite in
  **middleware mode** to serve the React frontend + the tRPC API on port 3000.
- Source is bind-mounted at `/app`; `node_modules` is an anonymous volume so host
  installs don't clobber it. Edits hot-reload through Vite HMR + `tsx watch`.
- No database is required to boot. `server/db.ts` lazily creates the Drizzle/MySQL
  connection only when `DATABASE_URL` is set; without it the app logs a warning and
  continues. The public insurance funnel works without a DB.
- No external secrets are required. All env vars in `server/_core/env.ts` default to
  empty strings. The OAuth/SDK layer logs a warning when `OAUTH_SERVER_URL` is
  missing but does not crash; auth is optional in the tRPC context.

## Frontend local-preview mode

When `VITE_API_BASE_URL` is empty (the default here), `client/src/lib/workflow.ts`
sets `LOCAL_PREVIEW_MODE = true` and the multi-step funnel uses in-browser mock
data (localStorage) instead of calling the Cloudflare Worker. `client/src/lib/gate.ts`
silently swallows failed fetches. So the full funnel renders without the Worker.

## External hostname / preview

The Express server does not restrict the Host header, and `server/_core/vite.ts`
sets `allowedHosts: true` in Vite middleware mode, so the preview's external
hostname works without extra config.

## Useful commands

- Start: `docker compose -f docker-compose.base44.yml up -d`
- Logs: `docker compose -f docker-compose.base44.yml logs -f web`
- Health: `curl -sf http://localhost:3000/`
- Type check: `pnpm check` (inside the container)
- Tests: `pnpm test`

## Cloudflare Worker (not run here)

`worker/` is the production backend (Cloudflare Worker + D1). It is not part of
the dev preview. To deploy it, follow `DEPLOYMENT.md` and `worker/wrangler.toml`.
