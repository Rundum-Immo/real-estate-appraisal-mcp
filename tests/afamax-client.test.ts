import { describe, expect, it, vi } from "vitest";
import { AfamaxClient } from "../src/providers/afamax/afamax.client.js";
import { AppraisalProviderError } from "../src/providers/appraisal-provider.js";
import {
  validInput,
  validOutput,
  validPurchasePriceAllocationInput,
  validPurchasePriceAllocationOutput,
  validAvailabilityInput,
  validAvailabilityOutput,
  validBookingStepOneInput,
  validPriceQuoteInput,
  validPriceQuoteOutput,
  validVerificationRequiredOutput,
} from "./fixtures.js";

const afaUrl = new URL("https://afamax.de/api/v1/afa-calculation");
const kpaUrl = new URL("https://afamax.de/api/v1/purchase-price-allocation");
const priceUrl = new URL("https://afamax.de/api/v1/price-quote");
const availabilityUrl = new URL(
  "https://afamax.de/api/v1/appointments/availability",
);
const bookingUrl = new URL("https://afamax.de/api/v1/appointments/book");
const endpoints = {
  apiUrl: afaUrl,
  purchasePriceAllocationApiUrl: kpaUrl,
  priceQuoteApiUrl: priceUrl,
  appointmentAvailabilityApiUrl: availabilityUrl,
  appointmentBookingApiUrl: bookingUrl,
};

describe("AfamaxClient", () => {
  it("forwards the service identity and validated client address", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(headers.get("x-afamax-service-token")).toBe("x".repeat(32));
        expect(headers.get("x-afamax-client-ip")).toBe("203.0.113.10");
        return Response.json(validOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1000,
      serviceToken: "x".repeat(32),
      fetch: fetchMock,
    });

    await expect(
      client.calculate(validInput, { clientIp: "203.0.113.10" }),
    ).resolves.toEqual(validOutput);
  });

  it("does not send trusted headers in stdio/direct mode", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        const headers = new Headers(init?.headers);
        expect(headers.has("x-afamax-service-token")).toBe(false);
        expect(headers.has("x-afamax-client-ip")).toBe(false);
        return Response.json(validOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1000,
      fetch: fetchMock,
    });

    await client.calculate(validInput);
  });

  it("maps rate limits without leaking an upstream body", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1000,
      fetch: async () =>
        Response.json(
          { errorCode: "RATE_LIMITED", errorMessage: "private diagnostics" },
          { status: 429, headers: { "retry-after": "42" } },
        ),
    });

    try {
      await client.calculate(validInput);
      expect.fail("Expected the request to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(AppraisalProviderError);
      expect(error).toMatchObject({
        code: "rate_limited",
        retryAfterSeconds: 42,
      });
      expect((error as Error).message).not.toContain("private diagnostics");
    }
  });

  it("rejects an invalid upstream success response", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1000,
      fetch: async () => Response.json({ calculationId: "incomplete" }),
    });

    await expect(client.calculate(validInput)).rejects.toMatchObject({
      code: "invalid_response",
    });
  });

  it("routes purchase price allocation to its endpoint and validates the response", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe(String(kpaUrl));
        const headers = new Headers(init?.headers);
        expect(headers.get("x-afamax-service-token")).toBe("x".repeat(32));
        expect(headers.get("x-afamax-client-ip")).toBe("2001:db8::10");
        expect(JSON.parse(String(init?.body))).toEqual(
          validPurchasePriceAllocationInput,
        );
        return Response.json(validPurchasePriceAllocationOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      serviceToken: "x".repeat(32),
      fetch: fetchMock,
    });

    await expect(
      client.calculatePurchasePriceAllocation(
        validPurchasePriceAllocationInput,
        { clientIp: "2001:db8::10" },
      ),
    ).resolves.toEqual(validPurchasePriceAllocationOutput);
  });

  it("rejects an invalid purchase price allocation success response", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: async () => Response.json({ calculationId: "incomplete" }),
    });

    await expect(
      client.calculatePurchasePriceAllocation(
        validPurchasePriceAllocationInput,
      ),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });

  it("posts price quotes to their endpoint and validates the response", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe(String(priceUrl));
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual(validPriceQuoteInput);
        return Response.json(validPriceQuoteOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: fetchMock,
    });

    await expect(client.priceQuote(validPriceQuoteInput)).resolves.toEqual(
      validPriceQuoteOutput,
    );
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("requests availability with GET query parameters and no body", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        const requested = new URL(String(url));
        expect(requested.origin + requested.pathname).toBe(
          String(availabilityUrl),
        );
        expect(Object.fromEntries(requested.searchParams)).toEqual({
          days: "1",
          maxSlotsPerDay: "32",
          locale: "en",
        });
        expect(init?.method).toBe("GET");
        expect(init?.body).toBeUndefined();
        const headers = new Headers(init?.headers);
        expect(headers.has("content-type")).toBe(false);
        expect(headers.get("x-afamax-service-token")).toBe("x".repeat(32));
        expect(headers.get("x-afamax-client-ip")).toBe("203.0.113.10");
        return Response.json(validAvailabilityOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      serviceToken: "x".repeat(32),
      fetch: fetchMock,
    });

    await expect(
      client.availableAppointments(validAvailabilityInput, {
        clientIp: "203.0.113.10",
      }),
    ).resolves.toEqual(validAvailabilityOutput);
  });

  it("posts bookings to their endpoint", async () => {
    const fetchMock = vi.fn(
      async (url: string | URL | Request, init?: RequestInit) => {
        expect(String(url)).toBe(String(bookingUrl));
        expect(init?.method).toBe("POST");
        expect(JSON.parse(String(init?.body))).toEqual(
          validBookingStepOneInput,
        );
        return Response.json(validVerificationRequiredOutput);
      },
    );
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: fetchMock,
    });

    await expect(
      client.bookAppointment(validBookingStepOneInput),
    ).resolves.toEqual(validVerificationRequiredOutput);
  });

  it("passes through an actionable booking refusal with its website fallback", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: async () =>
        Response.json(
          {
            errorCode: "SLOT_UNAVAILABLE",
            errorMessage: "The selected slot is no longer available.",
            fallbackUrl: "https://afamax.de/en/contact",
          },
          { status: 409 },
        ),
    });

    await expect(
      client.bookAppointment(validBookingStepOneInput),
    ).rejects.toMatchObject({
      code: "upstream_refused",
      message: "The selected slot is no longer available.",
      upstreamCode: "SLOT_UNAVAILABLE",
      fallbackUrl: "https://afamax.de/en/contact",
    });
  });

  it("drops a non-http fallback link and keeps unstructured errors generic", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: async () =>
        Response.json(
          {
            errorCode: "BOOKING_UNAVAILABLE",
            errorMessage: "Online appointment booking is currently unavailable.",
            fallbackUrl: "javascript:alert(1)",
          },
          { status: 503 },
        ),
    });
    await expect(
      client.bookAppointment(validBookingStepOneInput),
    ).rejects.toMatchObject({
      code: "service_disabled",
      upstreamCode: "BOOKING_UNAVAILABLE",
      fallbackUrl: undefined,
    });

    const opaque = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: async () => new Response("nope", { status: 404 }),
    });
    await expect(opaque.priceQuote(validPriceQuoteInput)).rejects.toMatchObject(
      { code: "invalid_response" },
    );
  });

  it("rejects an invalid availability success response", async () => {
    const client = new AfamaxClient({
      ...endpoints,
      timeoutMs: 1_000,
      fetch: async () => Response.json({ requestId: "incomplete" }),
    });

    await expect(
      client.availableAppointments(validAvailabilityInput),
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
});
