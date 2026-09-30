import type { BookingOutput } from "../../contracts/appointments.js";
import { formatSourceLine } from "../format-attribution.js";

export function formatBookingResult(result: BookingOutput): string {
  const lines = [formatSourceLine(result.attribution)];

  if (result.status === "verification_required" && result.verification) {
    const { verificationId, maskedEmail, expiresAt } = result.verification;
    lines.push(
      `Not booked yet. A 6-digit confirmation code was sent to ${maskedEmail}; it expires at ${expiresAt}.`,
      "Ask the user for the code from that e-mail, then call book_appointment again with only " +
        `verificationId "${verificationId}" and otp. Use only the code the user gives you — never guess it.`,
    );
    return lines.join("\n");
  }

  if (result.appointment) {
    const appointment = result.appointment;
    lines.push(
      `Booked: ${appointment.localDate} at ${appointment.localTime} (${appointment.timeZone}), ` +
        `${appointment.durationMinutes} minutes.`,
      appointment.customerInviteSent
        ? "A calendar invitation was sent to the user's e-mail address."
        : "The booking is confirmed, but the calendar invitation could not be sent.",
    );
  }
  return lines.join("\n");
}
