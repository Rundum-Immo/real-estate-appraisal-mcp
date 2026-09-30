import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { getClientIp } from "../src/transports/http.js";

describe("HTTP configuration", () => {
  it("requires the service token only for hosted HTTP", () => {
    expect(() => loadConfig("http", {})).toThrow(/AFAMAX_SERVICE_TOKEN/);
    expect(loadConfig("stdio", {}).afamaxServiceToken).toBeUndefined();
  });

  it("uses separate default and custom endpoints for AfA and KPA", () => {
    const defaults = loadConfig("stdio", {});
    expect(defaults.afamaxApiUrl.href).toBe(
      "https://afamax.de/api/v1/afa-calculation",
    );
    expect(defaults.afamaxKpaApiUrl.href).toBe(
      "https://afamax.de/api/v1/purchase-price-allocation",
    );
    expect(defaults.afamaxPriceQuoteApiUrl.href).toBe(
      "https://afamax.de/api/v1/price-quote",
    );

    const custom = loadConfig("stdio", {
      AFAMAX_API_URL: "https://example.test/afa",
      AFAMAX_KPA_API_URL: "https://example.test/kpa",
    });
    expect(custom.afamaxApiUrl.href).toBe("https://example.test/afa");
    expect(custom.afamaxKpaApiUrl.href).toBe("https://example.test/kpa");
  });

  it("derives the appointment and price endpoints from the AfA endpoint's origin", () => {
    const local = loadConfig("stdio", {
      AFAMAX_API_URL: "http://localhost:3000/api/v1/afa-calculation",
    });
    expect(local.afamaxPriceQuoteApiUrl.href).toBe(
      "http://localhost:3000/api/v1/price-quote",
    );
    expect(local.afamaxAppointmentAvailabilityApiUrl.href).toBe(
      "http://localhost:3000/api/v1/appointments/availability",
    );
    expect(local.afamaxAppointmentBookingApiUrl.href).toBe(
      "http://localhost:3000/api/v1/appointments/book",
    );
  });

  it("uses the rightmost valid forwarded address", () => {
    const request = new Request("https://mcp.rundum.immo/mcp", {
      headers: { "x-forwarded-for": "198.51.100.20, 203.0.113.30" },
    });
    expect(getClientIp(request)).toBe("203.0.113.30");
  });

  it("rejects non-IP forwarding values", () => {
    const request = new Request("https://mcp.rundum.immo/mcp", {
      headers: { "x-real-ip": "attacker.invalid" },
    });
    expect(getClientIp(request)).toBeUndefined();
  });
});
