import { z } from "zod";

export const fintechRegionSchema = z.enum(["canada", "eu"]);

export const simulationInputSchema = z.object({
  region: fintechRegionSchema,
  xafAmount: z.number().positive().optional(),
  targetAmount: z.number().positive().optional(),
  durationMonths: z.number().int().positive().max(120).optional(),
  contributionMonths: z.number().int().min(0).max(120),
  discountRate: z.number().min(0).max(1).optional(),
  fxReference: z.string().max(240).optional(),
  clientName: z.string().max(160).optional(),
  clientEmail: z.string().email().optional(),
  uid: z.string().max(160).optional(),
  caseId: z.string().max(160).optional(),
});

export const quoteInputSchema = z.object({
  simulationId: z.string().max(160).optional(),
  simulationInput: simulationInputSchema.optional(),
  clientIdentity: z
    .object({
      fullName: z.string().max(160).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
    })
    .optional(),
}).refine((input) => input.simulationId || input.simulationInput, {
  message: "A simulationId or simulationInput is required.",
});

export const quotePatchSchema = z.object({
  title: z.string().max(180).nullable().optional(),
  validUntil: z.string().max(40).nullable().optional(),
  paymentDeadline: z.string().max(40).nullable().optional(),
  commercialNote: z.string().max(3000).nullable().optional(),
  internalNote: z.string().max(3000).nullable().optional(),
  termsAndConditions: z.string().max(5000).nullable().optional(),
  requiredDocumentsBeforeApproval: z.array(z.string().max(160)).max(20).nullable().optional(),
  disclaimer: z.string().max(3000).nullable().optional(),
  recommendationSummary: z.string().max(2000).nullable().optional(),
  expiresAt: z.string().max(40).nullable().optional(),
  status: z.enum(["DRAFT", "GENERATED", "SENT", "ACCEPTED", "EXPIRED"]).optional(),
});

export const pricingRulePatchSchema = z.object({
  region: fintechRegionSchema,
  baseFinancingFeeRate: z.number().min(0).max(1).optional(),
  transferFeeRate: z.number().min(0).max(1).optional(),
  minimumTransferFee: z.number().min(0).optional(),
  serviceFee: z.number().min(0).optional(),
  discountRateOptionA: z.number().min(0).max(1).optional(),
  discountRateOptionB: z.number().min(0).max(1).optional(),
  feePolicy: z.string().max(1000).optional(),
});

export const riskRulePatchSchema = z.object({
  region: fintechRegionSchema,
  tiers: z
    .array(
      z.object({
        maxFinancedShare: z.number().positive().max(1),
        surchargeRate: z.number().min(0).max(1),
        label: z.string().max(80),
      }),
    )
    .min(1)
    .optional(),
});

export const fxPatchSchema = z.object({
  pair: z.enum(["EUR/XAF", "EUR/CAD", "CAD/XAF"]),
  rate: z.number().positive(),
});
