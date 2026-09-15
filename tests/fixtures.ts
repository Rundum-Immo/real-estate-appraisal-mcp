import type { PropertyDepreciationOutput } from "../src/contracts/property-depreciation.js";

export const validInput = {
  propertyType: "CONDOMINIUM" as const,
  constructionYear: 1970,
  floorArea: 85,
  purchasePrice: 350_000,
  taxRate: 0.42,
  locale: "en" as const,
};

export const validOutput: PropertyDepreciationOutput = {
  calculationId: "calc_test",
  input: {
    propertyType: "CONDOMINIUM",
    constructionYear: 1970,
    floorArea: 85,
    purchasePrice: 350_000,
    landArea: null,
    standardLandValue: null,
    includedInventory: null,
    purchaseRelatedCosts: null,
    coreRenovationYear: null,
    taxRate: 0.42,
    locale: "en",
    modernization: {
      roof: "NOT_MODERNIZED",
      facadeInsulation: "NOT_MODERNIZED",
      windowsDoors: "NOT_MODERNIZED",
      heating: "NOT_MODERNIZED",
      utilities: "NOT_MODERNIZED",
      bathrooms: "NOT_MODERNIZED",
      interiorFitout: "NOT_MODERNIZED",
      floorplanImprovement: "NOT_MODERNIZED",
    },
  },
  results: {
    afaRatePerYear: 0.0333,
    defaultAfaRatePerYear: 0.02,
    annualAfaAmount: 9324,
    defaultAfaAmount: 5600,
    monthlyAfaAmount: 777,
    annualTaxSavings: 3916,
    appraisalWorthwhile: true,
    monthlyTaxSavings: 326,
    buildingValue: 280_000,
    buildingValueSource: "actual",
    taxRate: 0.42,
    remainingUsefulLifeYears: 30,
    modernizationPointsUsed: 0,
    currency: "EUR",
  },
  assumptions: {
    modernizationAssumedNone: true,
    buildingValueAssumed: false,
    taxRateAssumed: false,
  },
  attribution: {
    provider: "AfaMax",
    url: "https://afamax.de",
    label: "AfaMax AfA-Rechner",
  },
  disclaimer: "Indicative, non-binding estimate.",
  meta: {
    apiVersion: "1",
    calculationMethod: "ImmoWertV",
    calculatedAt: "2026-09-14T10:00:00.000Z",
  },
};
