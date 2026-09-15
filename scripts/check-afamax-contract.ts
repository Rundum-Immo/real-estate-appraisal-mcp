const openApiUrl =
  process.env.AFAMAX_OPENAPI_URL ?? "https://afamax.de/api/v1/openapi.json";

const expectedRequestProperties = [
  "propertyType",
  "constructionYear",
  "floorArea",
  "purchasePrice",
  "landArea",
  "standardLandValue",
  "includedInventory",
  "purchaseRelatedCosts",
  "coreRenovationYear",
  "taxRate",
  "locale",
  "modernizationLevel",
  "modernization",
];
const expectedResponseProperties = [
  "calculationId",
  "input",
  "results",
  "assumptions",
  "attribution",
  "disclaimer",
  "meta",
];
const expectedResultProperties = [
  "afaRatePerYear",
  "defaultAfaRatePerYear",
  "annualAfaAmount",
  "defaultAfaAmount",
  "monthlyAfaAmount",
  "annualTaxSavings",
  "appraisalWorthwhile",
  "monthlyTaxSavings",
  "buildingValue",
  "buildingValueSource",
  "taxRate",
  "remainingUsefulLifeYears",
  "modernizationPointsUsed",
  "currency",
];
const expectedPropertyTypes = [
  "CONDOMINIUM",
  "SINGLE_FAMILY_HOUSE",
  "TWO_FAMILY_HOUSE",
  "ROW_HOUSE",
  "SEMI_DETACHED",
  "APARTMENT_BUILDING",
  "RESIDENTIAL_COMMERCIAL_BUILDING",
];
const expectedKpaRequestProperties = [
  "propertyType",
  "totalPurchasePrice",
  "purchaseRelatedCosts",
  "includedInventory",
  "purchaseDate",
  "constructionYear",
  "floorArea",
  "landArea",
  "standardLandValue",
  "commercialShare",
  "coOwnershipNumerator",
  "coOwnershipDenominator",
  "garages",
  "undergroundParkingSpaces",
  "monthlyNetColdRent",
  "locale",
];
const expectedKpaResponseProperties = [
  "calculationId",
  "input",
  "applied",
  "methods",
  "skipped",
  "degenerate",
  "assetMethodDefaults",
  "attribution",
  "disclaimer",
  "meta",
];
const expectedKpaMethodProperties = [
  "method",
  "landValue",
  "buildingValue",
  "totalValue",
  "buildingShare",
  "totalAcquisitionCost",
  "depreciationBase",
  "landAllocation",
  "currency",
];

type JsonObject = Record<string, unknown>;

function asObject(value: unknown, label: string): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} is not an object`);
  return value as JsonObject;
}

function properties(schema: unknown, label: string): JsonObject {
  return asObject(asObject(schema, label).properties, `${label}.properties`);
}

function assertSameMembers(
  actual: string[],
  expected: string[],
  label: string,
): void {
  const normalizedActual = [...actual].sort();
  const normalizedExpected = [...expected].sort();
  if (JSON.stringify(normalizedActual) !== JSON.stringify(normalizedExpected)) {
    throw new Error(
      `${label} drifted. Expected ${normalizedExpected.join(", ")}; received ${normalizedActual.join(", ")}`,
    );
  }
}

const headers = new Headers({ accept: "application/json" });
if (process.env.AFAMAX_OPENAPI_AUTHORIZATION) {
  headers.set("authorization", process.env.AFAMAX_OPENAPI_AUTHORIZATION);
}
if (process.env.AFAMAX_OPENAPI_COOKIE) {
  headers.set("cookie", process.env.AFAMAX_OPENAPI_COOKIE);
}
const response = await fetch(openApiUrl, {
  headers,
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok)
  throw new Error(`Could not load ${openApiUrl}: HTTP ${response.status}`);

const document = asObject(await response.json(), "OpenAPI document");
const paths = asObject(document.paths, "paths");
for (const path of ["/v1/afa-calculation", "/v1/purchase-price-allocation"]) {
  if (!(path in paths)) throw new Error(`OpenAPI path is missing: ${path}`);
}
const components = asObject(document.components, "components");
const schemas = asObject(components.schemas, "components.schemas");
const requestSchema = asObject(
  schemas.PublicAfaCalculationRequest,
  "PublicAfaCalculationRequest",
);
const responseSchema = asObject(
  schemas.PublicAfaCalculationResponse,
  "PublicAfaCalculationResponse",
);
const kpaRequestSchema = asObject(
  schemas.PublicPurchasePriceAllocationRequest,
  "PublicPurchasePriceAllocationRequest",
);
const kpaResponseSchema = asObject(
  schemas.PublicPurchasePriceAllocationResponse,
  "PublicPurchasePriceAllocationResponse",
);
const requestProperties = properties(
  requestSchema,
  "PublicAfaCalculationRequest",
);
const responseProperties = properties(
  responseSchema,
  "PublicAfaCalculationResponse",
);

assertSameMembers(
  Object.keys(requestProperties),
  expectedRequestProperties,
  "request properties",
);
assertSameMembers(
  requestSchema.required as string[],
  ["propertyType", "constructionYear", "floorArea"],
  "request required fields",
);
assertSameMembers(
  asObject(requestProperties.propertyType, "propertyType").enum as string[],
  expectedPropertyTypes,
  "propertyType enum",
);
assertSameMembers(
  Object.keys(responseProperties),
  expectedResponseProperties,
  "response properties",
);
assertSameMembers(
  Object.keys(properties(responseProperties.results, "results")),
  expectedResultProperties,
  "result properties",
);

const kpaRequestProperties = properties(
  kpaRequestSchema,
  "PublicPurchasePriceAllocationRequest",
);
const kpaResponseProperties = properties(
  kpaResponseSchema,
  "PublicPurchasePriceAllocationResponse",
);
assertSameMembers(
  Object.keys(kpaRequestProperties),
  expectedKpaRequestProperties,
  "KPA request properties",
);
assertSameMembers(
  kpaRequestSchema.required as string[],
  [
    "propertyType",
    "totalPurchasePrice",
    "purchaseDate",
    "constructionYear",
    "floorArea",
    "landArea",
    "standardLandValue",
  ],
  "KPA request required fields",
);
assertSameMembers(
  asObject(kpaRequestProperties.propertyType, "KPA propertyType")
    .enum as string[],
  expectedPropertyTypes,
  "KPA propertyType enum",
);
assertSameMembers(
  Object.keys(kpaResponseProperties),
  expectedKpaResponseProperties,
  "KPA response properties",
);
assertSameMembers(
  kpaResponseSchema.required as string[],
  expectedKpaResponseProperties,
  "KPA response required fields",
);
assertSameMembers(
  Object.keys(properties(kpaResponseProperties.applied, "KPA applied")),
  expectedKpaMethodProperties,
  "KPA applied method properties",
);
const kpaMethodItems = asObject(
  asObject(kpaResponseProperties.methods, "KPA methods").items,
  "KPA methods.items",
);
if (kpaMethodItems.$ref !== "#/properties/applied") {
  throw new Error(
    `KPA methods items drifted. Expected reference to applied; received ${String(kpaMethodItems.$ref)}`,
  );
}
assertSameMembers(
  Object.keys(
    properties(kpaResponseProperties.assetMethodDefaults, "KPA asset defaults"),
  ),
  ["standardLevel", "regionalFactor", "marketAdjustmentFactor"],
  "KPA asset default properties",
);

process.stdout.write(
  `AFAMAX OpenAPI contract matches the MCP mirror at ${openApiUrl}\n`,
);
