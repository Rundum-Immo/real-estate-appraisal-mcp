import { propertyDepreciationOutputSchema, type PropertyDepreciationInput, type PropertyDepreciationOutput } from '../../contracts/property-depreciation.js';
import { AppraisalProviderError, type AppraisalRequestContext } from '../appraisal-provider.js';

export interface AfamaxClientOptions {
  apiUrl: URL;
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
  readonly #timeoutMs: number;
  readonly #serviceToken: string | undefined;
  readonly #fetch: typeof globalThis.fetch;

  constructor(options: AfamaxClientOptions) {
    this.#apiUrl = options.apiUrl;
    this.#timeoutMs = options.timeoutMs;
    this.#serviceToken = options.serviceToken;
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async calculate(input: PropertyDepreciationInput, context: AppraisalRequestContext = {}): Promise<PropertyDepreciationOutput> {
    if (this.#serviceToken && !context.clientIp) {
      throw new AppraisalProviderError('configuration', 'The hosted service could not determine the client address.');
    }

    const headers = new Headers({
      accept: 'application/json',
      'content-type': 'application/json',
      'user-agent': '@rundum-immo/real-estate-appraisal-mcp/0.1.0',
    });
    if (this.#serviceToken) {
      headers.set('x-afamax-service-token', this.#serviceToken);
      headers.set('x-afamax-client-ip', context.clientIp!);
    }

    let response: Response;
    try {
      response = await this.#fetch(this.#apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (error) {
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError')) {
        throw new AppraisalProviderError('timeout', 'AfaMax did not respond before the request timed out.', undefined, { cause: error });
      }
      throw new AppraisalProviderError('network', 'AfaMax could not be reached.', undefined, { cause: error });
    }

    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxResponseBytes) {
      throw new AppraisalProviderError('invalid_response', 'AfaMax returned an unexpectedly large response.');
    }

    let body: unknown;
    try {
      body = text ? JSON.parse(text) : null;
    } catch (error) {
      throw new AppraisalProviderError('invalid_response', 'AfaMax returned invalid JSON.', undefined, { cause: error });
    }

    if (!response.ok) {
      throw this.#mapError(response, body);
    }

    const result = propertyDepreciationOutputSchema.safeParse(body);
    if (!result.success) {
      throw new AppraisalProviderError('invalid_response', 'AfaMax returned a response that does not match the public API contract.');
    }
    return result.data;
  }

  #mapError(response: Response, body: unknown): AppraisalProviderError {
    const upstream = body && typeof body === 'object' ? body as UpstreamErrorBody : {};
    const retryAfter = Number.parseInt(response.headers.get('retry-after') ?? '', 10);
    const retryAfterSeconds = Number.isFinite(retryAfter) ? retryAfter : undefined;

    if (response.status === 429 || upstream.errorCode === 'RATE_LIMITED') {
      return new AppraisalProviderError('rate_limited', 'AfaMax rate limit reached. Please try again later.', retryAfterSeconds);
    }
    if (response.status === 422 || upstream.errorCode === 'VALIDATION_FAILED') {
      return new AppraisalProviderError('upstream_validation', 'AfaMax rejected the calculation input.');
    }
    if (response.status === 503 || upstream.errorCode === 'SERVICE_DISABLED') {
      return new AppraisalProviderError('service_disabled', 'The AfaMax calculation service is temporarily unavailable.');
    }
    return new AppraisalProviderError('upstream_error', `AfaMax returned HTTP ${response.status}.`);
  }
}
