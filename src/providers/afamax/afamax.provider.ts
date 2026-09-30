import type {
  PropertyDepreciationInput,
  PropertyDepreciationOutput,
} from "../../contracts/property-depreciation.js";
import type {
  PurchasePriceAllocationInput,
  PurchasePriceAllocationOutput,
} from "../../contracts/purchase-price-allocation.js";
import type {
  PriceQuoteInput,
  PriceQuoteOutput,
} from "../../contracts/price-quote.js";
import type {
  AppointmentAvailabilityInput,
  AppointmentAvailabilityOutput,
  BookingInput,
  BookingOutput,
} from "../../contracts/appointments.js";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "../appraisal-provider.js";
import { AfamaxClient } from "./afamax.client.js";

export class AfamaxAppraisalProvider implements AppraisalProvider {
  constructor(private readonly client: AfamaxClient) {}

  calculatePropertyDepreciation(
    input: PropertyDepreciationInput,
    context?: AppraisalRequestContext,
  ): Promise<PropertyDepreciationOutput> {
    return this.client.calculate(input, context);
  }

  calculatePurchasePriceAllocation(
    input: PurchasePriceAllocationInput,
    context?: AppraisalRequestContext,
  ): Promise<PurchasePriceAllocationOutput> {
    return this.client.calculatePurchasePriceAllocation(input, context);
  }

  getPriceQuote(
    input: PriceQuoteInput,
    context?: AppraisalRequestContext,
  ): Promise<PriceQuoteOutput> {
    return this.client.priceQuote(input, context);
  }

  getAvailableAppointments(
    input: AppointmentAvailabilityInput,
    context?: AppraisalRequestContext,
  ): Promise<AppointmentAvailabilityOutput> {
    return this.client.availableAppointments(input, context);
  }

  bookAppointment(
    input: BookingInput,
    context?: AppraisalRequestContext,
  ): Promise<BookingOutput> {
    return this.client.bookAppointment(input, context);
  }
}
