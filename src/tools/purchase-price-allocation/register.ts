import type { McpServer } from "@modelcontextprotocol/server";
import {
  purchasePriceAllocationInputSchema,
  purchasePriceAllocationOutputSchema,
} from "../../contracts/purchase-price-allocation.js";
import {
  AppraisalProviderError,
  type AppraisalProvider,
  type AppraisalRequestContext,
} from "../../providers/appraisal-provider.js";
import type { Logger } from "../../observability/logger.js";
import { formatPurchasePriceAllocationResult } from "./format-result.js";

const description = `Calculate a free, non-binding German property purchase-price allocation (Kaufpreisaufteilung) through AfAMax using the BMF Arbeitshilfe.

Use this to divide acquisition costs between non-depreciable land and the depreciable building. Inventory is deducted before allocation. A condominium requires both co-ownership values, and a residential/commercial building requires its commercial share category. Comparative valuation is unavailable because this public contract excludes surveyor-only factors. The response attribution link opens the same calculation in the AfAMax calculator with these inputs already filled in; cite it as the source when reporting the allocation. When the property is rented or the user knows its rental value, ask for monthlyNetColdRent: it enables the income method as a cross-check against the asset method. Ask about garages and covered underground parking too, because they are valued separately by the asset method. Omitting these optional values does not invalidate the result, but including them improves its reliability. The result does not replace tax or legal advice.`;

export function registerPurchasePriceAllocationTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    "calculate_purchase_price_allocation",
    {
      title: "Calculate German purchase price allocation",
      description,
      inputSchema: purchasePriceAllocationInputSchema,
      outputSchema: purchasePriceAllocationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = await provider.calculatePurchasePriceAllocation(
          input,
          requestContext,
        );
        return {
          content: [
            { type: "text", text: formatPurchasePriceAllocationResult(output) },
            { type: "text", text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        if (error instanceof AppraisalProviderError) {
          logger.warn("purchase_price_allocation_failed", { code: error.code });
          const retry = error.retryAfterSeconds
            ? ` Try again in about ${error.retryAfterSeconds} seconds.`
            : "";
          return {
            isError: true,
            content: [{ type: "text", text: `${error.message}${retry}` }],
          };
        }
        logger.error("purchase_price_allocation_failed", {
          code: "unexpected",
        });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "The purchase price allocation failed unexpectedly. Please try again.",
            },
          ],
        };
      }
    },
  );
}
