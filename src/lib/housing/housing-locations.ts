import type { HousingLocation } from "@/types/housing";

// Derived from the verified SafeHouse coverage workbook dated 2026-08-03.
// Exact residences remain server/admin-only and require dated partner confirmation.
export const housingLocations: readonly HousingLocation[] = [
  ["paris_banlieue", "Paris banlieue", 500, 5],
  ["paris_intramuros", "Paris intramuros", 800, 0],
  ["aix_en_provence", "Aix-en-Provence", 500, 3],
  ["amiens", "Amiens", 400, 2],
  ["angers", "Angers", 450, 0],
  ["antibes", "Antibes", 500, 1],
  ["bordeaux", "Bordeaux", 500, 1],
  ["brest", "Brest", 400, 1],
  ["caen", "Caen", 450, 3],
  ["clermont_ferrand", "Clermont-Ferrand", 350, 1],
  ["grenoble", "Grenoble", 400, 1],
  ["la_rochelle", "La Rochelle", 500, 1],
  ["le_havre", "Le Havre", 400, 0],
  ["lille", "Lille", 450, 4],
  ["limoges", "Limoges", 350, 0],
  ["lyon", "Lyon", 480, 3],
  ["marseille", "Marseille", 450, 0],
  ["metz", "Metz", 400, 0],
  ["montpellier", "Montpellier", 450, 5],
  ["nancy", "Nancy", 400, 1],
  ["nantes", "Nantes", 450, 1],
  ["nice", "Nice", 550, 1],
  ["orleans", "Orleans", 450, 0],
  ["reims", "Reims", 450, 0],
  ["rennes", "Rennes", 450, 1],
  ["rouen", "Rouen", 400, 1],
  ["saint_etienne", "Saint-Etienne", 350, 0],
  ["strasbourg", "Strasbourg", 550, 3],
  ["toulon", "Toulon", 400, 0],
  ["toulouse", "Toulouse", 450, 2],
  ["tours", "Tours", 450, 0],
  ["valenciennes", "Valenciennes", 400, 0],
].map(([code, label, indicativeMonthlyRent, partnerCoverageCount]) => ({
  code: String(code),
  country: "France" as const,
  zone: String(label),
  label: String(label),
  indicativeMonthlyRent: Number(indicativeMonthlyRent),
  currency: "EUR" as const,
  partnerCoverageCount: Number(partnerCoverageCount),
  availabilityStatus:
    Number(partnerCoverageCount) > 0
      ? ("conditionally_available" as const)
      : ("limited" as const),
}));

export const housingLocationCodes = housingLocations.map(
  (location) => location.code,
);

export function getHousingLocation(code: string | null | undefined) {
  return housingLocations.find((location) => location.code === code) ?? null;
}
