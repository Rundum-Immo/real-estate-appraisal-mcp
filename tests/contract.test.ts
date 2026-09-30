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
  priceQuoteInputSchema,
  priceQuoteOutputSchema,
} from "../src/contracts/price-quote.js";
import {
  appointmentAvailabilityInputSchema,
  appointmentAvailabilityOutputSchema,
  bookingInputSchema,
  bookingOutputSchema,
} from "../src/contracts/appointments.js";
import {
  validAvailabilityInput,
  validAvailabilityOutput,
  validBookedOutput,
  validBookingStepOneInput,
  validBookingStepTwoInput,
  validPriceQuoteInput,
  validPriceQuoteOutput,
  validVerificationRequiredOutput,
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

describe("price quote contract", () => {
  it("accepts the public shapes and applies defaults", () => {
    expect(priceQuoteOutputSchema.safeParse(validPriceQuoteOutput).success).toBe(
      true,
    );
    expect(
      priceQuoteInputSchema.parse({ product: "vollgutachten", locale: null }),
    ).toEqual({
      product: "vollgutachten",
      viewingType: "none",
      expressDelivery: false,
      locale: "de",
    });
    expect(priceQuoteInputSchema.safeParse(validPriceQuoteInput).success).toBe(
      true,
    );
  });

  it("rejects unknown products and fields", () => {
    expect(priceQuoteInputSchema.safeParse({ product: "other" }).success).toBe(
      false,
    );
    expect(
      priceQuoteInputSchema.safeParse({ ...validPriceQuoteInput, discount: 1 })
        .success,
    ).toBe(false);
  });
});

describe("appointment contracts", () => {
  it("accepts the public availability shapes and bounds the window", () => {
    expect(
      appointmentAvailabilityInputSchema.safeParse(validAvailabilityInput)
        .success,
    ).toBe(true);
    expect(
      appointmentAvailabilityOutputSchema.safeParse(validAvailabilityOutput)
        .success,
    ).toBe(true);
    expect(
      appointmentAvailabilityInputSchema.safeParse({ days: 22 }).success,
    ).toBe(false);
    expect(
      appointmentAvailabilityInputSchema.safeParse({ maxSlotsPerDay: 33 })
        .success,
    ).toBe(false);
  });

  it("accepts exactly one booking step at a time", () => {
    expect(bookingInputSchema.safeParse(validBookingStepOneInput).success).toBe(
      true,
    );
    expect(bookingInputSchema.safeParse(validBookingStepTwoInput).success).toBe(
      true,
    );
    const invalidInputs = [
      {},
      { ...validBookingStepOneInput, email: undefined },
      { ...validBookingStepOneInput, otp: "123456" },
      { verificationId: "ver_test" },
      { ...validBookingStepTwoInput, otp: "12345" },
      { ...validBookingStepOneInput, name: "Visit https://spam.example/" },
      { ...validBookingStepOneInput, name: "someone@example.com" },
    ];
    for (const input of invalidInputs) {
      expect(bookingInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("accepts both booking response statuses", () => {
    for (const output of [validVerificationRequiredOutput, validBookedOutput]) {
      expect(bookingOutputSchema.safeParse(output).success).toBe(true);
    }
  });
});

describe("attribution provider", () => {
  it("accepts the legacy and the corrected AfAMax spelling", () => {
    for (const provider of ["AfaMax", "AfAMax"]) {
      const attribution = { ...validOutput.attribution, provider };
      expect(
        propertyDepreciationOutputSchema.safeParse({
          ...validOutput,
          attribution,
        }).success,
      ).toBe(true);
      expect(
        priceQuoteOutputSchema.safeParse({
          ...validPriceQuoteOutput,
          attribution,
        }).success,
      ).toBe(true);
    }
    expect(
      priceQuoteOutputSchema.safeParse({
        ...validPriceQuoteOutput,
        attribution: { ...validPriceQuoteOutput.attribution, provider: "Other" },
      }).success,
    ).toBe(false);
  });
});
