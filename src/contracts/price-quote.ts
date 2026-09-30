import { z } from "zod";
import { propertyTypes } from "./property-depreciation.js";
import { attributionSchema, locales, nullAsAbsent } from "./schema-helpers.js";

export const priceProducts = [
  "rnd",
  "kurzgutachten",
  "vollgutachten",
  "kaufpreisaufteilung",
  "versetzbarkeitsgutachten",
] as const;

export const viewingTypes = ["none", "exterior", "interior_exterior"] as const;

export const priceQuoteInputSchema = z
  .object({
    product: z
      .enum(priceProducts)
      .describe(
        "Which AfAMax product to price. " +
          "`rnd` — Restnutzungsdauergutachten / remaining-useful-life appraisal, the basis for a " +
          "higher AfA rate. " +
          "`kurzgutachten` — Wertgutachten / short value appraisal. " +
          "`vollgutachten` — Verkehrswertgutachten / full market-value appraisal (§ 194 BauGB). " +
          "`kaufpreisaufteilung` — Kaufpreisaufteilung / purchase-price allocation report " +
          "(land vs. building). " +
          "`versetzbarkeitsgutachten` — Versetzbarkeitsgutachten / relocatability certificate " +
          "for tiny houses, mobile homes, modular units and containers.",
      ),
    viewingType: nullAsAbsent(
      z.enum(viewingTypes).optional().default("none"),
    ).describe(
      "Property inspection: `none` (remote, default), `exterior` (outside only / " +
        "Außenbesichtigung) or `interior_exterior` (on-site, inside and outside / Innen- und " +
        "Außenbesichtigung). Each adds a surcharge.",
    ),
    expressDelivery: nullAsAbsent(
      z.boolean().optional().default(false),
    ).describe(
      "Express processing (3-5 business days / Expressbearbeitung). Adds a surcharge unless a " +
        "free-express promotion is running.",
    ),
    propertyType: nullAsAbsent(z.enum(propertyTypes).optional()).describe(
      "Optional. Together with totalFlatsCount, a two-family, apartment or mixed-use building " +
        "with more than one flat adds a per-flat price.",
    ),
    totalFlatsCount: nullAsAbsent(
      z.coerce.number().int().min(1).max(1000).optional(),
    ).describe("Optional. Number of flats in the building / Anzahl Wohneinheiten."),
    locale: nullAsAbsent(z.enum(locales).optional().default("de")).describe(
      "Language of labels and of the link handed back. Match the user's language.",
    ),
  })
  .strict();

export const priceQuoteOutputSchema = z
  .object({
    quoteId: z.string().min(1),
    product: z.enum(priceProducts),
    productLabel: z.string(),
    currency: z.literal("EUR"),
    input: z
      .object({
        viewingType: z.enum(viewingTypes),
        expressDelivery: z.boolean(),
        propertyType: z.enum(propertyTypes).nullable(),
        totalFlatsCount: z.number().nullable(),
      })
      .strict(),
    price: z
      .object({
        basePrice: z.number(),
        viewingSurcharge: z.number(),
        expressSurcharge: z.number(),
        freeExpressPromotionApplied: z.boolean(),
        additionalPricePerUnit: z.number(),
        additionalUnitsPrice: z.number(),
        totalPrice: z
          .number()
          .describe(
            "Sum of all amounts above. Every amount in `price` is gross, incl. German VAT.",
          ),
        vatIncluded: z.literal(true),
        vatRate: z
          .number()
          .describe("The German VAT rate included in the amounts, in percent."),
        totalNetPrice: z.number(),
      })
      .strict(),
    surchargeTable: z
      .object({
        exteriorViewing: z.number(),
        interiorExteriorViewing: z.number(),
        express: z.number(),
        perAdditionalFlat: z.number(),
      })
      .strict(),
    attribution: attributionSchema,
    disclaimer: z.string(),
    meta: z
      .object({
        apiVersion: z.string(),
        generatedAt: z.iso.datetime(),
      })
      .strict(),
  })
  .strict();

export type PriceQuoteInput = z.infer<typeof priceQuoteInputSchema>;
export type PriceQuoteOutput = z.infer<typeof priceQuoteOutputSchema>;
