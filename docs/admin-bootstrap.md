# AVI CERTIFY Admin Bootstrap

This process grants the first production admin claim to an existing Firebase Auth user. It does not create a password, does not create a default account, and does not store secrets in the repository.

## Required environment

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `ADMIN_BOOTSTRAP_EMAIL`

## Dry run

```bash
npm run admin:bootstrap
```

The script defaults to dry-run mode and logs only a masked email address.

## Apply the claim

```bash
ADMIN_BOOTSTRAP_DRY_RUN=false npm run admin:bootstrap
```

The target Firebase Auth user receives:

```json
{
  "admin": true,
  "role": "admin"
}
```

After bootstrapping, require the user to refresh their Firebase ID token before accessing admin routes. Future production hardening should add mandatory 2FA and a formal approval workflow for admin role changes.
