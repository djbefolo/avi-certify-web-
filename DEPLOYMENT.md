# AVI CERTIFY Deployment Guide

This guide prepares a clean staging deployment on Vercel. It does not cover final production hardening.

## Deployment Target

- Platform: Vercel
- Framework preset: Next.js
- Build command: `npm.cmd run build` locally, `npm run build` on Vercel
- Install command: `npm install`
- Output directory: managed by Next.js and Vercel
- Node runtime: Vercel default Node.js runtime compatible with Next.js 15

## Required Environment Variables

Configure these in Vercel Project Settings > Environment Variables for the staging environment.

### Public Browser Variables

These are exposed to the browser by design.

```env
NEXT_PUBLIC_APP_URL=https://your-staging-domain.vercel.app
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

### Server-Only Variables

Never prefix these with `NEXT_PUBLIC_`.

```env
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=
ADMIN_NOTIFICATION_EMAIL=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

For `FIREBASE_PRIVATE_KEY`, store the full private key exactly as provided by Firebase Admin. If Vercel stores it on one line, escaped `\n` newlines are supported by the app.

## Firebase Setup

1. Create or select the Firebase staging project.
2. Enable Firebase Auth email/password provider.
3. Configure authorized domains:
   - `localhost` for local development.
   - the Vercel staging domain.
4. Create a Firebase Admin service account for staging.
5. Add the Firebase client variables and Admin variables in Vercel.
6. Deploy Firestore rules from `firestore.rules`.
7. Deploy Storage rules from `storage.rules`.
8. Confirm Storage bucket name matches `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`.

## Vercel Project Setup

1. Create a new Vercel project.
2. Import the GitHub repository if GitHub is connected.
3. Select the Next.js framework preset.
4. Keep the default build output settings.
5. Set the build command to `npm run build`.
6. Add all required environment variables for Preview/Staging.
7. Deploy a preview/staging build.

## Local Preflight

Before pushing or deploying:

```bash
npm.cmd run predeploy
npm.cmd audit --audit-level=moderate
```

The current audit has low severity transitive Firebase/Google Cloud findings only. Do not run `npm audit fix --force` without review because it can introduce breaking dependency changes.

## Post-Deployment Verification

After the staging deployment finishes:

1. Open the staging URL and verify the homepage loads.
2. Check public routes:
   - `/`
   - `/services`
   - `/contact`
   - `/faq`
   - `/connexion`
3. Submit a test lead and confirm:
   - `/api/leads` returns success.
   - Firestore contains the lead.
   - Resend sends or safely skips emails depending on env config.
4. Create a test account and confirm:
   - Firebase Auth user exists.
   - Firestore `users/{uid}` profile is created.
   - `/dashboard` is reachable after login.
5. Upload a small PDF/JPG/PNG under 5 MB and confirm:
   - Storage path is under `users/{uid}/documents/...`.
   - Firestore document metadata is created.
6. Start a Stripe Checkout test payment and confirm:
   - The client sends only `serviceType`.
   - The API returns a Checkout URL.
   - No Stripe secret appears in the browser.
7. Check private routes are blocked while logged out:
   - `/dashboard`
   - `/dossier`
   - `/dossier/documents`
   - `/dossier/paiement`
   - `/profil`
8. Verify SEO/security endpoints:
   - `/robots.txt`
   - `/sitemap.xml`
   - response security headers in browser devtools or `curl -I`.

## Common Issues

- `Firebase client config is missing`: one or more `NEXT_PUBLIC_FIREBASE_*` variables are absent in Vercel.
- `Missing required Firebase Admin env var`: server-only Admin variables are absent or attached to the wrong Vercel environment.
- `private key invalid`: preserve newlines or use escaped `\n` in `FIREBASE_PRIVATE_KEY`.
- Auth works locally but not on staging: add the Vercel domain to Firebase Auth authorized domains.
- Upload fails with permission denied: deploy both Firestore and Storage rules, and confirm the user is authenticated.
- Stripe Checkout fails: use a valid staging/test `STRIPE_SECRET_KEY` and set `NEXT_PUBLIC_APP_URL` to the staging origin.
- Emails skipped: `RESEND_API_KEY` or recipient variables are missing. This is safe in development/staging but should be configured for full staging tests.
- CSP blocks a vendor request: inspect the blocked URL and add the exact origin only if it is required and trusted.

## Final Production Blockers

Do not treat staging as final production until these items are implemented:

- Signed Stripe webhook with idempotency and payment reconciliation.
- Strong anti-abuse controls: Redis/Upstash rate limit, App Check, CAPTCHA or WAF.
- Server-side session or middleware protection for private routes.
- RGPD/cookie consent and analytics policy.
- SPF, DKIM and DMARC for transactional email.
- Antivirus or malware scanning pipeline for uploaded documents.
- Monitoring, alerting, audit logs and quota alerts.
- Firebase rules tested against emulator scenarios.
