import { z } from 'zod';

export const propertyTypes = [
  'CONDOMINIUM',
  'SINGLE_FAMILY_HOUSE',
  'TWO_FAMILY_HOUSE',
  'ROW_HOUSE',
  'SEMI_DETACHED',
  'APARTMENT_BUILDING',
  'RESIDENTIAL_COMMERCIAL_BUILDING',
] as const;

export const modernizationStatuses = [
  'NOT_MODERNIZED',
  'SLIGHTLY_MODERNIZED',
  'PARTIALLY_MODERNIZED',
  'MOSTLY_MODERNIZED',
  'FULLY_MODERNIZED',
] as const;

export const modernizationFields = [
  'roof',
  'facadeInsulation',
  'windowsDoors',
  'heating',
  'utilities',
  'bathrooms',
  'interiorFitout',
  'floorplanImprovement',
] as const;

const nullableNonNegative = z.number().nonnegative().nullable().optional();
const modernizationStatusSchema = z.enum(modernizationStatuses);

export const modernizationSchema = z
  .object(Object.fromEntries(modernizationFields.map((field) => [field, modernizationStatusSchema])) as {
    [Key in (typeof modernizationFields)[number]]: typeof modernizationStatusSchema;
  })
  .strict();

export const partialModernizationSchema = modernizationSchema.partial().strict();

export const propertyDepreciationInputSchema = z
  .object({
    propertyType: z.enum(propertyTypes).describe('German residential property category.'),
    constructionYear: z.number().int().min(1800).describe('Original year of construction.'),
    floorArea: z.number().min(10).max(100_000).describe('Living or usable floor area in square metres.'),
    purchasePrice: nullableNonNegative.describe('Total purchase price in EUR.'),
    landArea: nullableNonNegative.describe('Land area in square metres.'),
    standardLandValue: nullableNonNegative.describe('Standard land value in EUR per square metre.'),
    includedInventory: nullableNonNegative.describe('Movable inventory included in the purchase price, in EUR.'),
    purchaseRelatedCosts: nullableNonNegative.describe('Purchase-related costs in EUR.'),
    coreRenovationYear: z.number().int().min(1801).nullable().optional()
      .describe('Year of a qualifying core renovation, if applicable.'),
    taxRate: z.number().positive().max(0.6).nullable().optional()
      .describe('Personal marginal tax rate as a decimal, e.g. 0.42.'),
    locale: z.enum(['de', 'en']).nullable().optional().describe('Language for upstream explanations; defaults to German.'),
    modernizationLevel: z.enum(['none', 'partial', 'extensive']).nullable().optional()
      .describe('Coarse modernization level used when detailed component data is unavailable.'),
    modernization: partialModernizationSchema.nullable().optional()
      .describe('Known state of eight modernization components. Ask for all eight when possible.'),
  })
  .strict()
  .superRefine((value, context) => {
    const maximumYear = new Date().getUTCFullYear() + 1;
    for (const field of ['constructionYear', 'coreRenovationYear'] as const) {
      const year = value[field];
      if (year != null && year > maximumYear) {
        context.addIssue({ code: 'too_big', origin: 'number', maximum: maximumYear, inclusive: true, path: [field] });
      }
    }
    if (value.coreRenovationYear != null && value.coreRenovationYear < value.constructionYear) {
      context.addIssue({
        code: 'custom',
        path: ['coreRenovationYear'],
        message: 'coreRenovationYear must be greater than or equal to constructionYear',
      });
    }
  });

const normalizedInputSchema = z.object({
  propertyType: z.enum(propertyTypes),
  constructionYear: z.number().int(),
  floorArea: z.number(),
  purchasePrice: z.number().nullable(),
  landArea: z.number().nullable(),
  standardLandValue: z.number().nullable(),
  includedInventory: z.number().nullable(),
  purchaseRelatedCosts: z.number().nullable(),
  coreRenovationYear: z.number().int().nullable(),
  taxRate: z.number(),
  locale: z.enum(['de', 'en']),
  modernization: modernizationSchema,
});

export const propertyDepreciationOutputSchema = z.object({
  calculationId: z.string().min(1),
  input: normalizedInputSchema,
  results: z.object({
    afaRatePerYear: z.number(),
    defaultAfaRatePerYear: z.number(),
    annualAfaAmount: z.number(),
    defaultAfaAmount: z.number(),
    monthlyAfaAmount: z.number(),
    annualTaxSavings: z.number(),
    appraisalWorthwhile: z.boolean(),
    monthlyTaxSavings: z.number(),
    buildingValue: z.number(),
    buildingValueSource: z.enum(['actual', 'assumed']),
    taxRate: z.number(),
    remainingUsefulLifeYears: z.number(),
    modernizationPointsUsed: z.number().min(0).max(20),
    currency: z.literal('EUR'),
  }),
  assumptions: z.object({
    modernizationAssumedNone: z.boolean(),
    buildingValueAssumed: z.boolean(),
    taxRateAssumed: z.boolean(),
  }),
  attribution: z.object({
    provider: z.literal('AfaMax'),
    url: z.url(),
    label: z.string(),
  }),
  disclaimer: z.string(),
  meta: z.object({
    apiVersion: z.string(),
    calculationMethod: z.string(),
    calculatedAt: z.iso.datetime(),
  }),
}).strict();

export type PropertyDepreciationInput = z.infer<typeof propertyDepreciationInputSchema>;
export type PropertyDepreciationOutput = z.infer<typeof propertyDepreciationOutputSchema>;
