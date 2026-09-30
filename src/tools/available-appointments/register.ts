import type { McpServer } from "@modelcontextprotocol/server";
import {
  appointmentAvailabilityInputSchema,
  appointmentAvailabilityOutputSchema,
} from "../../contracts/appointments.js";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "../../providers/appraisal-provider.js";
import type { Logger } from "../../observability/logger.js";
import { providerErrorResult } from "../tool-error.js";
import { formatAvailableAppointmentsResult } from "./format-result.js";

const description = `Lists open slots for a free, non-binding 15-minute initial phone call with the AfAMax team (Erstgespräch), on weekdays in the Europe/Berlin time zone, grouped by day.

Each day lists a sample spread across the day (maxSlotsPerDay, default 8) and its freeSlotCount; for a specific time, call again for that day with days: 1 and maxSlotsPerDay: 32. Show the user the day and localTime; to book one, pass its startDateTime unchanged to book_appointment. Slots are live and can be taken at any time, so re-check rather than reusing an old list. The response attribution links to the contact page, where the user can also book directly.`;

export function registerAvailableAppointmentsTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    "get_available_appointments",
    {
      title: "List free AfAMax initial-call appointment slots",
      description,
      inputSchema: appointmentAvailabilityInputSchema,
      outputSchema: appointmentAvailabilityOutputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) => {
      try {
        const output = await provider.getAvailableAppointments(
          input,
          requestContext,
        );
        return {
          content: [
            { type: "text", text: formatAvailableAppointmentsResult(output) },
            { type: "text", text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return providerErrorResult(
          error,
          logger,
          "available_appointments_failed",
          "The appointment lookup failed unexpectedly. Please try again.",
        );
      }
    },
  );
}
