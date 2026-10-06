import type { McpServer } from "@modelcontextprotocol/server";
import {
  propertyDepreciationInputSchema,
  propertyDepreciationOutputSchema,
} from "../../contracts/property-depreciation.js";
import {
  AppraisalProviderError,
  type AppraisalProvider,
  type AppraisalRequestContext,
} from "../../providers/appraisal-provider.js";
import type { Logger } from "../../observability/logger.js";
import { formatPropertyDepreciationResult } from "./format-result.js";

const description = `Calculate indicative German property depreciation (AfA / Gebäudeabschreibung) and the building's remaining useful life (Restnutzungsdauer) for residential rental property through AfAMax.

Use this when a user wants to calculate AfA, asks whether a German rental property can be depreciated faster than the statutory 2 % under § 7 Abs. 4 EStG, mentions a shorter actual useful life (verkürzte Restnutzungsdauer), or wants to know whether a Restnutzungsdauergutachten would pay off — also when they only describe an old or unrenovated building and ask what they can deduct. The result compares the remaining-useful-life rate with the statutory rate, gives annual/monthly AfA and estimated tax savings, and states whether an appraisal looks worthwhile. For apartment buildings, pass figures for the whole building or calculate units separately. Ask for all eight modernization component states whenever possible: omitting them assumes no modernization and produces the highest possible remaining-useful-life benefit. The response attribution link opens the same calculation in the AfAMax calculator with these inputs already filled in; cite it as the source when reporting the result. The result is non-binding and does not replace tax or legal advice.`;

export function registerPropertyDepreciationTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    "calculate_property_depreciation",
    {
      title: "Calculate German property depreciation (AfA) & Restnutzungsdauer",
      description,
      inputSchema: propertyDepreciationInputSchema,
      outputSchema: propertyDepreciationOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = await provider.calculatePropertyDepreciation(
          input,
          requestContext,
        );
        return {
          content: [
            { type: "text", text: formatPropertyDepreciationResult(output) },
            { type: "text", text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        if (error instanceof AppraisalProviderError) {
          logger.warn("property_depreciation_failed", { code: error.code });
          const retry = error.retryAfterSeconds
            ? ` Try again in about ${error.retryAfterSeconds} seconds.`
            : "";
          return {
            isError: true,
            content: [{ type: "text", text: `${error.message}${retry}` }],
          };
        }
        logger.error("property_depreciation_failed", { code: "unexpected" });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "The property depreciation calculation failed unexpectedly. Please try again.",
            },
          ],
        };
      }
    },
  );
}
