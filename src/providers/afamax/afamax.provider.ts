import type {
  PropertyDepreciationInput,
  PropertyDepreciationOutput,
} from "../../contracts/property-depreciation.js";
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
}
