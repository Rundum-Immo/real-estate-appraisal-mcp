import { McpServer } from "@modelcontextprotocol/server";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "./providers/appraisal-provider.js";
import type { Logger } from "./observability/logger.js";
import { registerPropertyDepreciationTool } from "./tools/property-depreciation/register.js";
import { registerPurchasePriceAllocationTool } from "./tools/purchase-price-allocation/register.js";

export const serverInfo = {
  name: "immo.rundum/real-estate-appraisal",
  version: "0.1.0",
} as const;

export interface CreateServerOptions {
  provider: AppraisalProvider;
  logger: Logger;
  requestContext?: AppraisalRequestContext;
}

export function createServer(options: CreateServerOptions): McpServer {
  const server = new McpServer(serverInfo);
  registerPropertyDepreciationTool(
    server,
    options.provider,
    options.requestContext ?? {},
    options.logger,
  );
  registerPurchasePriceAllocationTool(
    server,
    options.provider,
    options.requestContext ?? {},
    options.logger,
  );
  return server;
}
