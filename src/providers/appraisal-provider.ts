import type {
  PropertyDepreciationInput,
  PropertyDepreciationOutput,
} from "../contracts/property-depreciation.js";
import type {
  PurchasePriceAllocationInput,
  PurchasePriceAllocationOutput,
} from "../contracts/purchase-price-allocation.js";
import type {
  PriceQuoteInput,
  PriceQuoteOutput,
} from "../contracts/price-quote.js";
import type {
  AppointmentAvailabilityInput,
  AppointmentAvailabilityOutput,
  BookingInput,
  BookingOutput,
} from "../contracts/appointments.js";

export interface AppraisalRequestContext {
  clientIp?: string;
}

export interface AppraisalProvider {
  calculatePropertyDepreciation(
    input: PropertyDepreciationInput,
    context?: AppraisalRequestContext,
  ): Promise<PropertyDepreciationOutput>;
  calculatePurchasePriceAllocation(
    input: PurchasePriceAllocationInput,
    context?: AppraisalRequestContext,
  ): Promise<PurchasePriceAllocationOutput>;
  getPriceQuote(
    input: PriceQuoteInput,
    context?: AppraisalRequestContext,
  ): Promise<PriceQuoteOutput>;
  getAvailableAppointments(
    input: AppointmentAvailabilityInput,
    context?: AppraisalRequestContext,
  ): Promise<AppointmentAvailabilityOutput>;
  bookAppointment(
    input: BookingInput,
    context?: AppraisalRequestContext,
  ): Promise<BookingOutput>;
}

export type ProviderErrorCode =
  | "configuration"
  | "invalid_response"
  | "network"
  | "rate_limited"
  | "service_disabled"
  | "timeout"
  | "upstream_error"
  | "upstream_refused"
  | "upstream_validation";

export interface UpstreamRefusal {
  upstreamCode?: string;
  fallbackUrl?: string;
}

export class AppraisalProviderError extends Error {
  readonly upstreamCode: string | undefined;
  readonly fallbackUrl: string | undefined;

  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly retryAfterSeconds?: number,
    options?: ErrorOptions & UpstreamRefusal,
  ) {
    super(message, options);
    this.name = "AppraisalProviderError";
    this.upstreamCode = options?.upstreamCode;
    this.fallbackUrl = options?.fallbackUrl;
  }
}
