# AVI FINTECH CALCULATION ENGINE REPORT

## 1. Financial Reverse Engineering

Two Excel files were located and opened from `C:\Users\gabri\Documents\AVI CERTIFY WEB PLATFORM`:

- `AVI_CERTIFY_Modele_Prefinancement_Canada_CAD_XAF_dynamique.xlsx`
- `AVI_CERTIFY_Modele_Prefinancement_UE_EUR_XAF_dynamique.xlsx`

Both workbooks contain the same seven-sheet structure:

- `Guide`
- `Hypotheses`
- `Comparatif_Offres`
- `Scenario_3M`
- `Scenario_0M`
- `Sensibilite`
- `Sources`

The model is a prefinancing model for student mobility proof-of-funds. It converts a requested XAF amount into a target currency amount, then prices a financed share of the target amount using a historical base financing fee, transfer fee logic, a fixed service fee, risk surcharge tiers, and optional commercial discount.

## 2. Workbook Audit

### Canada Workbook

Inputs:

- EUR/CAD: `1.603`
- EUR/XAF: `655.957`
- CAD/XAF: `655.957 / 1.603 = 409.20586400499064`
- Requested amount: `8,000,000 XAF`
- Target amount: `19,550.06197052551 CAD`
- Duration: `12 months`
- Option A contribution: `3 months`
- Option B contribution: `0 months`

Historical pricing:

- Service fee: `460 EUR`, converted to `737.38 CAD`
- Financing fee assumption: `305 / 5536 = 5.509393063583815%`
- Transfer fee assumption: `165 / 5536 = 2.980491329479769%`
- Minimum transfer fee: `165 EUR * 1.603 = 264.495 CAD`

### UE Workbook

Inputs:

- EUR/XAF: `655.957`
- Requested amount: `8,000,000 XAF`
- Target amount: `12,195.92137899283 EUR`
- Duration: `12 months`
- Option A contribution: `3 months`
- Option B contribution: `0 months`

Historical pricing:

- Service fee: `460 EUR`
- Financing fee assumption: `305 / 5536 = 5.509393063583815%`
- Transfer fee assumption: `165 / 5536 = 2.980491329479769%`
- Minimum transfer fee: `165 EUR`

## 3. Extracted Formulas

Core formula chain:

```text
targetAmount = xafAmount / fxRateToXaf
theoreticalMonthlyAmount = targetAmount / durationMonths
studentContribution = theoreticalMonthlyAmount * contributionMonths
financedAmount = targetAmount - studentContribution
financedShare = financedAmount / targetAmount
riskSurcharge = tier(financedShare)
totalFinancingFeeRate = baseFinancingFeeRate + riskSurcharge
financingFee = financedAmount * totalFinancingFeeRate
transferFee = max(minimumTransferFee, financedAmount * transferFeeRate)
serviceFee = fixedServiceFee
grossFees = financingFee + transferFee + serviceFee
discountAmount = grossFees * discountRate
netFees = grossFees - discountAmount
cashDueAtSignature = studentContribution + netFees
monthlyRepayment = financedAmount / durationMonths
totalClientEffort = studentContribution + netFees + financedAmount
feeYield = netFees / financedAmount
feeLoad = netFees / targetAmount
```

Risk tiers:

- `<=25%`: `0%`
- `>25% and <=50%`: `0.25%`
- `>50% and <=75%`: `0.50%`
- `>75% and <=100%`: `1.50%`

## 4. Detected Inconsistencies

The Canada workbook `Comparatif_Offres` delta block has a reference inconsistency:

- `C24` uses `Scenario_0M!C18 - Scenario_3M!C18`, which is gross fees, while the label says fee overcost.
- `C25` uses `Scenario_0M!C19 - Scenario_3M!C19`, which is discount rate, while the label says cash signature overcost.
- `C26` uses `Scenario_0M!C20 - Scenario_3M!C20`, which is discount amount, while the label says monthly overcost.

The UE workbook correctly uses:

- `Scenario_0M!C21 - Scenario_3M!C21` for net fee delta
- `Scenario_0M!C22 - Scenario_3M!C22` for cash signature delta
- `Scenario_0M!C23 - Scenario_3M!C23` for monthly repayment delta

The engine intentionally corrects Canada comparison deltas by recalculating from scenario outputs.

Additional audit note: the amortization detail table in the workbooks references discount amount as monthly repayment in the row schedule. The engine keeps the executive monthly repayment output aligned with the workbook and uses actual monthly principal repayment for the generated amortization schedule.

## 5. Backend Architecture

Created isolated fintech modules:

- `FinancialProduct` configuration
- FX engine
- Pricing rule engine
- Risk surcharge engine
- Financing simulation engine
- Comparison engine
- Sensitivity engine
- Quote engine
- Report object generator
- Financial audit event recorder
- Admin auth guard

No Stripe, Resend, certificate generation, public verification, Firebase config, Firestore rules, or existing workflow logic was modified.

## 6. Tables / Collections Created

Logical Firestore-ready collections:

- `financial_products`
- `fx_rates`
- `pricing_rules`
- `risk_surcharge_rules`
- `financing_simulations`
- `financing_quotes`
- `quote_line_items`
- `client_prefinancing_reports`
- `admin_financial_audit_events`

Runtime repository behavior:

- Uses Firestore Admin automatically when Firebase Admin environment variables are present.
- Falls back to process-local storage for local/runtime proof when Firebase Admin is not configured.

## 7. Services Created

- `FxService`
- `PricingRuleService`
- `RiskPricingService`
- `FinancingSimulationService`
- `QuoteService`
- `FinancialAuditService`
- `FintechStore`
- `requireAdmin`

## 8. API Endpoints

Implemented:

- `POST /api/admin/fintech/simulations`
- `GET /api/admin/fintech/simulations`
- `GET /api/admin/fintech/simulations/:id`
- `POST /api/admin/fintech/quotes`
- `GET /api/admin/fintech/products`
- `GET /api/admin/fintech/pricing-rules`
- `PATCH /api/admin/fintech/pricing-rules`
- `GET /api/admin/fintech/risk-rules`
- `PATCH /api/admin/fintech/risk-rules`
- `GET /api/admin/fintech/sensitivity`
- `GET /api/admin/fintech/fx`
- `PATCH /api/admin/fintech/fx`
- `GET /api/admin/fintech/comparison`
- `POST /api/admin/fintech/reports`

## 9. Runtime Proof

Production runtime proof was executed with `next start` and `ADMIN_FINTECH_DEV_TOKEN` set only for the runtime process.

Validated calls:

- Products API returned 2 products.
- Simulation API returned Canada Option A simulation with cash due `6,943.04 CAD`.
- Quote API returned a quote object.
- Pricing update API accepted Canada Option A discount update to `1%`.
- FX update API accepted `EUR/CAD`.
- Sensitivity API returned 6 Canada Option A rows.
- Comparison API returned corrected Canada monthly delta `407.29 CAD`.
- Report API returned `pending_admin_validation`.

## 10. Financial Regression Results

Targeted regression suite:

- `src/lib/fintech/financing-simulation.service.test.ts`
- 6 tests passed.

Validated:

- Canada 8M XAF Option A
- Canada 8M XAF Option B
- UE 8M XAF Option A
- UE 8M XAF Option B
- Canada corrected comparison deltas
- Canada and UE sensitivity rows

Full repository test suite:

- 10 test files passed.
- 28 tests passed.

## 11. Known Differences From Excel

Intentional corrections:

- Canada comparison deltas use net fees, cash due, and monthly repayment outputs rather than incorrect gross/discount references.
- Amortization schedule uses actual principal repayment instead of workbook schedule rows that point to discount amount.

Preserved:

- Executive scenario outputs
- Pricing base rates
- Transfer floor logic
- Service fee conversion logic
- Risk tiers
- Sensitivity behavior
- XAF equivalence logic

## 12. Remaining Risks

- Firestore rules were not modified by instruction. Production collections need rule/index review before live admin use.
- Admin dashboard is intentionally lightweight and functional-first.
- Admin 2FA is prepared as a future requirement but not implemented.
- No live FX provider is connected.
- No bank, transfer, payment provider, credit, or disbursement execution exists in this sprint.
- The repository falls back to process-local storage when Firebase Admin env vars are absent.

## 13. Final Engineering Score

Score: `87 / 100`

Rationale:

- Financial engine aligns with audited Excel outputs.
- Known Canada formula inconsistency corrected.
- Backend/admin route surface implemented and runtime-tested.
- Audit events are recorded for financial admin actions.
- The major remaining production-hardening item is Firestore security/index deployment and full admin identity/session/2FA rollout.

## Final Verdict

A. FINTECH ENGINE VALIDATED
