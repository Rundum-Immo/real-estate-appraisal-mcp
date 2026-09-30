import type { CallToolResult } from "@modelcontextprotocol/server";
import { AppraisalProviderError } from "../providers/appraisal-provider.js";
import type { Logger } from "../observability/logger.js";

// What the calling model should do next, per AfAMax refusal code.
const refusalGuidance: Record<string, string> = {
  SLOT_UNAVAILABLE:
    "Call get_available_appointments again and offer the user a different slot.",
  CUSTOMER_LOGIN_REQUIRED:
    "This e-mail belongs to an existing AfAMax account, so the booking cannot be made here: ask " +
    "the user to log in and book on the website.",
  VERIFICATION_INVALID:
    "Ask the user to re-check the 6-digit code in the e-mail and call again with it. Do not guess.",
  VERIFICATION_EXPIRED:
    "The code expired. Start again with step 1 (startDateTime, name, email) to send a new code.",
  VERIFICATION_ATTEMPTS_EXCEEDED:
    "Too many wrong codes. Start again with step 1 to send a new code.",
  VERIFICATION_REPLAY:
    "This booking is already confirmed — nothing more to do.",
  VERIFICATION_NOT_FOUND:
    "The verificationId is unknown. Start again with step 1 to send a new code.",
  BOOKING_UNAVAILABLE:
    "Online booking is not available for this provider right now.",
};

// Logs only error codes: booking input holds a name, e-mail address and verification code.
export function providerErrorResult(
  error: unknown,
  logger: Logger,
  event: string,
  unexpectedMessage: string,
): CallToolResult {
  if (error instanceof AppraisalProviderError) {
    logger.warn(event, {
      code: error.code,
      ...(error.upstreamCode && { upstreamCode: error.upstreamCode }),
    });
    const text = [
      error.message,
      error.retryAfterSeconds
        ? `Try again in about ${error.retryAfterSeconds} seconds.`
        : undefined,
      error.upstreamCode ? refusalGuidance[error.upstreamCode] : undefined,
      error.fallbackUrl
        ? `The user can continue on the website: ${error.fallbackUrl}`
        : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    return { isError: true, content: [{ type: "text", text }] };
  }
  logger.error(event, { code: "unexpected" });
  return {
    isError: true,
    content: [{ type: "text", text: unexpectedMessage }],
  };
}
