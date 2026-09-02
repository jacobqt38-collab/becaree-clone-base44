# BeCaree Cloudflare Workers + D1 deployment guide

This guide deploys the backend in `worker/` as a Cloudflare Worker with a native D1 database. It assumes the frontend is already running on its own host and the Worker will be exposed at `https://api.tamnbcare.online`.

The Worker stores encrypted application data and supports only masked card information. Do not modify the deployment to persist full payment-card numbers, CVVs, raw OTP values, or passwords. Use a PCI-compliant payment provider for payment authorization and provider tokenization.

## 1. Prerequisites

You need:

- A Cloudflare account with permission to create Workers, D1 databases, secrets, and DNS/custom domains.
- The `tamnbcare.online` zone active in the same Cloudflare account.
- Node.js and pnpm installed locally.
- The project directory, including `worker/`.
- A Turnstile site key configured in the frontend if production Turnstile enforcement is enabled.
- A PCI-compliant payment provider if the payment page is intended to authorize real payments.

From the repository root:

```bash
cd /path/to/becaree-cloudflare-clone
cd worker
pnpm install
```

Wrangler is installed locally by the Worker package. Prefer `pnpm exec wrangler ...` so the project uses its pinned CLI dependency.

## 2. Authenticate Wrangler

For an interactive workstation login:

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
```

The browser authorization must be completed with the Cloudflare account that owns `tamnbcare.online`. For CI/CD, use a scoped Cloudflare API token instead of a personal interactive session. The token should have only the permissions needed for Workers scripts, D1, and the relevant zone/domain configuration.

## 3. Create the production D1 database

Create the database once:

```bash
pnpm exec wrangler d1 create becaree
```

Wrangler prints a database ID. Copy that ID into `worker/wrangler.toml` in place of:

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

The binding must remain named `DB`, because the Worker reads the database as `env.DB`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "becaree"
database_id = "YOUR_REAL_D1_DATABASE_ID"
migrations_dir = "migrations"
```

Do not commit credentials or secret values. The database ID is not a password, but keep the configuration consistent across environments.

To inspect the database later:

```bash
pnpm exec wrangler d1 info becaree
```

## 4. Apply the initial migration

The project contains `worker/migrations/0001_initial.sql`. It creates:

- `applications` for the application lifecycle.
- `application_steps` for the fixed multi-step flow.
- `application_history` for encrypted audit details.
- `analytics_events` for encrypted, allowlisted telemetry.

For a safe local rehearsal, run:

```bash
pnpm exec wrangler d1 migrations apply becaree --local
```

Apply the migration to production only after reviewing the SQL and confirming the database name:

```bash
pnpm exec wrangler d1 migrations list becaree --remote
pnpm exec wrangler d1 migrations apply becaree --remote
```

Confirm the tables exist:

```bash
pnpm exec wrangler d1 execute becaree --remote --command \
  "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
```

Run every future schema change as a new numbered migration. Do not edit an already-applied migration in place. Create a new file, test it locally, then apply it remotely:

```bash
pnpm exec wrangler d1 migrations create becaree add_example_field
pnpm exec wrangler d1 migrations apply becaree --local
pnpm exec wrangler d1 migrations apply becaree --remote
```

## 5. Generate and configure production secrets

The Worker expects the following secrets:

| Secret | Required | Purpose |
|---|---:|---|
| `ENCRYPTION_KEY_B64` | Yes | 32-byte AES-GCM key used to encrypt application and audit payloads. Losing it makes encrypted data unrecoverable. |
| `ADMIN_API_TOKEN` | Yes | Bearer token for admin application review endpoints. |
| `TURNSTILE_SECRET_KEY` | Recommended | Server-side Turnstile verification key. |

Generate the encryption key once using a trusted machine:

```bash
openssl rand -base64 32
```

Save the output in an approved secrets manager. Do not put it in Git, a ticket, a chat message, `wrangler.toml`, a frontend variable, or a browser bundle.

Upload each secret interactively:

```bash
pnpm exec wrangler secret put ENCRYPTION_KEY_B64
pnpm exec wrangler secret put ADMIN_API_TOKEN
pnpm exec wrangler secret put TURNSTILE_SECRET_KEY
```

Wrangler will prompt for each value. The command updates the deployed Worker version, so set the secrets before the first production deployment whenever possible.

You can list secret names without revealing values:

```bash
pnpm exec wrangler secret list
```

To rotate `ADMIN_API_TOKEN`, generate a new token, update the admin client, then run `wrangler secret put ADMIN_API_TOKEN`. To rotate `ENCRYPTION_KEY_B64`, do not simply replace the key: existing ciphertext can no longer be decrypted. A key rotation requires a planned decrypt-and-re-encrypt migration with an old-key/ new-key transition strategy and backup verification.

## 6. Configure the Worker hostname

The recommended layout is:

- Frontend: `https://tamnbcare.online` or the project’s frontend host.
- API Worker: `https://api.tamnbcare.online`.

Add this to `worker/wrangler.toml`:

```toml
[[routes]]
pattern = "api.tamnbcare.online"
custom_domain = true
```

A Custom Domain sends all paths on that hostname to the Worker. This is appropriate for a dedicated API subdomain. Do not attach this Worker as a Custom Domain to the root `tamnbcare.online` unless you intentionally want the Worker to own every frontend path.

Alternatively, configure the custom domain in Cloudflare Dashboard:

1. Open **Workers & Pages**.
2. Select `becaree-api`.
3. Open **Settings → Domains & Routes**.
4. Choose **Add → Custom Domain**.
5. Enter `api.tamnbcare.online`.
6. Confirm the domain.

Cloudflare creates the DNS record and certificate for a Custom Domain. The hostname must be in an active Cloudflare zone and cannot already have an incompatible CNAME record.

## 7. Configure CORS and the frontend API URL

The current Worker configuration contains:

```toml
[vars]
ALLOWED_ORIGIN = "https://tamnbcare.online"
RATE_LIMIT_PER_MINUTE = "60"
```

If the frontend is also served at `https://www.tamnbcare.online`, either standardize on one canonical hostname or update the Worker CORS implementation to allow the exact second origin. Do not use a wildcard origin for authenticated or personal-data requests.

For a separate API hostname, configure the frontend build variable:

```bash
export VITE_API_BASE_URL="https://api.tamnbcare.online"
```

Use the equivalent environment-variable configuration in the frontend hosting system, then rebuild the frontend:

```bash
cd ..
pnpm install
pnpm check
pnpm build
```

The browser should call URLs such as:

```text
https://api.tamnbcare.online/api/health
https://api.tamnbcare.online/api/applications
```

If the API is instead routed under the same frontend origin at `/api/*`, leave `VITE_API_BASE_URL` empty. The Worker’s current CORS origin is configured for `https://tamnbcare.online`, so change it only when the canonical frontend origin changes.

## 8. Deploy the Worker

From `worker/`:

```bash
pnpm exec wrangler deploy
```

Wrangler reports the Worker URL and deployment version. The production deployment uses `worker/src/index.ts`, the D1 binding, the migration configuration, and the production secrets.

For a first deployment without the custom domain, you can temporarily use the generated `workers.dev` URL for testing. Do not ship the frontend pointing to a temporary URL unless that is intentional.

## 9. Verify the deployment

### Health check

```bash
curl -i https://api.tamnbcare.online/api/health
```

Expected response status: `200`. The response body should be a small JSON object containing `ok: true`.

### CORS preflight

```bash
curl -i -X OPTIONS https://api.tamnbcare.online/api/applications \
  -H 'Origin: https://tamnbcare.online' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type'
```

Confirm that the response allows the exact frontend origin and the required methods/headers.

### Create a test application

Use a non-production test identifier:

```bash
curl -i -X POST https://api.tamnbcare.online/api/applications \
  -H 'Content-Type: application/json' \
  -d '{"applicationId":"APP-DEPLOY01","customerId":"cust-deploy-01","insuranceType":"car"}'
```

The response should contain the application status and the predefined steps. Public responses must not contain decrypted personal data.

### Submit safe test data

```bash
curl -i -X POST \
  https://api.tamnbcare.online/api/applications/APP-DEPLOY01/steps/customer_info \
  -H 'Content-Type: application/json' \
  -d '{"data":{"ownerName":"اختبار النشر","nationalId":"0000000000","phone":"0500000000"}}'
```

For payment testing, send only the cardholder name and last four digits. Use a provider’s sandbox/test tokenization flow for payment authorization. Never send real card numbers or CVVs to this Worker.

### Admin endpoint check

```bash
curl -i https://api.tamnbcare.online/api/admin/applications \
  -H "Authorization: Bearer $ADMIN_API_TOKEN"
```

Confirm that an unauthenticated request returns `403` and an authenticated request returns the test application. Verify that the admin response contains the decrypted application data only for authorized operators.

### D1 verification

Do not inspect encrypted payloads by copying them into external tools. You can verify row counts and schema metadata without decrypting values:

```bash
pnpm exec wrangler d1 execute becaree --remote --command \
  "SELECT COUNT(*) AS applications FROM applications"

pnpm exec wrangler d1 execute becaree --remote --command \
  "SELECT COUNT(*) AS steps FROM application_steps"
```

## 10. Logs and operational monitoring

Tail Worker logs during a controlled test:

```bash
pnpm exec wrangler tail becaree
```

Do not log request bodies, names, phone numbers, authentication tokens, card details, OTPs, or decrypted payloads. The Worker currently logs only a generic failure label and an error message. Review Cloudflare log retention and access permissions for your account.

Monitor:

- Worker request counts and error rate.
- HTTP 429 responses from rate limiting.
- HTTP 403 responses from CORS, admin authorization, or Turnstile failures.
- D1 query errors and storage usage.
- Failed payment-provider calls, if a provider integration is added.
- Secret rotation and operator access events.

## 11. Production payment integration boundary

The Worker is not a payment processor and should not receive raw card credentials. The production sequence should be:

1. The browser loads the authorized payment provider’s hosted fields or tokenization SDK.
2. The provider returns a payment method token or client secret.
3. The Worker receives only the provider token and non-sensitive display metadata such as brand and last four digits.
4. The Worker calls the provider’s server-side API using a secret stored with `wrangler secret put`.
5. D1 stores the provider reference and masked metadata, never the PAN, CVV, or raw authorization credentials.

The same principle applies to authentication passwords and OTPs: use a dedicated identity or messaging provider, store only salted password hashes or short-lived hashed OTP challenges, and delete or expire verification material after use.

## 12. Backup and recovery

Before a destructive schema change, export or snapshot data using your organization’s approved D1 backup process. At minimum, record:

- The current Worker deployment version.
- The current migration list.
- The D1 database ID.
- The names and rotation dates of secrets, never their values.
- The encryption-key custody and recovery procedure.
- The frontend API URL and canonical origin.

The encryption key is part of the data-recovery plan. A D1 backup without the matching encryption key is not sufficient to recover encrypted application payloads.

## 13. Rollback

If a new Worker deployment is faulty:

1. Stop frontend traffic to the affected feature if necessary.
2. Inspect recent deployments in **Workers & Pages → becaree-api → Deployments**.
3. Roll back to the last known-good Worker version using the Cloudflare Dashboard deployment controls or the applicable Wrangler version/deployment commands.
4. Do not roll back D1 schema changes by deleting migration records. Use a forward corrective migration unless the database change was never applied.
5. Re-run `/api/health`, a safe test application request, and an admin authorization check.
6. Record the incident and preserve the failed version for investigation.

A Worker code rollback does not undo a D1 migration. Keep schema changes backward-compatible across at least one deployment transition.

## 14. Recommended pre-launch checklist

- [ ] The D1 `database_id` is real and belongs to the intended Cloudflare account.
- [ ] The production migration applied successfully with `--remote`.
- [ ] `ENCRYPTION_KEY_B64` is present and backed up through an approved secret-management process.
- [ ] `ADMIN_API_TOKEN` is present, long, random, and not used in frontend code.
- [ ] `TURNSTILE_SECRET_KEY` is configured if Turnstile is enabled.
- [ ] `api.tamnbcare.online` resolves to the Worker Custom Domain.
- [ ] The frontend `VITE_API_BASE_URL` points to the production API origin.
- [ ] `ALLOWED_ORIGIN` exactly matches the canonical frontend origin.
- [ ] `pnpm check`, `pnpm build`, and `pnpm exec tsc --noEmit -p tsconfig.json` pass.
- [ ] A safe end-to-end test passes without real customer or payment data.
- [ ] The payment provider integration uses tokenization and sandbox tests.
- [ ] No raw PAN, CVV, password, or OTP values appear in logs, analytics, D1, or browser storage.
- [ ] An operator knows how to rotate secrets and roll back the Worker.

## References

[1]: https://developers.cloudflare.com/workers/wrangler/commands/ "Cloudflare Wrangler commands"
[2]: https://developers.cloudflare.com/d1/reference/migrations/ "Cloudflare D1 migrations"
[3]: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/ "Cloudflare Workers Custom Domains"
[4]: https://developers.cloudflare.com/workers/configuration/secrets/ "Cloudflare Workers secrets"
