# Housing Certificate Premium Delivery V4

## Scope

This delivery upgrades the conditional housing certificate presentation and its
operational delivery around the existing housing workflow. It does not change
the Stripe ownership checks, Firebase authorization, certificate verification
contract, or auto-issuance eligibility policy.

## Premium PDF

- Template: `src/lib/certificates/templates/housing-certificate-france.html`
- Renderer: `src/lib/certificates/certificate-generator.ts`
- Rendering: server-side HTML to PDF through `puppeteer-core` and
  `@sparticuz/chromium`
- Source data: the existing `certificateSnapshot` created at allocation time
- Verification: the existing backend-generated `verificationUrl` is encoded in
  the QR code; no verification host is hardcoded in the template
- Storage: the existing private path
  `users/{uid}/documents/{certificateId}-attestation-hebergement.pdf`
- Signature: an optional server-only
  `HOUSING_CERTIFICATE_SIGNATURE_STAMP_DATA_URL` accepts only image data URLs;
  no signature image or personal name is embedded in source control

The template is designed as one A4 administrative page with the official logo,
centered title, conditional status, beneficiary identity, structured housing
facts, legal conditionality notice, QR verification block, and an electronic
issuance signature area. It does not introduce new corporate or regulatory
claims.

## Price and Payment Integrity

The conditional housing service is `99 EUR` (`9900` euro cents) in the
server-side payment configuration. The client interface, pricing page, and
service copy display the same price. Stripe Checkout reads the amount from the
server config, and the webhook continues to reject any amount mismatch before
confirmation or document job creation.

## Manual Review Delivery

For a paid request that remains in manual review, the workflow now maintains:

- an idempotent internal `admin_notifications` item titled
  `Nouvelle demande logement payee - validation requise`;
- the existing client follow-up email and communication log;
- a separate idempotent admin email through `ADMIN_NOTIFICATION_EMAIL`, with
  its own `communication_logs/housing_review_admin_{paymentId}` record.

The existing manual allocation route keeps the order: verify allocation,
freeze the snapshot, queue/process the idempotent job, persist the private PDF
and document records, send the client availability email once, and record the
timeline and communication outcome.

## Validation

Executed locally:

- `npm.cmd run typecheck` - passed
- `npm.cmd run lint` - passed
- targeted housing, payment, certificate workflow, and client UI tests -
  passed: 5 files, 21 tests
- `VITEST_MAX_WORKERS=2; npm.cmd run test` - passed: 84 files, 328 tests
- `npm.cmd run build` - passed
- `git diff --check` - passed

Pending after local validation:

- Vercel Preview deployment;
- visual inspection of a generated PDF in Preview;
- manual Stripe test webhook and Resend inbox proof. No live Stripe, Firestore,
or email action was executed locally.

## Local Rendering Limitation

The local Windows machine has no browser executable available to Puppeteer.
`@sparticuz/chromium` provides a Linux serverless binary intended for Vercel,
which Windows cannot launch. The renderer is unit-tested with a Puppeteer
boundary mock; the actual one-page visual proof must be recorded from the
Linux Preview runtime before production review.

## Remaining Manual Checklist

1. Create a test housing request at `99 EUR` in Preview.
2. Confirm a manually reviewed payment creates the internal notification and
   one client and one admin communication record.
3. Confirm an allocation and verify one generated PDF contains the frozen
   student, residence, rent, date, QR, and optional configured signature.
4. Retry the webhook and allocation action; confirm no second PDF, capacity
   decrement, client email, or admin email is created.
5. Confirm the client document area exposes only the authenticated owner’s
   secure document path and the public verification route remains unchanged.
