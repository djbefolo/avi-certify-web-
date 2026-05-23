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
});

export const quoteInputSchema = z.object({
  simulationInput: simulationInputSchema,
  clientIdentity: z
    .object({
      fullName: z.string().max(160).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(40).optional(),
    })
    .optional(),
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
