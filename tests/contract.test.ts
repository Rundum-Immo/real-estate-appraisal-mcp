import { describe, expect, it } from "vitest";
import {
  propertyDepreciationInputSchema,
  propertyDepreciationOutputSchema,
} from "../src/contracts/property-depreciation.js";
import {
  purchasePriceAllocationInputSchema,
  purchasePriceAllocationOutputSchema,
} from "../src/contracts/purchase-price-allocation.js";
import {
  validInput,
  validOutput,
  validPurchasePriceAllocationInput,
  validPurchasePriceAllocationOutput,
} from "./fixtures.js";

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

describe("purchase price allocation contract", () => {
  it("accepts the public request and response shapes", () => {
    expect(
      purchasePriceAllocationInputSchema.safeParse(
        validPurchasePriceAllocationInput,
      ).success,
    ).toBe(true);
    expect(
      purchasePriceAllocationOutputSchema.safeParse(
        validPurchasePriceAllocationOutput,
      ).success,
    ).toBe(true);
  });

  it("coerces numbers and treats nullable optional values as omitted", () => {
    const result = purchasePriceAllocationInputSchema.parse({
      ...validPurchasePriceAllocationInput,
      totalPurchasePrice: "500000",
      garages: "2",
      monthlyNetColdRent: null,
      includedInventory: null,
    });
    expect(result.totalPurchasePrice).toBe(500_000);
    expect(result.garages).toBe(2);
    expect(result.monthlyNetColdRent).toBeUndefined();
    expect(result.includedInventory).toBeUndefined();
  });

  it("rejects chronology, net-price, conditional-field, and unknown-key errors", () => {
    const invalidInputs = [
      { ...validPurchasePriceAllocationInput, purchaseDate: "2024-02-30" },
      { ...validPurchasePriceAllocationInput, constructionYear: 2025 },
      { ...validPurchasePriceAllocationInput, includedInventory: 500_000 },
      {
        ...validPurchasePriceAllocationInput,
        coOwnershipNumerator: 1_001,
        coOwnershipDenominator: 1_000,
      },
      {
        ...validPurchasePriceAllocationInput,
        propertyType: "RESIDENTIAL_COMMERCIAL_BUILDING",
        coOwnershipNumerator: undefined,
        coOwnershipDenominator: undefined,
      },
      { ...validPurchasePriceAllocationInput, secret: true },
    ];
    for (const input of invalidInputs) {
      expect(purchasePriceAllocationInputSchema.safeParse(input).success).toBe(
        false,
      );
    }
  });
});
