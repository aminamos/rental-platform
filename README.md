# Rental Platform

A single-landlord MVP for:

- **Rental payments** — tenants pay charges with Stripe Checkout in test mode; a signed
  webhook (plus the success page as a localhost fallback) marks charges paid.
- **Identity verification** — tenants verify with Stripe Identity; when Stripe is not
  configured or Identity is not enabled, document details go to the landlord for manual
  approve/reject.
- **Maintenance requests** — tenants file requests with category and priority; the landlord
  triages them (open → in progress → resolved) and archives them instead of deleting them.
  Tenants can also archive their own resolved requests.

Built with Next.js (App Router, TypeScript) and the Stripe Node SDK. Demo data lives in
Cloudflare D1 when deployed (a local store in development), so there is no separate
database server to run.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Landlord | `landlord@demo.local` | `demo1234` |
| Tenant (Unit 4B) | `tenant@demo.local` | `demo1234` |
| Tenant (Unit 2A) | `jamie@demo.local` | `demo1234` |

With no Stripe keys configured, “Pay now” opens a clearly labeled demo checkout that charges
nothing, and identity verification uses manual landlord review. Every flow is testable that way.

## Stripe test mode (optional, recommended)

1. Copy the example env file and fill in **test-mode** keys from
   https://dashboard.stripe.com/test/apikeys :

   ```bash
   cp .env.example .env.local
   # STRIPE_SECRET_KEY=sk_test_…
   # NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
   ```

2. Restart `npm run dev`. Pay with test card `4242 4242 4242 4242`, any future expiry,
   any CVC.

3. Webhooks on localhost (optional — the success page also reconciles payments):

   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   # copy the whsec_… value into STRIPE_WEBHOOK_SECRET in .env.local
   ```

4. Stripe Identity must be enabled on the Stripe account for hosted verification. If it is
   not, the app automatically falls back to manual review.

Never commit `.env.local` or real keys. This MVP is wired for test mode; review Stripe's
live-mode, compliance, and payout requirements before collecting real rent.

## Scripts

```bash
npm run dev        # dev server on http://localhost:3000
npm run build      # production build
npm run start      # production server on http://localhost:3000
npm run typecheck  # tsc --noEmit
```

## Deployment (Cloudflare Workers)

Deployed at https://rental-platform.a-8c6.workers.dev

The app runs on Cloudflare Workers via [OpenNext](https://opennext.js.org/cloudflare),
with a D1 database bound as `DB` (see `wrangler.toml`):

```bash
npx wrangler d1 create rental-platform   # put the returned id in wrangler.toml
openssl rand -hex 32 | npx wrangler secret put SESSION_SECRET
NEXT_PUBLIC_APP_URL=https://<your-worker>.workers.dev npm run deploy
```

`npm run deploy` runs `opennextjs-cloudflare build` then `opennextjs-cloudflare deploy`.
Set optional Stripe test secrets the same way (`STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`) and redeploy to enable live test-mode checkout and identity.
Reset demo data with:

```bash
npx wrangler d1 execute rental-platform --remote --command "DELETE FROM app_store WHERE k='main'"
```

## Data and limitations

- State is stored as a single JSON blob: Cloudflare D1 (`app_store` table) on Workers,
  or a local D1/file store in development. It reseeds with demo data when empty. Replace
  this with proper tables before production use — the blob store has no migrations,
  no concurrent-writer protection, and no backups beyond D1 itself.
- Auth is a signed, httpOnly session cookie with PBKDF2-hashed demo passwords. Replace the
  demo accounts and set a strong `SESSION_SECRET` before deploying.
- Manual identity review records only a document type and file name; no document image is
  uploaded or stored. Use Stripe Identity (or a compliant provider) for real verification.
- One landlord, fixed demo units. Multi-landlord accounts, leases, late fees, autopay,
  and email/SMS notifications are out of scope for this MVP.

## API summary

- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
- `GET|POST /api/dues` — list charges; landlord creates a charge
- `POST /api/payments/checkout` — Stripe Checkout session (or demo checkout without keys)
- `POST /api/payments/mock-complete` — completes a demo-checkout payment
- `POST /api/payments/webhook` — Stripe webhook receiver (signature-verified)
- `POST /api/identity/start` — Stripe Identity session (or manual submission)
- `POST /api/identity/review` — landlord approves or rejects a verification
- `GET|POST /api/maintenance`, `PATCH /api/maintenance/[id]` — list/create, then
  update status or archive/restore

## License

MIT — see [LICENSE](LICENSE). Bring your own Stripe keys; none are included in this repo.
`.env*` and `.dev.vars*` files are git-ignored (except `.env.example`, which only holds
placeholders), and deployed secrets belong in `wrangler secret put`, never in git.
