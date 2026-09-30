import type { McpServer } from "@modelcontextprotocol/server";
import {
  bookingInputSchema,
  bookingOutputSchema,
} from "../../contracts/appointments.js";
import type {
  AppraisalProvider,
  AppraisalRequestContext,
} from "../../providers/appraisal-provider.js";
import type { Logger } from "../../observability/logger.js";
import { providerErrorResult } from "../tool-error.js";
import { formatBookingResult } from "./format-result.js";

const description = `Books a free 15-minute initial phone call with the AfAMax team, in two steps.

STEP 1: after the user picked a slot from get_available_appointments, confirm the slot, their name and their own e-mail address with them, then call with startDateTime, name, email (and optionally phone, locale). AfAMax e-mails a 6-digit code to that address and returns status "verification_required" with a verificationId.

STEP 2: ask the user for the code from that e-mail and call again with only verificationId and otp. The code proves the address belongs to the user: use only the code the user gives you — never guess, invent or repeatedly retry codes. On success status is "booked" and a calendar invitation goes to the user.

Codes expire after 15 minutes and allow 5 attempts. If the slot was taken meanwhile, list slots again and offer another. If the e-mail belongs to an existing AfAMax account, the user must log in and book on the website (link in the error). Only book for the person you are talking to.`;

export function registerBookAppointmentTool(
  server: McpServer,
  provider: AppraisalProvider,
  requestContext: AppraisalRequestContext,
  logger: Logger,
): void {
  server.registerTool(
    "book_appointment",
    {
      title: "Book a free AfAMax initial call",
      description,
      inputSchema: bookingInputSchema,
      outputSchema: bookingOutputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input) => {
      try {
        const output = await provider.bookAppointment(input, requestContext);
        return {
          content: [
            { type: "text", text: formatBookingResult(output) },
            { type: "text", text: JSON.stringify(output) },
          ],
          structuredContent: output,
        };
      } catch (error) {
        return providerErrorResult(
          error,
          logger,
          "book_appointment_failed",
          "The booking failed unexpectedly. Please try again.",
        );
      }
    },
  );
}
