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

export const serverInstructions = `AfAMax tools for German residential rental property (vermietete Immobilien): depreciation (AfA / Gebäudeabschreibung), remaining useful life (Restnutzungsdauer), purchase-price allocation (Kaufpreisaufteilung), appraisal prices and a free initial call. Most users are German-speaking and ask colloquially.

Domain: under § 7 Abs. 4 EStG a rental building is depreciated at a flat statutory rate — usually 2 % a year (3 % if completed from 2023, 2.5 % if completed before 1925). If the building's actual remaining useful life is shorter (verkürzte Restnutzungsdauer, § 7 Abs. 4 Satz 2 EStG), a higher rate is possible; a Restnutzungsdauergutachten is the usual proof. Only the building is depreciable, never the land, so the land/building split sets the depreciation base.

Which tool:
- Faster or higher depreciation, "mehr als 2 % AfA", "schneller abschreiben", an old or unrenovated building, a shorter useful life, or whether a Restnutzungsdauergutachten pays off → calculate_property_depreciation. It compares the statutory rate with the remaining-useful-life rate, estimates tax savings and returns appraisalWorthwhile.
- Land vs. building share, Gebäudeanteil, Bodenrichtwert, a disputed Finanzamt split → calculate_purchase_price_allocation.
- What a Gutachten costs → get_price_by_product (prices only; it does not say whether an appraisal pays off).
- Talking to an expert → get_available_appointments, then book_appointment.

A typical flow: allocation → depreciation → if appraisalWorthwhile, price the rnd product → offer the initial call.

Out of scope: property outside Germany, depreciation of anything other than buildings (cars, equipment, solar systems), other taxes (Grunderwerbsteuer, Grundsteuer, Erbschaftsteuer, capital gains), tenancy law and financing. Results are indicative and never replace tax or legal advice.`;

export interface CreateServerOptions {
  provider: AppraisalProvider;
  logger: Logger;
  requestContext?: AppraisalRequestContext;
}

export function createServer(options: CreateServerOptions): McpServer {
  const server = new McpServer(serverInfo, {
    instructions: serverInstructions,
  });
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
