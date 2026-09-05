# Deployment Guide — gosuksa stack

Four moving parts:

| Part | Where it runs | URL |
| --- | --- | --- |
| Backend API (Express + Socket.IO) | Railway | `https://jbackend-production-dc1b.up.railway.app` |
| Edge front door (Cloudflare Worker) | Cloudflare | `https://gosuksa-edge.bcare.workers.dev` |
| Customer frontend (this project) | Lovable | `https://gosuksa-tmin.lovable.app` |
| Admin dashboard | Lovable | `https://admin-companion-88.lovable.app` |

Traffic: browser → Worker (REST + Socket.IO) → Railway backend.
Dashboard browser → Railway backend directly (REST + Socket.IO).

---

## 1. Backend (Railway)

### 1.1 Push the code
```bash
unzip -o gosuksa-backend_v7.zip -d gosuksa-backend
cd gosuksa-backend
git init && git add . && git commit -m "backend v7"
git remote add origin git@github.com:<you>/gosuksa-backend.git
git push -u origin main
```
If the repo already exists, just copy `server.js` (+ `captcha.js`, `package.json`) over it, commit and push — Railway auto-deploys.

### 1.2 Create/confirm the service
1. railway.app → New Project → Deploy from GitHub repo.
2. Nixpacks detects Node and runs `npm start` (see `railway.json` / `Procfile`).
3. Settings → Networking → Generate Domain.

### 1.3 Persistent storage (required)
Settings → Volumes → New Volume, mount path `/data`.
Without it every redeploy wipes stored submissions.

### 1.4 Variables
```
ADMIN_TOKEN=<long random string>
RECAPTCHA_SECRET=<secret key matching the frontend site key>
CORS_ORIGINS=https://gosuksa-tmin.lovable.app,https://admin-companion-88.lovable.app
DATA_FILE=/data/data.json
CHAT_ENABLED=1
ADMIN_LIST_PROTECTED=0        # set 1 to require the bearer token on GET /users
VIC_UPSTREAM_URL=             # real vehicle-info provider endpoint (optional)
VIC_UPSTREAM_TOKEN=           # provider key, if required
```
Do **not** set `PORT` — Railway injects it.
`CORS_ORIGINS`: comma-separated, no spaces, no trailing slashes.

### 1.5 Verify
```bash
BASE=https://jbackend-production-dc1b.up.railway.app
TOKEN=<ADMIN_TOKEN>

curl -s $BASE/version                       # must show the version you just pushed
curl -s $BASE/breinit                       # {"ok":true}
curl -s -H "Authorization: Bearer $TOKEN" $BASE/admin/submissions | head -c 400
curl -s -H "Authorization: Bearer $TOKEN" $BASE/users | head -c 400
```
`/version` still showing the old version = the push didn't land; re-check the repo Railway builds from.

---

## 2. Cloudflare Worker (wrangler)

Source: `backend/worker/` in this project (also shipped as `gosuksa-worker.zip`).

```bash
cd ~/Downloads
unzip -o gosuksa-worker.zip
cd worker              # must be the folder containing wrangler.toml
npm install
npx wrangler login     # or: export CLOUDFLARE_API_TOKEN=...
```

### 2.1 Check `wrangler.toml`
```toml
name = "gosuksa-edge"
main = "src/index.js"
compatibility_date = "2024-11-01"

[vars]
ORIGIN_URL = "https://jbackend-production-dc1b.up.railway.app"
ALLOWED_ORIGINS = "https://gosuksa-tmin.lovable.app,https://id-preview--175f4f58-4e54-426c-b9c2-7ac4e8f4e2f0.lovable.app"
```
Rules the Worker enforces at boot (bad values → `500 worker_misconfigured`):
- `ORIGIN_URL` absolute `http(s)` URL, no trailing path.
- `ALLOWED_ORIGINS` bare origins only, comma-separated, no slashes/wildcards.

### 2.2 Secret
```bash
npx wrangler secret put RECAPTCHA_SECRET
```
Same secret key as the reCAPTCHA site key used by the frontend.

### 2.3 Deploy + verify
```bash
npx wrangler deploy
npm run verify          # or: node scripts/verify.mjs https://gosuksa-edge.bcare.workers.dev
npx wrangler tail       # live logs while testing the site
```
`verify` checks: `/breinit` 200, CORS allowed for the site origin, CORS blocked for an
unlisted origin, Socket.IO polling handshake advertising `websocket`.

### 2.4 Adding a new frontend domain
1. Append the origin to `ALLOWED_ORIGINS`, `npx wrangler deploy`.
2. Add the hostname in the Google reCAPTCHA and Cloudflare Turnstile consoles.
3. Add it to Railway `CORS_ORIGINS` too.
4. Re-run `node scripts/verify.mjs`.

---

## 3. Customer frontend (this Lovable project)

### 3.1 Configuration
Set in Lovable project env (see `.env.example`):
```
VITE_BACKEND_WS_URL=https://gosuksa-edge.bcare.workers.dev
VITE_RECAPTCHA_SITE_KEY=<reCAPTCHA v3 site key>
VITE_TURNSTILE_SITE_KEY=<Turnstile site key>
```
`src/routes/app-bundle[.]js.ts` rewrites the compiled bundle at serve time so the API
base, Socket.IO base, and captcha keys come from these variables — never hard-code them.
REST goes same-origin through `/api-proxy/*`; Socket.IO talks to the Worker directly.

### 3.2 Deploy
Click **Publish** in Lovable (top right; bottom-right on mobile preview) → **Update**.
Frontend changes need that click; server-side routes deploy with it.

### 3.3 Verify
```bash
curl -s https://gosuksa-tmin.lovable.app/app-bundle.js | grep -o 'gosuksa-edge[^"]*' | head
curl -s https://gosuksa-tmin.lovable.app/api-proxy/breinit
```
Then load the site, open a form, and watch `npx wrangler tail` plus
`GET /admin/submissions` on Railway for the new row.

---

## 4. Admin dashboard

The dashboard is a separate Lovable project. Point it at the backend:

1. `src/lib/backend.ts`:
   ```ts
   export const RAILWAY_BASE: string = "https://jbackend-production-dc1b.up.railway.app";
   ```
2. Send `Authorization: Bearer <ADMIN_TOKEN>` on:
   - `GET /admin/submissions` — full form payloads
   - `GET /admin/state` — raw dump
   - `GET /users` — visitor/session rows (public unless `ADMIN_LIST_PROTECTED=1`)
3. Socket.IO to the same base, join with
   `{ userType: "admin", userInfo: { adminToken: "<ADMIN_TOKEN>" } }`, and listen for:
   `live:update`, `live:updatesHistory`, `form:submitted`, `sessionUpdate`, `newVisitor`.
4. Make sure the dashboard origin is in Railway `CORS_ORIGINS`.
5. Publish the dashboard project.

Field mapping for submission rows: `payload.identityNumber`, `payload.mobileNumber`,
`payload.sequenceNumber`, `payload.result`, optional `payload.vehicle`.

---

## 5. Order of operations for a full redeploy

1. Railway backend (volume + variables) → confirm `/version`.
2. Worker: `npx wrangler deploy` → `npm run verify`.
3. Frontend: set `VITE_BACKEND_WS_URL` → Publish → check `/app-bundle.js`.
4. Dashboard: set `RAILWAY_BASE` → Publish → confirm submissions load.

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| Submissions in `/admin/submissions` but not on the dashboard session list | Backend older than v7 — push v7 `server.js` and redeploy |
| Data resets on redeploy | Volume not mounted at `/data` or `DATA_FILE` unset |
| Browser CORS error | Origin missing from Railway `CORS_ORIGINS` and/or Worker `ALLOWED_ORIGINS` |
| `500 worker_misconfigured` | `ORIGIN_URL` / `ALLOWED_ORIGINS` malformed |
| "Invalid domain for site key" | Add the hostname in the reCAPTCHA console |
| `invalid-input-secret` in `wrangler tail` | `RECAPTCHA_SECRET` doesn't match the site key |
| `cd: no such file or directory: backend/worker` | That path exists only inside the Lovable project — unzip the worker zip locally first |
