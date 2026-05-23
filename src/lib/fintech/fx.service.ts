import type { FintechRegion, FxRate } from "@/types/fintech";
import { fxRates, getFxRateToXaf } from "@/lib/fintech/workbook-defaults";

export class FxService {
  listRates(): FxRate[] {
    return fxRates;
  }

  getRateToXaf(region: FintechRegion): FxRate {
    return getFxRateToXaf(region);
  }

  updateManualRate(pair: FxRate["pair"], rate: number): FxRate {
    const existing = fxRates.find((item) => item.pair === pair);

    if (!existing) {
      throw new Error(`Unsupported FX pair: ${pair}`);
    }

    existing.rate = rate;
    existing.source = "manual_admin_override";
    existing.manualOverride = true;
    existing.sourceMetadata = "Manual admin override. Future provider-ready.";
    existing.updatedAt = new Date().toISOString();

    if (pair === "EUR/XAF" || pair === "EUR/CAD") {
      const eurXaf = fxRates.find((item) => item.pair === "EUR/XAF");
      const eurCad = fxRates.find((item) => item.pair === "EUR/CAD");
      const cadXaf = fxRates.find((item) => item.pair === "CAD/XAF");

      if (eurXaf && eurCad && cadXaf) {
        cadXaf.rate = eurXaf.rate / eurCad.rate;
        cadXaf.source = "manual_admin_override";
        cadXaf.manualOverride = true;
        cadXaf.sourceMetadata = "Derived after manual EUR/XAF or EUR/CAD override.";
        cadXaf.updatedAt = new Date().toISOString();
      }
    }

    return existing;
  }
}
