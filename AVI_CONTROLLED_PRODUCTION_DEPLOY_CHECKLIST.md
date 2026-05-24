# AVI Controlled Production Deploy Checklist

## 1. Firestore Rules / Index Live Deploy Approval

- Confirm target Firebase project is `avi-certify-platform`.
- Confirm no pending unintended edits to:
  - `firestore.rules`
  - `firestore.indexes.json`
  - `storage.rules`
- Approve live deploy:

```bash
firebase.cmd deploy --only firestore:rules
firebase.cmd deploy --only firestore:indexes
```

- Confirm Firebase console shows successful deploy.

## 2. First Admin Bootstrap / Custom Claim Validation

- Confirm the first admin Firebase Auth user exists.
- Set `ADMIN_BOOTSTRAP_EMAIL` locally or in a secure operator shell.
- Optional: set `ADMIN_BOOTSTRAP_ROLE=super_admin`.
- Dry run:

```bash
npm run admin:bootstrap
```

- Apply only after dry-run confirmation:

```bash
ADMIN_BOOTSTRAP_DRY_RUN=false npm run admin:bootstrap
```

- Confirm refreshed ID token includes:
  - `admin: true`
  - `role: "super_admin"` or `role: "admin"`

## 3. Production Smoke Confirmation

After production deploy:

- homepage loads
- `/admin/login` loads
- `/admin` redirects when unauthenticated
- placeholder `avi_admin_session` cookie does not grant access
- real admin login creates secure backend session
- admin command center loads for real admin only
- normal Firebase user cannot access admin APIs
- `/api/admin/fintech/products` rejects unauthenticated requests
- `/verifier/test-token` is not intercepted by admin middleware
- `/dossier/paiement` loads and routes into payment flow
- Stripe webhook remains healthy
- Resend email flow remains healthy where testable

## 4. Release Commit / Tag Confirmation

- Ensure `.env.vercel.preview` and `.env.vercel.production` are not committed.
- Ensure Excel source files are intentionally included or intentionally excluded.
- Confirm working tree is clean.
- Create release commit.
- Tag release:

```bash
git tag avi-fintech-admin-auth-v1
```

## 5. Rollback Checklist

If production smoke fails:

- Stop further deploys.
- Revert release commit:

```bash
git revert <release_commit_sha>
```

- Redeploy previous Vercel production build from dashboard or CLI.
- If Firestore rules/indexes caused the issue, redeploy previous rules/indexes.
- If admin auth fails closed, keep `/admin` unavailable and preserve public site.
- If a secret is exposed, rotate it immediately.
- If an admin claim is wrong, remove/rewrite Firebase custom claims and revoke refresh tokens.

## 6. Controlled Production Deploy Readiness

Production deploy may proceed only when:

- preview deploy passed
- preview browser smoke passed
- Firestore live deploy approved
- first admin custom claim validated
- release commit/tag confirmed
- rollback owner and previous build identified

Production command, only after approval:

```bash
vercel.cmd deploy --prod
```
