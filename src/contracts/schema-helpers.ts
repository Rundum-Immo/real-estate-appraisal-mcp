import { z } from "zod";

export const locales = ["de", "en"] as const;

export function nullAsAbsent<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === null ? undefined : value), schema);
}

// AfAMax still sends the legacy "AfaMax"; accept both until it switches to "AfAMax".
export const attributionProviderSchema = z.enum(["AfaMax", "AfAMax"]);

export const attributionSchema = z
  .object({
    provider: attributionProviderSchema,
    url: z.url(),
    label: z.string(),
  })
  .strict();
