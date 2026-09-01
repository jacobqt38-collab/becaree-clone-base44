# BeCaree frontend clone + Cloudflare Worker API

This project preserves the supplied BeCaree Arabic RTL frontend, route sequence, UI components, visual tokens, assets, and responsive behavior. The previous Supabase workflow has been replaced by a small Cloudflare Worker API backed by D1.

## Frontend

The frontend lives under `client/` and keeps the supplied TanStack Router routes:

`/`, `/reg`, `/owner`, `/compare`, `/payment`, `/otp`, `/phone`, `/phone-otp`, `/confirm`, `/verify`, `/activate`, and `/success`.

Run the frontend preview from the project root:

```bash
pnpm install
pnpm check
pnpm build
```

Set `VITE_API_BASE_URL` only when the Worker is deployed on a separate origin. If Cloudflare routes `/api/*` from the same hostname to the Worker, leave it empty so the browser uses the current origin.

## Cloudflare Worker + D1

The independent backend is in `worker/`.

1. Install Wrangler dependencies:

   ```bash
   cd worker
   pnpm install
   ```

2. Create a D1 database and copy its ID into `worker/wrangler.toml`:

   ```bash
   npx wrangler d1 create becaree
   ```

3. Apply the migration:

   ```bash
   npx wrangler d1 migrations apply becaree --remote
   ```

4. Create a 32-byte AES key and configure secrets. Do not commit the values:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   npx wrangler secret put ENCRYPTION_KEY_B64
   npx wrangler secret put ADMIN_API_TOKEN
   npx wrangler secret put TURNSTILE_SECRET_KEY
   ```

   `TURNSTILE_SECRET_KEY` is optional for local development, but should be set in production when Turnstile is enabled.

5. Deploy:

   ```bash
   npx wrangler deploy
   ```

## API contract

- `POST /api/applications` creates a draft application and its predefined steps.
- `GET /api/applications/:applicationId` returns public application status and step status without decrypted personal data.
- `POST /api/applications/:applicationId/steps/:stepKey` validates and stores a step submission.
- `PATCH /api/applications/:applicationId/insurer` records the selected quote.
- `PATCH /api/applications/:applicationId/current-step` updates the active step.
- `GET /api/applications/:applicationId/steps/:stepKey/status` supports the existing review polling flow.
- `POST /api/track` stores allowlisted, non-sensitive analytics fields.
- `GET /api/admin/applications` and `GET /api/admin/applications/:applicationId` require `Authorization: Bearer <ADMIN_API_TOKEN>`.
- `POST /api/admin/applications/:applicationId/steps/:stepKey/decision` lets an authenticated operator approve or reject a step.

## Data protection

D1 stores only encrypted application metadata, encrypted step data, encrypted audit details, and encrypted allowlisted analytics payloads. The payment route submits only `cardholder_name` and the last four digits (`card_last4`). It does not send or store the full card number, expiry, CVV, or OTP value. Raw phone numbers and names are encrypted before insertion into D1. The Worker also applies request size limits, rate limiting, strict input validation, CORS allowlisting, and optional Turnstile verification.

A production payment flow should still use an authorized PCI-compliant payment provider/tokenization SDK to authorize the payment; the Worker is not a card processor.
