import { z } from "zod";
import {
  propertyDepreciationOutputSchema,
  type PropertyDepreciationInput,
  type PropertyDepreciationOutput,
} from "../../contracts/property-depreciation.js";
import {
  purchasePriceAllocationOutputSchema,
  type PurchasePriceAllocationInput,
  type PurchasePriceAllocationOutput,
} from "../../contracts/purchase-price-allocation.js";
import {
  priceQuoteOutputSchema,
  type PriceQuoteInput,
  type PriceQuoteOutput,
} from "../../contracts/price-quote.js";
import {
  appointmentAvailabilityOutputSchema,
  bookingOutputSchema,
  type AppointmentAvailabilityInput,
  type AppointmentAvailabilityOutput,
  type BookingInput,
  type BookingOutput,
} from "../../contracts/appointments.js";
import {
  AppraisalProviderError,
  type AppraisalRequestContext,
  type UpstreamRefusal,
} from "../appraisal-provider.js";
import { packageVersion } from "../../version.js";

export interface AfamaxClientOptions {
  apiUrl: URL;
  purchasePriceAllocationApiUrl: URL;
  priceQuoteApiUrl: URL;
  appointmentAvailabilityApiUrl: URL;
  appointmentBookingApiUrl: URL;
  timeoutMs: number;
  serviceToken?: string;
  fetch?: typeof globalThis.fetch;
}

interface UpstreamErrorBody {
  errorCode?: unknown;
  errorMessage?: unknown;
  fallbackUrl?: unknown;
}

interface RequestOptions {
  method: "GET" | "POST";
  body?: unknown;
}

const maxResponseBytes = 256 * 1024;
const maxRefusalMessageLength = 300;
const upstreamCodePattern = /^[A-Z][A-Z0-9_]{1,63}$/;

export class AfamaxClient {
  readonly #apiUrl: URL;
  readonly #purchasePriceAllocationApiUrl: URL;
  readonly #priceQuoteApiUrl: URL;
  readonly #appointmentAvailabilityApiUrl: URL;
  readonly #appointmentBookingApiUrl: URL;
  readonly #timeoutMs: number;
  readonly #serviceToken: string | undefined;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: AfamaxClientOptions) {
    this.#apiUrl = options.apiUrl;
    this.#purchasePriceAllocationApiUrl = options.purchasePriceAllocationApiUrl;
    this.#priceQuoteApiUrl = options.priceQuoteApiUrl;
    this.#appointmentAvailabilityApiUrl = options.appointmentAvailabilityApiUrl;
    this.#appointmentBookingApiUrl = options.appointmentBookingApiUrl;
    this.#timeoutMs = options.timeoutMs;
    this.#serviceToken = options.serviceToken;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async calculate(
    input: PropertyDepreciationInput,
    context: AppraisalRequestContext = {},
  ): Promise<PropertyDepreciationOutput> {
    const body = await this.#request(
      this.#apiUrl,
      { method: "POST", body: input },
      context,
    );
    return parseContract(propertyDepreciationOutputSchema, body);
  }

  async calculatePurchasePriceAllocation(
    input: PurchasePriceAllocationInput,
    context: AppraisalRequestContext = {},
  ): Promise<PurchasePriceAllocationOutput> {
    const body = await this.#request(
      this.#purchasePriceAllocationApiUrl,
      { method: "POST", body: input },
      context,
    );
    return parseContract(purchasePriceAllocationOutputSchema, body);
  }

  async priceQuote(
    input: PriceQuoteInput,
    context: AppraisalRequestContext = {},
  ): Promise<PriceQuoteOutput> {
    const body = await this.#request(
      this.#priceQuoteApiUrl,
      { method: "POST", body: input },
      context,
    );
    return parseContract(priceQuoteOutputSchema, body);
  }

  async availableAppointments(
    input: AppointmentAvailabilityInput,
    context: AppraisalRequestContext = {},
  ): Promise<AppointmentAvailabilityOutput> {
    const url = new URL(this.#appointmentAvailabilityApiUrl);
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const body = await this.#request(url, { method: "GET" }, context);
    return parseContract(appointmentAvailabilityOutputSchema, body);
  }

  async bookAppointment(
    input: BookingInput,
    context: AppraisalRequestContext = {},
  ): Promise<BookingOutput> {
    const body = await this.#request(
      this.#appointmentBookingApiUrl,
      { method: "POST", body: input },
      context,
    );
    return parseContract(bookingOutputSchema, body);
  }

  async #request(
    apiUrl: URL,
    request: RequestOptions,
    context: AppraisalRequestContext,
  ): Promise<unknown> {
    if (this.#serviceToken && !context.clientIp) {
      throw new AppraisalProviderError(
        "configuration",
        "The hosted service could not determine the client address.",
      );
    }

    const headers = new Headers({
      accept: "application/json",
      "user-agent": `@rundum-immo/real-estate-appraisal-mcp/${packageVersion}`,
    });
    if (request.body !== undefined) {
      headers.set("content-type", "application/json");
    }
    if (this.#serviceToken) {
      headers.set("x-afamax-service-token", this.#serviceToken);
      headers.set("x-afamax-client-ip", context.clientIp!);
    }

    let response: Response;
    try {
      response = await this.#fetch(apiUrl, {
        method: request.method,
        headers,
        ...(request.body !== undefined && {
          body: JSON.stringify(request.body),
        }),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "AbortError" || error.name === "TimeoutError")
      ) {
        throw new AppraisalProviderError(
          "timeout",
          "AfAMax did not respond before the request timed out.",
          undefined,
          { cause: error },
        );
      }
      throw new AppraisalProviderError(
        "network",
        "AfAMax could not be reached.",
        undefined,
        { cause: error },
      );
    }

    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxResponseBytes) {
      throw new AppraisalProviderError(
        "invalid_response",
        "AfAMax returned an unexpectedly large response.",
      );
    }

    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new AppraisalProviderError(
        "invalid_response",
        "AfAMax returned invalid JSON.",
        undefined,
        { cause: error },
      );
    }

    if (!response.ok) {
      throw this.#mapError(response, body);
    }

    return body;
  }

  #mapError(response: Response, body: unknown): AppraisalProviderError {
    const upstream =
      body && typeof body === "object" ? (body as UpstreamErrorBody) : {};
    const retryAfter = Number.parseInt(
      response.headers.get("retry-after") ?? "",
      10,
    );
    const retryAfterSeconds = Number.isFinite(retryAfter)
      ? retryAfter
      : undefined;
    const refusal = readRefusal(upstream);

    if (response.status === 429 || upstream.errorCode === "RATE_LIMITED") {
      return new AppraisalProviderError(
        "rate_limited",
        "AfAMax rate limit reached. Please try again later.",
        retryAfterSeconds,
        refusal,
      );
    }
    if (response.status === 422 || upstream.errorCode === "VALIDATION_FAILED") {
      return new AppraisalProviderError(
        "upstream_validation",
        "AfAMax rejected the calculation input.",
      );
    }
    if (response.status === 503 || upstream.errorCode === "SERVICE_DISABLED") {
      return new AppraisalProviderError(
        "service_disabled",
        "The AfAMax service is temporarily unavailable.",
        undefined,
        refusal,
      );
    }
    // Actionable refusals (slot taken, wrong code) carry AfAMax's public message; pass it on.
    if (
      response.status >= 400 &&
      response.status < 500 &&
      refusal.upstreamCode &&
      typeof upstream.errorMessage === "string" &&
      upstream.errorMessage.length <= maxRefusalMessageLength
    ) {
      return new AppraisalProviderError(
        "upstream_refused",
        upstream.errorMessage,
        retryAfterSeconds,
        refusal,
      );
    }
    return new AppraisalProviderError(
      "upstream_error",
      `AfAMax returned HTTP ${response.status}.`,
    );
  }
}

function parseContract<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new AppraisalProviderError(
      "invalid_response",
      "AfAMax returned a response that does not match the public API contract.",
    );
  }
  return result.data;
}

function readRefusal(upstream: UpstreamErrorBody): UpstreamRefusal {
  const refusal: UpstreamRefusal = {};
  if (
    typeof upstream.errorCode === "string" &&
    upstreamCodePattern.test(upstream.errorCode)
  ) {
    refusal.upstreamCode = upstream.errorCode;
  }
  const fallbackUrl = z
    .url({ protocol: /^https?$/ })
    .safeParse(upstream.fallbackUrl);
  if (fallbackUrl.success) refusal.fallbackUrl = fallbackUrl.data;
  return refusal;
}
