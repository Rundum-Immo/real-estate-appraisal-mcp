import { McpServer } from "@modelcontextprotocol/server";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "./providers/appraisal-provider.js";
import type { Logger } from "./observability/logger.js";
import { registerPropertyDepreciationTool } from "./tools/property-depreciation/register.js";
import { registerPurchasePriceAllocationTool } from "./tools/purchase-price-allocation/register.js";
import { registerPriceQuoteTool } from "./tools/price-quote/register.js";
import { registerAvailableAppointmentsTool } from "./tools/available-appointments/register.js";
import { registerBookAppointmentTool } from "./tools/book-appointment/register.js";
import { packageVersion } from "./version.js";

export const serverInfo = {
  name: "immo.rundum/real-estate-appraisal",
  version: packageVersion,
} as const;

export interface CreateServerOptions {
  provider: AppraisalProvider;
  logger: Logger;
  requestContext?: AppraisalRequestContext;
}

export function createServer(options: CreateServerOptions): McpServer {
  const server = new McpServer(serverInfo);
  const requestContext = options.requestContext ?? {};
  for (const register of [
    registerPropertyDepreciationTool,
    registerPurchasePriceAllocationTool,
    registerPriceQuoteTool,
    registerAvailableAppointmentsTool,
    registerBookAppointmentTool,
  ]) {
    register(server, options.provider, requestContext, options.logger);
  }
  return server;
}
