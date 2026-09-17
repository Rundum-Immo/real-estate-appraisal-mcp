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
  AppraisalProviderError,
  type AppraisalRequestContext,
} from "../appraisal-provider.js";

export interface AfamaxClientOptions {
  apiUrl: URL;
  purchasePriceAllocationApiUrl: URL;
  timeoutMs: number;
  serviceToken?: string;
  fetch?: typeof globalThis.fetch;
}

interface UpstreamErrorBody {
  errorCode?: unknown;
  errorMessage?: unknown;
}

const maxResponseBytes = 256 * 1024;

export class AfamaxClient {
  readonly #apiUrl: URL;
  readonly #purchasePriceAllocationApiUrl: URL;
  readonly #timeoutMs: number;
  readonly #serviceToken: string | undefined;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: AfamaxClientOptions) {
    this.#apiUrl = options.apiUrl;
    this.#purchasePriceAllocationApiUrl = options.purchasePriceAllocationApiUrl;
    this.#timeoutMs = options.timeoutMs;
    this.#serviceToken = options.serviceToken;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async calculate(
    input: PropertyDepreciationInput,
    context: AppraisalRequestContext = {},
  ): Promise<PropertyDepreciationOutput> {
    const body = await this.#request(this.#apiUrl, input, context);
    const result = propertyDepreciationOutputSchema.safeParse(body);
    if (!result.success) {
      throw new AppraisalProviderError(
        "invalid_response",
        "AfAMax returned a response that does not match the public API contract.",
      );
    }
    return result.data;
  }

  async calculatePurchasePriceAllocation(
    input: PurchasePriceAllocationInput,
    context: AppraisalRequestContext = {},
  ): Promise<PurchasePriceAllocationOutput> {
    const body = await this.#request(
      this.#purchasePriceAllocationApiUrl,
      input,
      context,
    );
    const result = purchasePriceAllocationOutputSchema.safeParse(body);
    if (!result.success) {
      throw new AppraisalProviderError(
        "invalid_response",
        "AfAMax returned a response that does not match the public API contract.",
      );
    }
    return result.data;
  }

  async #request(
    apiUrl: URL,
    input: unknown,
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
      "content-type": "application/json",
      "user-agent": "@rundum-immo/real-estate-appraisal-mcp/0.1.1",
    });
    if (this.#serviceToken) {
      headers.set("x-afamax-service-token", this.#serviceToken);
      headers.set("x-afamax-client-ip", context.clientIp!);
    }

    let response: Response;
    try {
      response = await this.#fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(input),
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

    if (response.status === 429 || upstream.errorCode === "RATE_LIMITED") {
      return new AppraisalProviderError(
        "rate_limited",
        "AfAMax rate limit reached. Please try again later.",
        retryAfterSeconds,
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
        "The AfAMax calculation service is temporarily unavailable.",
      );
    }
    return new AppraisalProviderError(
      "upstream_error",
      `AfAMax returned HTTP ${response.status}.`,
    );
  }
}
