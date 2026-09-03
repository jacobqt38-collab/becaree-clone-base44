# Base44 Dev Environment

## What this app is

BeCaree — an Arabic RTL car-insurance funnel (React 19 + Vite + TanStack Router
frontend in `client/`). The backend is a separate Cloudflare Worker + D1
(`worker/`, deployed at https://becaree-api.jacgosu.workers.dev) — it is the
system of record; this repo serves only the static customer frontend.

## How it runs here (production static deployment)

Two compose services in `docker-compose.base44.yml`:

- `build` (node:22-slim, one-shot): `pnpm install` then `pnpm exec vite build`
  with `NODE_ENV=production` and the public build-time env vars from
  `.env.base44-defaults` (`VITE_API_BASE_URL`, `VITE_TURNSTILE_SITE_KEY`).
  Writes static output to `dist/public` via the source bind mount.
- `web` (nginx:1.27-alpine): serves `dist/public` on host port 3000 with SPA
  fallback (`nginx.base44.conf`: `try_files ... /index.html`), so direct visits
  to /reg, /payment, etc. return index.html, not 404.

After editing frontend source, rebuild with:
`docker compose -f docker-compose.base44.yml up -d --force-recreate build`
(nginx picks up the new files from disk; no restart needed).

## Build-time env vars (public, not secrets)

`VITE_*` vars are baked into the JS bundle at build time — changing them
requires rerunning the build service. Never put ADMIN_API_TOKEN,
ENCRYPTION_KEY_B64, or TURNSTILE_SECRET_KEY (Worker-side secrets) in this
repo or the frontend.

## CORS note

The deployed Worker answers `Access-Control-Allow-Origin: https://tamnbcare.online`
(set via its `ALLOWED_ORIGIN` secret) and rejects any other origin. Any new
frontend origin (e.g. this preview) must be added to the Worker's CORS
allowlist before the funnel can call the real API.

## What is NOT run here

- The Express/tRPC server (`server/`, `pnpm dev`) — dev-only convenience; the
  customer frontend makes no calls to it.
- The Cloudflare Worker (`worker/`) — deployed separately on Cloudflare.
- MySQL/Drizzle — the static frontend needs no database.

## Useful commands

- Start: `docker compose -f docker-compose.base44.yml up -d`
- Logs: `docker compose -f docker-compose.base44.yml logs -f`
- Health: `curl -sf http://localhost:3000/`
- Rebuild frontend after edits: `docker compose -f docker-compose.base44.yml up -d --force-recreate build`
