import type { McpServer } from "@modelcontextprotocol/server";
import {
  priceQuoteInputSchema,
  priceQuoteOutputSchema,
} from "../../contracts/price-quote.js";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "../../providers/appraisal-provider.js";
import type { Logger } from "../../observability/logger.js";
import { providerErrorResult } from "../tool-error.js";
import { formatPriceQuoteResult } from "./format-result.js";

const description = `Returns AfAMax's current list price in EUR, incl. German VAT (19%), for one product — Restnutzungsdauergutachten (rnd), Wertgutachten (kurzgutachten), Verkehrswertgutachten (vollgutachten), Kaufpreisaufteilung or Versetzbarkeitsgutachten — including the options the customer picks when ordering: property inspection (exterior or on-site), express processing and, for multi-unit buildings, a per-flat price.

price.totalPrice is the sum; surchargeTable lists every option so alternatives can be compared without another call. Discount codes are not applied, and the price shown when ordering is binding — say so when quoting. The response attribution links to the product page; cite it as the source when reporting the price.`;

export function registerPriceQuoteTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    "get_price_by_product",
    {
      title: "Get the price of an AfAMax appraisal product",
      description,
      inputSchema: priceQuoteInputSchema,
      outputSchema: priceQuoteOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = await provider.getPriceQuote(input, requestContext);
        return {
          content: [
            { type: "text", text: formatPriceQuoteResult(output) },
            { type: "text", text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return providerErrorResult(
          error,
          logger,
          "price_quote_failed",
          "The price lookup failed unexpectedly. Please try again.",
        );
      }
    },
  );
}
