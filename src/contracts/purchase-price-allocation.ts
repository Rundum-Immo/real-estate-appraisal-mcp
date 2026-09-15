import { z } from "zod";
import { propertyTypes } from "./property-depreciation.js";

const requiredNumber = { error: "Required — must be a number" } as const;

function nullAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === null ? undefined : value), schema);
}

const optionalAmount = (description: string) =>
  nullAsAbsent(z.coerce.number().nonnegative().optional()).describe(
    description,
  );
const optionalCount = (description: string) =>
  nullAsAbsent(z.coerce.number().int().nonnegative().optional()).describe(
    description,
  );

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export const purchasePriceAllocationInputSchema = z
  .object({
    propertyType: z
      .enum(propertyTypes)
      .describe("German residential property category."),
    totalPurchasePrice: z.coerce
      .number(requiredNumber)
      .positive()
      .describe("Total notarized purchase price in EUR."),
    purchaseRelatedCosts: optionalAmount(
      "Land transfer tax, notary, land-register, and broker costs in EUR. Defaults to 0.",
    ),
    includedInventory: optionalAmount(
      "Movable inventory included in the purchase price, in EUR. It is deducted before allocation.",
    ),
    purchaseDate: z
      .string()
      .refine(isValidIsoDate, "Must be a valid date in YYYY-MM-DD format")
      .describe(
        "Date of the notarized purchase contract in YYYY-MM-DD format; must be from 1990-01-01 through today.",
      ),
    constructionYear: z.coerce
      .number(requiredNumber)
      .int()
      .min(1800)
      .describe(
        "Original construction year; it cannot be later than the purchase year.",
      ),
    floorArea: z.coerce
      .number(requiredNumber)
      .positive()
      .describe("Living or usable floor area in square metres."),
    landArea: z.coerce
      .number(requiredNumber)
      .positive()
      .describe("Plot area in square metres."),
    standardLandValue: z.coerce
      .number(requiredNumber)
      .positive()
      .describe(
        "Standard land value (Bodenrichtwert) in EUR per square metre.",
      ),
    commercialShare: nullAsAbsent(
      z.enum(["under_50", "over_50"]).optional(),
    ).describe(
      "Required for RESIDENTIAL_COMMERCIAL_BUILDING: whether the commercial share is under or over 50%.",
    ),
    coOwnershipNumerator: nullAsAbsent(
      z.coerce.number().positive().optional(),
    ).describe(
      "Co-ownership numerator (Miteigentumsanteil); required with the denominator for a condominium.",
    ),
    coOwnershipDenominator: nullAsAbsent(
      z.coerce.number().positive().optional(),
    ).describe(
      "Co-ownership denominator; required with the numerator for a condominium.",
    ),
    garages: optionalCount("Number of enclosed garage spaces. Defaults to 0."),
    undergroundParkingSpaces: optionalCount(
      "Number of underground parking spaces. Defaults to 0.",
    ),
    monthlyNetColdRent: optionalAmount(
      "Total monthly net cold rent in EUR. A positive value enables the income method; omitting or passing 0 leaves it unavailable.",
    ),
    locale: nullAsAbsent(
      z.enum(["de", "en"]).optional().default("de"),
    ).describe(
      "Language for the disclaimer and AfaMax attribution link. Defaults to German.",
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const purchaseDate = new Date(`${value.purchaseDate}T00:00:00.000Z`);
    const today = new Date();
    today.setUTCHours(23, 59, 59, 999);

    if (purchaseDate > today) {
      context.addIssue({
        code: "custom",
        path: ["purchaseDate"],
        message: "Must not be in the future",
      });
    }
    if (purchaseDate < new Date("1990-01-01T00:00:00.000Z")) {
      context.addIssue({
        code: "custom",
        path: ["purchaseDate"],
        message: "Must be 1990-01-01 or later",
      });
    }
    if (value.constructionYear > purchaseDate.getUTCFullYear()) {
      context.addIssue({
        code: "custom",
        path: ["constructionYear"],
        message: "Must not be later than purchaseDate",
      });
    }
    if ((value.includedInventory ?? 0) >= value.totalPurchasePrice) {
      context.addIssue({
        code: "custom",
        path: ["includedInventory"],
        message: "Must leave a positive purchase price for the property",
      });
    }
    if (value.propertyType === "CONDOMINIUM") {
      if (value.coOwnershipNumerator === undefined) {
        context.addIssue({
          code: "custom",
          path: ["coOwnershipNumerator"],
          message: "Required for a condominium",
        });
      }
      if (value.coOwnershipDenominator === undefined) {
        context.addIssue({
          code: "custom",
          path: ["coOwnershipDenominator"],
          message: "Required for a condominium",
        });
      }
    }
    if (
      (value.coOwnershipNumerator === undefined) !==
      (value.coOwnershipDenominator === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path:
          value.coOwnershipNumerator === undefined
            ? ["coOwnershipNumerator"]
            : ["coOwnershipDenominator"],
        message: "Both co-ownership values must be provided together",
      });
    }
    if (
      value.coOwnershipNumerator !== undefined &&
      value.coOwnershipDenominator !== undefined &&
      value.coOwnershipNumerator > value.coOwnershipDenominator
    ) {
      context.addIssue({
        code: "custom",
        path: ["coOwnershipNumerator"],
        message: "Co-ownership share must not exceed one",
      });
    }
    if (
      value.propertyType === "RESIDENTIAL_COMMERCIAL_BUILDING" &&
      value.commercialShare === undefined
    ) {
      context.addIssue({
        code: "custom",
        path: ["commercialShare"],
        message: "Required for a mixed-use building",
      });
    }
  });

const methodSchema = z
  .object({
    method: z.enum(["comparative", "income", "asset"]),
    landValue: z.number(),
    buildingValue: z.number(),
    totalValue: z.number(),
    buildingShare: z.number(),
    totalAcquisitionCost: z.number(),
    depreciationBase: z.number(),
    landAllocation: z.number(),
    currency: z.literal("EUR"),
  })
  .strict();

const normalizedInputSchema = z
  .object({
    propertyType: z.enum(propertyTypes),
    totalPurchasePrice: z.number(),
    purchasePrice: z
      .number()
      .describe("Property price after deducting included inventory."),
    purchaseRelatedCosts: z.number(),
    includedInventory: z.number(),
    purchaseDate: z.string(),
    constructionYear: z.number(),
    floorArea: z.number(),
    landArea: z.number(),
    standardLandValue: z.number(),
    commercialShare: z.enum(["under_50", "over_50"]).nullable(),
    coOwnershipNumerator: z.number().nullable(),
    coOwnershipDenominator: z.number().nullable(),
    garages: z.number(),
    undergroundParkingSpaces: z.number(),
    monthlyNetColdRent: z.number().nullable(),
    locale: z.enum(["de", "en"]),
  })
  .strict();

export const purchasePriceAllocationOutputSchema = z
  .object({
    calculationId: z.string().min(1),
    input: normalizedInputSchema,
    applied: methodSchema,
    methods: z.array(methodSchema),
    skipped: z.array(
      z
        .object({
          method: z.enum(["comparative", "income", "asset"]),
          missing: z.array(z.string()),
        })
        .strict(),
    ),
    degenerate: z.array(
      z
        .object({
          method: z.enum(["comparative", "income", "asset"]),
          reason: z.enum([
            "operating-costs-exceed-rent",
            "income-below-land-interest",
            "no-building-value",
          ]),
        })
        .strict(),
    ),
    assetMethodDefaults: z
      .object({
        standardLevel: z.number(),
        regionalFactor: z.literal(1),
        marketAdjustmentFactor: z.literal(1),
      })
      .strict(),
    attribution: z
      .object({
        provider: z.literal("AfaMax"),
        url: z.url(),
        label: z.string(),
      })
      .strict(),
    disclaimer: z.string(),
    meta: z
      .object({
        apiVersion: z.string(),
        calculationMethod: z.string(),
        calculatedAt: z.iso.datetime(),
      })
      .strict(),
  })
  .strict();

export type PurchasePriceAllocationInput = z.infer<
  typeof purchasePriceAllocationInputSchema
>;
export type PurchasePriceAllocationOutput = z.infer<
  typeof purchasePriceAllocationOutputSchema
>;
