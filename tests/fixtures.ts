import type { PropertyDepreciationOutput } from "../src/contracts/property-depreciation.js";
import type { PurchasePriceAllocationOutput } from "../src/contracts/purchase-price-allocation.js";
import type { PriceQuoteOutput } from "../src/contracts/price-quote.js";
import type {
  AppointmentAvailabilityOutput,
  BookingOutput,
} from "../src/contracts/appointments.js";

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
    provider: "AfAMax",
    url: "https://afamax.de/en/property-valuation?utm_source=ai&utm_medium=mcp&utm_campaign=afa-public-api&utm_content=calc_test&variant=PPA-SIMPLE&prefill=eyJjb25zdHJ1Y3Rpb25ZZWFyIjoxOTcwfQ#start",
    label: "AfAMax remaining-useful-life calculator",
  },
  disclaimer: "Indicative, non-binding estimate.",
  meta: {
    apiVersion: "1",
    calculationMethod: "ImmoWertV",
    calculatedAt: "2026-09-14T10:00:00.000Z",
  },
};

export const validPurchasePriceAllocationInput = {
  propertyType: "CONDOMINIUM" as const,
  totalPurchasePrice: 500_000,
  purchaseRelatedCosts: 40_000,
  purchaseDate: "2024-06-15",
  constructionYear: 1975,
  floorArea: 75,
  landArea: 1_200,
  standardLandValue: 2_500,
  coOwnershipNumerator: 75,
  coOwnershipDenominator: 1_000,
  undergroundParkingSpaces: 1,
  monthlyNetColdRent: 1_400,
  locale: "en" as const,
};

export const validPurchasePriceAllocationOutput: PurchasePriceAllocationOutput =
  {
    calculationId: "kpa_pub_test",
    input: {
      propertyType: "CONDOMINIUM",
      totalPurchasePrice: 500_000,
      purchasePrice: 500_000,
      purchaseRelatedCosts: 40_000,
      includedInventory: 0,
      purchaseDate: "2024-06-15",
      constructionYear: 1975,
      floorArea: 75,
      landArea: 1_200,
      standardLandValue: 2_500,
      commercialShare: null,
      coOwnershipNumerator: 75,
      coOwnershipDenominator: 1_000,
      garages: 0,
      undergroundParkingSpaces: 1,
      monthlyNetColdRent: 1_400,
      locale: "en",
    },
    applied: {
      method: "income",
      landValue: 225_000,
      buildingValue: 130_854,
      totalValue: 355_854,
      buildingShare: 0.3678,
      totalAcquisitionCost: 540_000,
      depreciationBase: 198_612,
      landAllocation: 341_388,
      currency: "EUR",
    },
    methods: [
      {
        method: "income",
        landValue: 225_000,
        buildingValue: 130_854,
        totalValue: 355_854,
        buildingShare: 0.3678,
        totalAcquisitionCost: 540_000,
        depreciationBase: 198_612,
        landAllocation: 341_388,
        currency: "EUR",
      },
      {
        method: "asset",
        landValue: 225_000,
        buildingValue: 84_486,
        totalValue: 309_486,
        buildingShare: 0.273,
        totalAcquisitionCost: 540_000,
        depreciationBase: 147_420,
        landAllocation: 392_580,
        currency: "EUR",
      },
    ],
    skipped: [{ method: "comparative", missing: ["comparativeFactorPerSqm"] }],
    degenerate: [],
    assetMethodDefaults: {
      standardLevel: 2,
      regionalFactor: 1,
      marketAdjustmentFactor: 1,
    },
    attribution: {
      provider: "AfAMax",
      url: "https://afamax.de/en/purchase-price-allocation?utm_source=ai&utm_medium=mcp&utm_campaign=kpa-public-api&utm_content=kpa_pub_test&prefill=eyJ0b3RhbFB1cmNoYXNlUHJpY2UiOjUwMDAwMH0#start",
      label: "AfAMax purchase price allocation calculator",
    },
    disclaimer:
      "This purchase price allocation is a non-binding estimate based on the BMF method and does not constitute tax advice.",
    meta: {
      apiVersion: "v1",
      calculationMethod: "bmf-kaufpreisaufteilung-2026",
      calculatedAt: "2026-09-15T10:00:00.000Z",
    },
  };

export const validPriceQuoteInput = {
  product: "rnd" as const,
  viewingType: "interior_exterior" as const,
  expressDelivery: true,
  locale: "en" as const,
};

export const validPriceQuoteOutput: PriceQuoteOutput = {
  quoteId: "prc_pub_test",
  product: "rnd",
  productLabel: "Remaining useful life appraisal",
  currency: "EUR",
  input: {
    viewingType: "interior_exterior",
    expressDelivery: true,
    propertyType: null,
    totalFlatsCount: null,
  },
  price: {
    basePrice: 799,
    viewingSurcharge: 299,
    expressSurcharge: 149,
    freeExpressPromotionApplied: false,
    additionalPricePerUnit: 0,
    additionalUnitsPrice: 0,
    totalPrice: 1247,
    vatIncluded: true,
    vatRate: 19,
    totalNetPrice: 1047.9,
  },
  surchargeTable: {
    exteriorViewing: 149,
    interiorExteriorViewing: 299,
    express: 149,
    perAdditionalFlat: 99,
  },
  attribution: {
    provider: "AfAMax",
    url: "https://afamax.de/en/restnutzungsdauergutachten?utm_source=ai&utm_medium=mcp&utm_campaign=price-public-api&utm_content=prc_pub_test",
    label: "AfAMax product page",
  },
  disclaimer:
    "This provider's list price in EUR incl. 19% VAT. Discount codes and special cases (e.g. individually commissioned units of a multi-family building) are not included; the price shown when commissioning is binding.",
  meta: { apiVersion: "v1", generatedAt: "2026-09-30T10:00:00.000Z" },
};

export const validAvailabilityInput = {
  days: 1,
  maxSlotsPerDay: 32,
  locale: "en" as const,
};

const contactAttribution = {
  provider: "AfAMax" as const,
  url: "https://afamax.de/en/contact?utm_source=ai&utm_medium=mcp&utm_campaign=appointment-public-api",
  label: "AfAMax contact & appointment booking",
};

export const validAvailabilityOutput: AppointmentAvailabilityOutput = {
  requestId: "apt_pub_test",
  appointmentType: "initial_call",
  description:
    "Free, non-binding 15-minute initial phone call with the AfAMax team.",
  days: [
    {
      date: "2026-10-01",
      weekday: "Thu",
      freeSlotCount: 12,
      slots: [
        { startDateTime: "2026-10-01T07:00:00.000Z", localTime: "09:00" },
        { startDateTime: "2026-10-01T07:15:00.000Z", localTime: "09:15" },
      ],
    },
  ],
  timeZone: "Europe/Berlin",
  durationMinutes: 15,
  attribution: contactAttribution,
  meta: { apiVersion: "v1", generatedAt: "2026-09-30T10:00:00.000Z" },
};

export const validBookingStepOneInput = {
  startDateTime: "2026-10-01T07:00:00.000Z",
  name: "Erika Mustermann",
  email: "erika@example.com",
  locale: "en" as const,
};

export const validBookingStepTwoInput = {
  verificationId: "ver_test",
  otp: "123456",
};

export const validVerificationRequiredOutput: BookingOutput = {
  requestId: "apt_pub_test_1",
  status: "verification_required",
  verification: {
    verificationId: "ver_test",
    maskedEmail: "e***@example.com",
    expiresAt: "2026-09-30T10:15:00.000Z",
  },
  appointment: null,
  attribution: contactAttribution,
  meta: { apiVersion: "v1", generatedAt: "2026-09-30T10:00:00.000Z" },
};

export const validBookedOutput: BookingOutput = {
  requestId: "apt_pub_test_2",
  status: "booked",
  verification: null,
  appointment: {
    startDateTime: "2026-10-01T07:00:00.000Z",
    endDateTime: "2026-10-01T07:15:00.000Z",
    localDate: "2026-10-01",
    localTime: "09:00",
    timeZone: "Europe/Berlin",
    durationMinutes: 15,
    customerInviteSent: true,
  },
  attribution: contactAttribution,
  meta: { apiVersion: "v1", generatedAt: "2026-09-30T10:01:00.000Z" },
};
