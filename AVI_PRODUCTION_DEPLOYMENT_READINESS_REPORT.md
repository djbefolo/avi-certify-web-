# AVI PRODUCTION DEPLOYMENT READINESS REPORT

## 1. Environment Audit

Reviewed the validated fintech/admin reports and deployment-relevant project files:

- `AVI_FINTECH_CALCULATION_ENGINE_REPORT.md`
- `AVI_FINTECH_ADMIN_HARDENING_REPORT.md`
- `ADMIN_MIDDLEWARE_FINAL_CHECK.md`
- `AVI_FINTECH_ADMIN_COMMAND_CENTER_REPORT.md`
- `docs/admin-bootstrap.md`
- `package.json`
- `next.config.ts`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `.env.example`
- `.env.local` key presence only, no values printed

Findings:

- Build system is `npm` with Next.js.
- No `firebase.json` is present.
- No `.firebaserc` is present.
- No `vercel.json` is present.
- No `.vercel/` project binding is present.
- `firebase` CLI is not installed/available in PATH.
- `vercel` CLI is not installed/available in PATH.
- `.env.local` exists but production-critical values are blank locally.
- The working tree contains uncommitted admin command-center and middleware final-check files, plus untracked Excel files. A controlled production deploy should start from a clean, committed release candidate.

## 2. Required Env Vars

No secret values were printed or exposed. Classification below is based on code usage.

| Variable | Classification | Status in local `.env.local` |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | required now; public URLs, SEO, payment redirects, certificate verification URLs | present non-empty |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | required now; client auth/dashboard/upload | present but empty |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | required now; client auth | present but empty |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | required now; client Firebase | present but empty |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | required now; document upload/storage | present but empty |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | required now; client Firebase | present but empty |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | required now; client Firebase | present but empty |
| `FIREBASE_PROJECT_ID` | required now; admin SDK, users, payments, certificates, fintech admin production | present but empty |
| `FIREBASE_CLIENT_EMAIL` | required now; admin SDK | present but empty |
| `FIREBASE_PRIVATE_KEY` | required now; admin SDK and certificate token salt fallback | present but empty |
| `FIREBASE_STORAGE_BUCKET` | required for certificate/storage production if not using `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` fallback | not present |
| `STRIPE_SECRET_KEY` | required for payments | present but empty |
| `STRIPE_WEBHOOK_SECRET` | required for payment webhook and certificate generation flow | present but empty |
| `RESEND_API_KEY` | required for production transactional email; app degrades by skipping emails if absent | present but empty |
| `RESEND_FROM_EMAIL` | required for production email sender identity | present but empty |
| `ADMIN_NOTIFICATION_EMAIL` | required for admin lead notifications | present but empty |
| `NEXT_PUBLIC_POSTHOG_KEY` | optional analytics | present but empty |
| `NEXT_PUBLIC_POSTHOG_HOST` | optional analytics host | present non-empty |
| `ADMIN_FINTECH_DEV_TOKEN` | development/test only; must not be set as production bypass | not present |
| `ADMIN_BOOTSTRAP_EMAIL` | required only for one-time admin claim bootstrap | not present |
| `ADMIN_BOOTSTRAP_DRY_RUN` | optional bootstrap safety flag; defaults to dry run | not present |

Production secret setup is incomplete locally.

## 3. Firebase Admin Validation

Required Firebase Admin vars checked:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Result:

- Firebase Admin validation was not executed against Firestore because all three required local values are empty.
- Service account format and private key newline handling could not be validated with real credentials.
- Admin SDK code does normalize escaped `\n` sequences in `FIREBASE_PRIVATE_KEY`.
- Custom claim capability is implemented through `scripts/bootstrap-admin-claim.mjs`, but cannot be run without Firebase Admin env vars and `ADMIN_BOOTSTRAP_EMAIL`.

Setup instructions before deploy:

1. Create or select a production Firebase service account with the minimum required Admin SDK permissions.
2. Set `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` in the deployment platform as server-only secrets.
3. Store `FIREBASE_PRIVATE_KEY` with escaped newlines (`\n`) if the platform uses one-line secret values.
4. Set `FIREBASE_STORAGE_BUCKET` or ensure `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` points to the production bucket.
5. Run a safe server-side validation that initializes Firebase Admin and performs a read-only Firestore call.
6. Run `npm run admin:bootstrap` in dry-run mode with `ADMIN_BOOTSTRAP_EMAIL`.
7. Apply the admin claim only after confirming the Firebase Auth user exists:

```bash
ADMIN_BOOTSTRAP_DRY_RUN=false npm run admin:bootstrap
```

## 4. Firestore Rules / Index Validation

Static validation completed:

- `firestore.indexes.json` is valid JSON.
- No broad `allow ... if true` rules were found.
- Financial admin collection rules are present for:
  - `financial_products`
  - `fx_rates`
  - `pricing_rules`
  - `risk_surcharge_rules`
  - `financing_simulations`
  - `financing_quotes`
  - `quote_line_items`
  - `client_prefinancing_reports`
  - `admin_financial_audit_events`
- These financial collections deny client SDK read/write access.
- Existing user/dashboard collections remain owner/verified-owner scoped.
- Public certificate verification is server-rendered through Admin SDK and is not exposed through client Firestore rules.

Deployment blockers:

- `firebase` CLI is unavailable.
- `firebase.json` is missing, so rules/index deployment targets are not configured.
- `.firebaserc` is missing, so no Firebase project alias is bound.

Commands to run only after Firebase project binding is configured:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Recommended config to add before Firebase deploy:

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

## 5. Admin Auth Production Path

Validated in code and tests:

- `ADMIN_FINTECH_DEV_TOKEN` is accepted only in `development` and `test`.
- Production admin APIs require Firebase Auth bearer token with admin claims or server-owned `users/{uid}.role === "admin"`.
- Missing auth returns `401`.
- Non-admin users return `403`.
- `/admin` is protected by middleware.
- `/admin/login` is accessible.
- Admin pages and redirects receive noindex headers.
- Admin routes are absent from public navigation.

Production steps still required:

1. Implement or finalize production admin session issuance from Firebase Auth into `avi_admin_session` or equivalent secure session.
2. Bootstrap the first admin custom claim using the documented script.
3. Verify an admin ID token contains `admin: true` or `role: "admin"`.
4. Verify a normal user receives `403` from admin APIs.
5. Document admin claim revocation:

```js
await auth.setCustomUserClaims(uid, { admin: false, role: null })
```

or remove the admin fields from the existing custom claims object.

## 6. Build / Test Results

Commands run:

```bash
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

Results:

- Lint: passed.
- Tests: 15 files passed, 48 tests passed.
- Build: passed.

Production build emitted the expected admin and fintech API routes.

## 7. Preview / Staging Deploy Status

Preview/staging deploy was not executed.

Reasons:

- No Vercel CLI available.
- No Firebase CLI available.
- No `.vercel/` project binding.
- No `vercel.json`.
- No `firebase.json`.
- No `.firebaserc`.
- Production-critical env vars are empty locally.

Controlled deployment path should be:

1. Commit the current release candidate.
2. Configure Vercel or Firebase Hosting explicitly.
3. Set all required production and preview env vars.
4. Deploy preview/staging.
5. Run smoke tests against preview/staging.
6. Deploy production only after preview/staging passes.

## 8. Smoke Test Results

Local production smoke tests were executed with `next start` after successful build.

Public:

- `/`: `200`
- `/dossier/paiement`: `200`
- `/verifier/test-token`: `500`, not redirected to admin. This is expected locally because Firebase Admin env vars are missing for certificate lookup.

Admin:

- `/admin`: `307 Temporary Redirect` to `/admin/login?next=%2Fadmin`
- `/admin` redirect includes `x-robots-tag: noindex, nofollow, noarchive`
- `/admin/login`: `200`
- `/admin/login` includes `X-Robots-Tag: noindex, nofollow, noarchive`
- `/api/admin/fintech/products` unauthenticated: `401`
- `/api/admin/fintech/products` with dev token while running production server: `401`

Fintech:

- Valid production admin-auth fintech calls were not executed because no Firebase Admin credentials and no production admin bearer token are configured.
- Previous development runtime proof remains valid for calculation behavior, including Canada corrected delta `407.29 CAD`, simulation, quote, report, FX update, pricing update, and audit creation.

Firebase:

- Firestore Admin read/write was not executed due missing Firebase Admin env vars.
- Client SDK denial for fintech collections was statically validated in `firestore.rules`, but not emulator-tested because Firebase CLI is unavailable.
- Index JSON parsed successfully.

## 9. Production Deploy Status

Production deploy was not executed.

This was intentional and required by the controlled-deploy gate. The following hard blockers remain:

- Required production env vars are empty locally.
- Firebase Admin credentials are not configured/validated.
- Firebase CLI is unavailable.
- Vercel CLI is unavailable.
- No deployment project binding is present.
- Firestore rules/indexes have not been deployed to a target project.
- Production admin session/custom-claim access has not been smoke-tested with a real admin user.
- Preview/staging deploy and smoke tests have not been completed.

## 10. Rollback Plan

If a future preview or production deploy exposes a critical issue:

1. Stop further deploy promotion.
2. Revert the release commit:

```bash
git revert <release_commit_sha>
```

3. Redeploy the previous known-good build from the hosting provider dashboard or CLI.
4. If Firestore rules/indexes caused access issues, redeploy the previous rules/index bundle:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

5. If admin fintech must be disabled quickly, block `/api/admin/fintech/*` and `/admin` at middleware or hosting firewall level while preserving public routes.
6. If an admin credential or service account is suspected compromised:
   - rotate the service account key
   - remove the old key from the deployment platform
   - redeploy with the new key
7. If an admin user should lose access:
   - remove `admin` / `role: "admin"` custom claims
   - revoke refresh tokens for that Firebase user
8. If Stripe or Resend secrets were exposed, rotate them in their provider dashboards and redeploy.

## 11. Remaining Blockers

Critical:

- Configure production Firebase client and Admin env vars.
- Configure Stripe production/test-mode deployment secrets as appropriate.
- Configure Resend production email secrets.
- Add deployment target binding (`.vercel/` through Vercel link, or Firebase `firebase.json` + `.firebaserc`).
- Install/authenticate deployment CLI in the release environment.
- Deploy Firestore rules/indexes to the correct Firebase project.
- Bootstrap and verify first production admin claim.
- Run preview/staging smoke tests with real configured env vars.

Important:

- Commit or intentionally exclude current uncommitted command-center/middleware files before release tagging.
- Add a formal production admin login/session issuance path and future 2FA.
- Emulator-test Firestore client denial if Firebase CLI becomes available.

## 12. Final Recommendation

Do not deploy production from this workstation/session yet.

The codebase passes local quality gates, and local production smoke tests confirm public/admin protection basics. However, production readiness is blocked by missing deployment target configuration, missing Firebase Admin production secrets, unavailable deployment CLIs, undeployed Firestore rules/indexes, and absence of a real production admin-auth smoke test.

## Final Verdict

C. NOT READY — BLOCKERS REMAIN
