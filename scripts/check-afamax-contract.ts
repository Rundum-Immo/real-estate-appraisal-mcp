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

process.stdout.write(
  `AFAMAX OpenAPI contract matches the MCP mirror at ${openApiUrl}\n`,
);
