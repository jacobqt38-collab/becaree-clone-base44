# Roadmap — gosuksa.com clone

## Constraints
- Clone gosuksa.com exactly from the uploaded export. No new pages/fields/features/redesign.
- NO Lovable Cloud / Supabase / new backend. Reuse existing deployed API.
- Backend API base: `https://jb-end-production.up.railway.app` (Railway, per user).
  Configured via env `VITE_BACKEND_WS_URL` (see `.env.example`); the original
  bundle's compiled-in fallback (`doctamworkerme.mysemitgo.workers.dev`) is
  replaced at serve time by `src/routes/app-bundle[.]js.ts`.
  Endpoints observed:
  - `GET /api/vicinfomain/captcha`
  - `POST /api/vicinfomain/createRequest`
  - `GET /api/user/init`, `GET /api/chat/enabled`, `/breinit`
  - reCAPTCHA v3 site key + Turnstile site key from bundle
- Submissions must land in the existing admin dashboard → same endpoints, same payload shape.

## Tasks
- [x] Merge admin-dashboard (tmn-backend) contract into backend/server.js:
      /users, /reg, /apply/:id, /company/:id, /visa, /phone(-otp), /visa-otp,
      socket join{role}, bindOrder, newData, paymentForm/visaOtp/phone/phoneOtp/navaz,
      admin control events (acceptService/decline*, adminRedirect, clientBlocked, changeNavazCode).
      Every customer submission is mirrored into state.users so GET /users returns live rows.

- [ ] Inspect original export: routes, sections, forms, fields, copy, styles
- [ ] Port assets (logos, hero, icons) via lovable-assets
- [ ] Rebuild pages/routes in TanStack Start (RTL, Cairo font)
- [ ] Wire forms to existing API with identical request/response contract
- [ ] Responsive parity (mobile/desktop) + final visual comparison

## Fixes
- [x] Site stuck buffering: backend CORS rejected browser calls → all API traffic now
      routed same-origin through `/api-proxy/*` (`src/routes/api-proxy/$.ts`),
      which forwards to the Railway backend server-side.
- [x] Remove KSA-only restriction for now (geo gate bypassed via server-side proxy).
- [x] Remove mobile-only gate: bundle blocked desktop (`blockDesktop: wU()`), patched to
      `false` in `src/routes/app-bundle[.]js.ts` so the site renders on all devices.
- [x] Worker ops: deploy README, npm scripts (login/deploy/tail/secret/verify),
      fail-fast env validation (ORIGIN_URL, ALLOWED_ORIGINS, RECAPTCHA_SECRET)
- [x] Proxy fills in the missing `userInfo` block on `/api/user/init` responses so the
      app passes startup (backend currently returns only `{ok,_id,session}`).

- [ ] BLOCKED (user-side): Railway backend must expose the REST routes the frontend
      calls — `/api/user/init`, `/api/vicinfomain/captcha`, `/api/vicinfomain/createRequest`,
      `/api/chat/enabled`, `/api/data/store-details`, `/api/store-policy`.
      Today it only serves `/`, `/health`, `/socket.io/*`. Once added, the existing
      `/api-proxy/*` forwarding works with no frontend changes.

- [ ] reCAPTCHA site key 6Lc_s6ct… shows "Invalid domain for site key" — add gosuksa-tmin.lovable.app (+ id-preview--175f4f58-4e54-426c-b9c2-7ac4e8f4e2f0.lovable.app) in Google reCAPTCHA console (user action)

- [ ] Deploy Cloudflare Worker (gosuksa-edge) via wrangler — needs CLOUDFLARE_API_TOKEN (user action)

- [ ] Gates start AFTER homepage: homepage loads for everyone (desktop + non-KSA);
      non-KSA or desktop visitors are redirected to the bottom lead form instead of the loading gate.
