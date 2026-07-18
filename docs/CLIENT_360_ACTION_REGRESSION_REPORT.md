# Client 360 Action Regression Report

## 1. Executive Summary

Verdict local: fixed and validated locally.

The Client 360 action buttons were not missing handlers. The regression was caused by an identity/case mismatch and invisible prerequisite feedback:

- Client 360 could open from a visible UID resolved through recent document-owner logic.
- The related operational case could exist under the Firebase Auth UID or client email instead of the visible UID.
- `getClient360()` only loaded cases, finance files, communications and timeline by the visible UID.
- When no `currentCase` was found, action handlers returned early and set a global error behind the fixed Client 360 drawer, so the admin saw no modal, no toast and no visible state change.
- `/admin` was also not classified as a private route by `SiteShell`, so public header/footer/floating CTAs could still mount around admin UI.
- The full test suite additionally exposed that middleware accepted a signed guard with a placeholder session cookie. This was hardened without changing the server-side Firebase session verification model.

## 2. Reported Symptoms

- Client 360 opens and displays identity, documents, certificates, communications, notes/timeline and action buttons.
- Buttons such as `Demander document`, `Envoyer notification` and `Generer attestation` appear clickable.
- Clicking can produce no visible modal, navigation, toast or feedback.

## 3. Reproduction Result

Local DOM/unit reproduction was added for the missing-dossier state:

- Open `Clients`.
- Open Client 360.
- Return a Client 360 payload with no linked `client_cases`.
- Click `Demander document`.
- Before the fix: the code would set a global error behind the drawer.
- After the fix: Client 360 displays a visible alert and a `Creer dossier operationnel` CTA.

Browser login reproduction was not executed locally because this environment does not contain a usable super-admin password/session. Preview review remains required.

## 4. Affected Buttons

| Button | File | Line area | onClick | State / Action | Modal / Panel | API / Server Function | Current Status |
|---|---|---:|---|---|---|---|---|
| Demander document | `src/components/admin/super-admin-operations-os.tsx` | 1385 | `onOpenAction("request-document", currentCase)` | `action`, `actionCase` | `ClientActionModal` | `POST /api/admin/cases/:caseId/request-document` | Restored; visible prerequisite if no case |
| Marquer en revue | same | 1386 | `onMarkUnderReview(currentCase)` | busy + refresh | none | `PATCH /api/admin/cases/:caseId/status` | Restored; visible prerequisite if no case |
| Ajouter note | same | 1387 | `onOpenAction("add-note", currentCase)` | `action`, `actionCase` | `ClientActionModal` | `POST /api/admin/cases/:caseId/notes` | Restored; visible prerequisite if no case |
| Generer attestation | same | 1388 | `onGenerateCertificate(currentCase)` | busy + refresh | none | `POST /api/admin/cases/:caseId/certificates` | Restored; visible prerequisite if no case |
| Lier simulation | same | 1389 | `onOpenFinance(profile.uid, "simulateur", currentCase)` | finance tab state | `FintechCommandCenter` | protected fintech APIs | Restored; visible prerequisite if no case |
| Generer devis | same | 1390 | `onOpenFinance(profile.uid, "devis", currentCase)` | finance tab state | `FintechCommandCenter` | protected fintech quote APIs | Restored; visible prerequisite if no case |
| Rapport prefinancement | same | 1391 | `onOpenFinance(profile.uid, "rapports", currentCase)` | finance tab state | `FintechCommandCenter` | protected fintech report APIs | Restored; visible prerequisite if no case |
| Envoyer notification | same | 1392 | `onOpenAction("send-notification", currentCase)` | `action`, `actionCase` | `ClientActionModal` | `POST /api/admin/cases/:caseId/notifications` | Restored; visible prerequisite if no case |

## 5. Unaffected Buttons

For clients with a correctly linked `client_cases` record, the handlers and modals already existed and were covered by tests. The regression appeared mainly when Client 360 was opened from identity/document resolution paths where the visible UID did not resolve the case.

## 6. Root Cause

Root cause:

`getClient360(uid)` detected that Firebase Auth UID could differ from the visible UID, but still filtered operational relationships using only the visible UID. Cases, finance files, communications and timeline records under the Auth UID were missed. The drawer then passed `currentCase = null` to every action button. The handlers returned early with `setError("Creez d'abord un dossier operationnel...")`, but that error was rendered behind the fixed drawer, making the click look like a no-op.

Secondary admin UX/security issue:

`SiteShell` did not include `/admin` in private route prefixes, so public shell UI could mount around admin pages.

Validation-discovered middleware issue:

`src/middleware.ts` only checked that `avi_admin_session` existed, not that it was a plausible Firebase session cookie. A signed guard plus placeholder session could pass middleware. The server page still verifies the real Firebase session, but middleware tests correctly required fail-closed behavior earlier.

## 7. Regression-Introducing Commit Or Change

No handler-removal commit was found.

The implicated change pattern is around `6b68fb9 fix(admin): resolve document owners in operations OS`:

- It added document owner resolution and Client 360 diagnostics for UID/Auth UID differences.
- It did not extend Client 360 case/action relationship lookup to the resolved Auth UID.
- It therefore made more Client 360 views reachable, including views where display data was available but the operational case was not loaded.

The action handlers themselves mostly originate from older commits (`0c68c47`, `6400675`, `4e2b4f5`, `910864a`, `d7b0ea4`, `4cf2bbc`).

## 8. Files Involved

- `src/components/admin/super-admin-operations-os.tsx`
- `src/lib/admin/admin-ops-store.ts`
- `src/components/layout/site-shell.tsx`
- `src/middleware.ts`
- `src/components/admin/super-admin-operations-os.test.tsx`
- `src/lib/admin/admin-ops-documents.test.ts`
- `docs/CLIENT_360_ACTION_REGRESSION_REPORT.md`

## 9. Identifier Mapping Analysis

| Identifier | Meaning | Fix |
|---|---|---|
| `uid` requested by Client 360 | visible/admin/document owner UID | kept as diagnostic `resolvedUid` |
| `profile.uid` | profile UID from admin profile/users/Auth fallback | included in identity aliases |
| Firebase `authUid` | UID returned by `getUserByEmail(profile.email)` | included in identity aliases |
| `caseId` | operational dossier ID | collected from cases matched by any identity alias or email |
| `clientEmail` | email stored on case/profile/document | used to match cases when UID differs |

`getClient360()` now uses identity aliases for cases, documents, finance files, certificates, communications and timeline.

## 10. Modal / State Analysis

- `request-document`, `add-note` and `send-notification` use `action` + `actionCase`.
- `ClientActionModal` is mounted in the parent component and renders with `z-50`, above the Client 360 drawer (`z-40`).
- The modal action keys match the button action keys.
- The no-visible-feedback failure happened before modal state was set, because `clientCase` was null.
- A new `clientActionMessage` state is rendered inside the drawer so missing-case prerequisites are visible.

## 11. API / Network Analysis

Existing protected APIs are reused:

- `POST /api/admin/cases/:caseId/request-document`
- `PATCH /api/admin/cases/:caseId/status`
- `POST /api/admin/cases/:caseId/notes`
- `POST /api/admin/cases/:caseId/notifications`
- `POST /api/admin/cases/:caseId/certificates`
- finance actions route through `FintechCommandCenter` protected APIs.

No direct Firestore client access was added. No Resend, Stripe, Firebase rules, certificate template or fintech formula changes were made.

## 12. Fix Implemented

1. `getClient360()` now resolves operational relationships through:
   - requested UID;
   - profile UID;
   - Firebase Auth UID resolved by email;
   - case email match.

2. Client 360 now shows visible drawer-level feedback when an action requires a missing dossier.

3. The drawer includes a persistent note that actions require a dossier when no `currentCase` exists.

4. `/admin` is now treated as a private shell route, hiding public header/footer/floating CTA from admin.

5. Middleware now rejects placeholder admin session cookies and clears both admin cookies when redirecting to `/admin/login`.

## 13. Security Preserved

- No admin auth bypass was added.
- No Firebase Admin verification was weakened.
- No client SDK Firestore access was introduced.
- Placeholder admin sessions are now rejected earlier by middleware.
- Admin cookies are purged on middleware redirects.
- `/verifier/[token]` remains outside middleware interception.

## 14. Existing Workflows Reused

The fix reuses the existing Client 360 action dispatcher, action modal, admin APIs, document request workflow, notification workflow, certificate generation API and Fintech command center.

## 15. Tests Added

- Client 360 missing-dossier regression test:
  - verifies visible drawer feedback for `Demander document`;
  - verifies visible drawer feedback for `Envoyer notification`;
  - verifies no case-specific API is called when `caseId` is missing.

- Store identity regression test:
  - verifies Client 360 resolves a case through Firebase Auth UID when the visible UID differs.

Existing middleware tests now pass after hardening.

## 16. Manual QA Matrix

| Action | Click Works | UI Opens / Feedback | Request Sent | Success Feedback | Error Feedback | Timeline Updated |
|---|---:|---:|---:|---:|---:|---:|
| Demander document | Local test yes | Modal if case; drawer alert if no case | Yes when case exists | Existing workflow | Yes | Existing workflow |
| Marquer en revue | Local test yes | Direct status update or drawer alert | Yes when case exists | Existing workflow | Yes | Existing workflow |
| Ajouter note | Local test yes | Modal if case; drawer alert if no case | Yes when case exists | Existing workflow | Yes | Existing workflow |
| Generer attestation | Local test yes | API action or drawer alert | Yes when case exists | Existing workflow | Yes | Existing workflow |
| Lier simulation | Local test yes | Finance tab or drawer alert | Fintech APIs after tab | Existing workflow | Yes | Existing workflow |
| Generer devis | Local test yes | Finance tab or drawer alert | Fintech APIs after tab | Existing workflow | Yes | Existing workflow |
| Rapport prefinancement | Local test yes | Finance tab or drawer alert | Fintech APIs after tab | Existing workflow | Yes | Existing workflow |
| Envoyer notification | Local test yes | Modal if case; drawer alert if no case | Yes when case exists | Existing workflow | Yes | Existing workflow |

Preview manual QA still required with a real super-admin account and Vercel preview access.

## 17. Build / Lint / Typecheck / Test Results

- `npm.cmd run lint`: passed.
- `npm.cmd run typecheck`: passed.
- Targeted tests:
  - `npm.cmd run test -- src/components/admin/super-admin-operations-os.test.tsx src/lib/admin/admin-ops-documents.test.ts`: passed, 27 tests.
  - `npm.cmd run test -- src/middleware.test.ts src/components/admin/super-admin-operations-os.test.tsx src/lib/admin/admin-ops-documents.test.ts`: passed, 36 tests.
- Full tests:
  - `$env:VITEST_MAX_WORKERS='1'; npm.cmd run test`: passed, 68 files, 272 tests.
- `npm.cmd run build`: passed, 57 static pages generated.
- `git diff --check`: passed.

## 18. Vercel Preview URL

Preview detected after branch push through Vercel project integration.

Stable branch preview alias:

`https://avi-certify-web-git-fix-client-360-13dad1-avi-certify-platform.vercel.app`

Latest deployment observed before this report update:

`https://avi-certify-erq3octjz-avi-certify-platform.vercel.app`

Preview smoke performed through the Vercel connector:

- `/admin/login`: HTTP 200 on the stable branch alias, admin login page rendered, `X-Robots-Tag: noindex, nofollow, noarchive`, and no public `Mon espace` CTA found in fetched HTML.
- `/admin`: blocked by Vercel preview SSO before app middleware, HTTP 302 to Vercel SSO, `x-robots-tag: noindex`.
- `/verifier/test-token`: also blocked by Vercel preview SSO in this connector fetch, so app-level verification route behavior still needs manual browser testing with preview access.

The local `vercel deploy --yes` command could not be used because the shell did not have Vercel CLI credentials and opened a device login prompt. No production deploy command was run.

## 19. Known Limitations

- Local browser super-admin flow was not executed because no live admin credentials/session are available in this environment.
- Preview manual QA must confirm real click behavior with production-like Firebase data.
- Middleware still performs only an edge plausibility check for the session cookie; the real Firebase session verification remains in the server page/API layer.

## 20. Files Modified

- `src/components/admin/super-admin-operations-os.tsx`
- `src/lib/admin/admin-ops-store.ts`
- `src/components/layout/site-shell.tsx`
- `src/middleware.ts`
- `src/components/admin/super-admin-operations-os.test.tsx`
- `src/lib/admin/admin-ops-documents.test.ts`
- `docs/CLIENT_360_ACTION_REGRESSION_REPORT.md`

## 21. Commits Created

- `2f241ca fix(admin): restore client 360 action workflows`
- This report was updated after preview detection; see Git history for the report-only follow-up commit.

## 22. Production Deployment Confirmation

- No production deployment performed.
- No production alias assigned.
- `avicertify.fr` untouched.
- `www.avicertify.fr` untouched.
- Firebase rules untouched.
- Stripe untouched.
- Resend configuration untouched.
- PDF template content untouched.
- Pricing formulas untouched.
- Brand Experience V2 untouched.
- Existing stash preserved.
- Excluded untracked files untouched.
- No real client communication sent during testing.
