import type { AppointmentAvailabilityOutput } from "../../contracts/appointments.js";
import { formatSourceLine } from "../format-attribution.js";

export function formatAvailableAppointmentsResult(
  result: AppointmentAvailabilityOutput,
): string {
  const lines = [
    formatSourceLine(result.attribution),
    `${result.description} Times are in ${result.timeZone}; each call lasts ${result.durationMinutes} minutes.`,
  ];

  if (result.days.length === 0) {
    lines.push(
      "No free slots in this window. Try a later `from` or more `days`, or book on the contact page above.",
    );
    return lines.join("\n");
  }

  for (const day of result.days) {
    const slots = day.slots
      .map((slot) => `${slot.localTime} (${slot.startDateTime})`)
      .join(", ");
    lines.push(
      `- ${day.date} ${day.weekday}, ${day.freeSlotCount} free: ${slots}`,
    );
  }
  lines.push(
    "Slots are live and can be taken at any time. To book, pass the chosen startDateTime unchanged to book_appointment.",
  );
  return lines.join("\n");
}
