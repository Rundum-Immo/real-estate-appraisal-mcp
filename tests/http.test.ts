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

    const custom = loadConfig("stdio", {
      AFAMAX_API_URL: "https://example.test/afa",
      AFAMAX_KPA_API_URL: "https://example.test/kpa",
    });
    expect(custom.afamaxApiUrl.href).toBe("https://example.test/afa");
    expect(custom.afamaxKpaApiUrl.href).toBe("https://example.test/kpa");
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
