import { describe, expect, it } from "vitest";
import {
  propertyDepreciationInputSchema,
  propertyDepreciationOutputSchema,
} from "../src/contracts/property-depreciation.js";
import { validInput, validOutput } from "./fixtures.js";

describe("property depreciation contract", () => {
  it("accepts the public request and response shapes", () => {
    expect(propertyDepreciationInputSchema.safeParse(validInput).success).toBe(
      true,
    );
    expect(
      propertyDepreciationOutputSchema.safeParse(validOutput).success,
    ).toBe(true);
  });

  it("rejects unknown input fields and invalid renovation chronology", () => {
    expect(
      propertyDepreciationInputSchema.safeParse({ ...validInput, secret: true })
        .success,
    ).toBe(false);
    expect(
      propertyDepreciationInputSchema.safeParse({
        ...validInput,
        coreRenovationYear: 1969,
      }).success,
    ).toBe(false);
  });
});
