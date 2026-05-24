# AVI Production Readiness Recheck Report

## Reclassification

Manual infrastructure reconciliation is accepted as the current validated state.

Corrected status:

- Vercel CLI installed and authenticated.
- Firebase CLI installed and authenticated.
- Vercel project binding exists for `avi-certify-platform / avi-certify-web`.
- Production URL exists: `https://avi-certify-web.vercel.app`.
- Preview deployment succeeded.
- Preview browser smoke tests succeeded manually.
- Previous CLI/curl `401` smoke responses were Vercel preview protection, not application failures.
- Firebase active project is `avi-certify-platform`.
- `.firebaserc` and `firebase.json` exist and point to the expected rules/index files.
- Firestore rules dry-run passed.
- Firestore indexes dry-run passed.
- Preview and production env vars contain the required app secret names.

## Verified Current State

Files verified:

- `.vercel/repo.json`
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `storage.rules`
- `.env.vercel.preview`
- `.env.vercel.production`

CLI checks:

- `vercel.cmd --version`: `54.4.1`
- `firebase.cmd --version`: `15.18.0`
- `firebase.cmd use`: `avi-certify-platform`

Quality gate:

- `npm.cmd run lint`: passed
- `npm.cmd run test`: passed, 16 files / 52 tests
- `npm.cmd run build`: passed

Preview:

- deployment id: `dpl_FPvT8im2VRm5aEJhkARjCf7ZdGzw`
- preview URL: `https://avi-certify-e9uyiep3r-avi-certify-platform.vercel.app`
- Vercel status: `READY`
- manual browser smoke tests: passed

## Confirmed Browser Smoke Tests

Validated manually:

- homepage loads
- `/admin/login` reachable and shows admin access screen
- `/admin` redirects to `/admin/login?next=/admin`
- `/dossier/paiement` remains accessible and routes into authenticated payment flow
- `/verifier/test-token` is not intercepted by admin middleware and returns application-level invalid-document behavior

## Corrected Remaining Gates

Resolved and no longer blockers:

- Vercel CLI availability
- Firebase CLI availability
- Vercel project binding
- Firebase project binding
- preview deployment
- preview browser smoke tests
- env var presence by name
- Firestore dry-run compilation

Real remaining gates:

1. Approve and execute live Firestore rules/index deploy.
2. Bootstrap and validate the first production admin custom claim.
3. Confirm real production admin login/session behavior.
4. Confirm release commit/tag.
5. Run production smoke tests after controlled production deploy.
6. Keep rollback prepared.

## Production Status

Production deployment has not been executed in this phase.

Production is not blocked by fake infrastructure assumptions anymore. It is pending the real release gates above.

## Recheck Verdict

Preview and infrastructure readiness are validated. Production can proceed only through the controlled checklist.
