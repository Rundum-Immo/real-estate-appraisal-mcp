import { z } from "zod";
import { attributionSchema, locales, nullAsAbsent } from "./schema-helpers.js";

export const availabilityMaxDays = 21;
export const availabilityDefaultDays = 7;
export const availabilityMaxSlotsPerDay = 32;
export const availabilityDefaultSlotsPerDay = 8;

const metaSchema = z
  .object({
    apiVersion: z.string(),
    generatedAt: z.iso.datetime(),
  })
  .strict();

// Ends up in the verification e-mail, so links and addresses are refused (as upstream).
const guestNameSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .refine(
    (value) => !/(:\/\/|www\.|@|<|>|[a-z0-9-]+\.[a-z]{2,}\/)/i.test(value),
    "Must be a person’s name — links, e-mail addresses and markup are not allowed",
  );

export const appointmentAvailabilityInputSchema = z
  .object({
    from: nullAsAbsent(z.iso.datetime({ offset: true }).optional()).describe(
      "ISO 8601 date-time to start looking from. Defaults to now. / Frühester Zeitpunkt.",
    ),
    days: nullAsAbsent(
      z.coerce.number().int().min(1).max(availabilityMaxDays).optional(),
    ).describe(
      `How many calendar days to look ahead (1-${availabilityMaxDays}, default ` +
        `${availabilityDefaultDays}). / Anzahl Tage.`,
    ),
    maxSlotsPerDay: nullAsAbsent(
      z.coerce.number().int().min(1).max(availabilityMaxSlotsPerDay).optional(),
    ).describe(
      `How many slots to list per day (1-${availabilityMaxSlotsPerDay}, default ` +
        `${availabilityDefaultSlotsPerDay}), spread evenly across the day. When the ` +
        "user wants a specific time, call again for that day with `days: 1` and " +
        `\`maxSlotsPerDay: ${availabilityMaxSlotsPerDay}\`.`,
    ),
    locale: nullAsAbsent(z.enum(locales).optional().default("de")).describe(
      "Language of the link handed back and the response labels. Match the user's language " +
        "(most users are German-speaking).",
    ),
  })
  .strict();

export const appointmentAvailabilityOutputSchema = z
  .object({
    requestId: z.string().min(1),
    appointmentType: z.literal("initial_call"),
    description: z.string(),
    days: z.array(
      z
        .object({
          date: z.string().describe("Date in Europe/Berlin, YYYY-MM-DD."),
          weekday: z.string(),
          freeSlotCount: z
            .number()
            .describe(
              "All free slots that day — can exceed `slots`, which is capped by maxSlotsPerDay.",
            ),
          slots: z.array(
            z
              .object({
                startDateTime: z.iso
                  .datetime()
                  .describe(
                    "Slot start in UTC — pass this unchanged to book_appointment.",
                  ),
                localTime: z
                  .string()
                  .describe(
                    "Start time in Europe/Berlin, HH:mm — show this to the user.",
                  ),
              })
              .strict(),
          ),
        })
        .strict(),
    ),
    timeZone: z.string(),
    durationMinutes: z.number(),
    attribution: attributionSchema,
    meta: metaSchema,
  })
  .strict();

const stepOneFields = ["startDateTime", "name", "email", "phone"] as const;
const requiredStepOneFields = ["startDateTime", "name", "email"] as const;
const stepTwoFields = ["verificationId", "otp"] as const;

// One object for both steps: MCP requires a top-level `type: "object"` input schema.
export const bookingInputSchema = z
  .object({
    startDateTime: nullAsAbsent(
      z.iso.datetime({ offset: true }).optional(),
    ).describe(
      "Step 1 — the chosen slot, copied exactly from get_available_appointments `startDateTime`.",
    ),
    name: nullAsAbsent(guestNameSchema.optional()).describe(
      "Step 1 — the user's full name. / Vor- und Nachname.",
    ),
    email: nullAsAbsent(z.email().max(254).optional()).describe(
      "Step 1 — the user's own e-mail address; the 6-digit confirmation code is sent there. " +
        "Confirm it with the user before calling. / E-Mail-Adresse für den Bestätigungscode.",
    ),
    phone: nullAsAbsent(z.string().trim().max(40).optional()).describe(
      "Step 1, optional — phone number for the call. / Telefonnummer für das Gespräch.",
    ),
    verificationId: nullAsAbsent(
      z.string().trim().min(1).max(64).optional(),
    ).describe("Step 2 — the `verificationId` returned by step 1."),
    otp: nullAsAbsent(
      z
        .string()
        .trim()
        .regex(/^\d{6}$/, "Must be the 6-digit code from the e-mail")
        .optional(),
    ).describe(
      "Step 2 — the 6-digit code the user received by e-mail. Only ever the code the user gives " +
        "you; never guess or retry codes. / Der 6-stellige Code aus der E-Mail.",
    ),
    locale: nullAsAbsent(z.enum(locales).optional()).describe(
      "Step 1 — language of the confirmation e-mail, the appointment and the links (`de` if " +
        "omitted); match the user's language. Step 2 keeps step 1's language unless set. / " +
        "Sprache der E-Mails und des Termins.",
    ),
  })
  .strict()
  .superRefine((value, context) => {
    const confirming =
      value.verificationId !== undefined || value.otp !== undefined;
    if (confirming) {
      for (const field of stepTwoFields) {
        if (value[field] === undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Required in step 2 (verificationId and otp together)",
          });
        }
      }
      for (const field of stepOneFields) {
        if (value[field] !== undefined) {
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Not allowed in step 2 — send only verificationId and otp",
          });
        }
      }
      return;
    }
    for (const field of requiredStepOneFields) {
      if (value[field] === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Required in step 1",
        });
      }
    }
  });

export const bookingOutputSchema = z
  .object({
    requestId: z.string().min(1),
    status: z
      .enum(["verification_required", "booked"])
      .describe(
        "`verification_required`: ask the user for the code sent to `verification.maskedEmail`, " +
          "then call again with verificationId + otp. `booked`: the appointment exists.",
      ),
    verification: z
      .object({
        verificationId: z.string(),
        maskedEmail: z.string(),
        expiresAt: z.iso.datetime(),
      })
      .strict()
      .nullable(),
    appointment: z
      .object({
        startDateTime: z.iso.datetime(),
        endDateTime: z.iso.datetime(),
        localDate: z.string(),
        localTime: z.string(),
        timeZone: z.string(),
        durationMinutes: z.number(),
        customerInviteSent: z.boolean(),
      })
      .strict()
      .nullable(),
    attribution: attributionSchema,
    meta: metaSchema,
  })
  .strict();

export type AppointmentAvailabilityInput = z.infer<
  typeof appointmentAvailabilityInputSchema
>;
export type AppointmentAvailabilityOutput = z.infer<
  typeof appointmentAvailabilityOutputSchema
>;
export type BookingInput = z.infer<typeof bookingInputSchema>;
export type BookingOutput = z.infer<typeof bookingOutputSchema>;
