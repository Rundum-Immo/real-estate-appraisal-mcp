import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

interface GoldenPrompt {
  id: string;
  lang: "de" | "en" | "mixed";
  category: "direct" | "indirect" | "negative";
  prompt: string;
  expected: string | null;
  alsoAcceptable?: string[];
}

const serverTools = [
  "calculate_property_depreciation",
  "calculate_purchase_price_allocation",
  "get_price_by_product",
  "get_available_appointments",
  "book_appointment",
];

const golden = JSON.parse(
  await readFile(
    new URL("../evals/discovery/golden-prompts.json", import.meta.url),
    "utf8",
  ),
) as GoldenPrompt[];

describe("golden prompt dataset", () => {
  it("meets the afamax-510 size and language requirements", () => {
    const count = (category: GoldenPrompt["category"]) =>
      golden.filter((entry) => entry.category === category).length;
    expect(count("direct")).toBeGreaterThanOrEqual(20);
    expect(count("indirect")).toBeGreaterThanOrEqual(30);
    expect(count("negative")).toBeGreaterThanOrEqual(20);
    const german = golden.filter((entry) => entry.lang === "de").length;
    expect(german / golden.length).toBeGreaterThanOrEqual(0.7);
  });

  it("has unique ids and only names real tools", () => {
    expect(new Set(golden.map((entry) => entry.id)).size).toBe(golden.length);
    for (const entry of golden) {
      for (const tool of [entry.expected, ...(entry.alsoAcceptable ?? [])]) {
        if (tool !== null) expect(serverTools).toContain(tool);
      }
      expect(entry.expected === null).toBe(entry.category === "negative");
    }
  });
});
