import type { PropertyDepreciationInput, PropertyDepreciationOutput } from '../contracts/property-depreciation.js';

export interface AppraisalRequestContext {
  clientIp?: string;
}

export interface AppraisalProvider {
  calculatePropertyDepreciation(
    input: PropertyDepreciationInput,
    context?: AppraisalRequestContext,
  ): Promise<PropertyDepreciationOutput>;
}

export type ProviderErrorCode =
  | 'configuration'
  | 'invalid_response'
  | 'network'
  | 'rate_limited'
  | 'service_disabled'
  | 'timeout'
  | 'upstream_error'
  | 'upstream_validation';

export class AppraisalProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'AppraisalProviderError';
  }
}
