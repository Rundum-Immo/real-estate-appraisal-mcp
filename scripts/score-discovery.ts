// Scores tool picks from the Golden Prompt discovery eval against the expected answers.
// Usage: pnpm eval:discovery:score <picks.json> [--md summary.md]
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { opaqueIds } from "./discovery-ids.js";

const serverTools = new Set([
  "calculate_property_depreciation",
  "calculate_purchase_price_allocation",
  "get_price_by_product",
  "get_available_appointments",
  "book_appointment",
]);

interface GoldenPrompt {
  id: string;
  lang: "de" | "en" | "mixed";
  category: "direct" | "indirect" | "negative";
  prompt: string;
  expected: string | null;
  alsoAcceptable?: string[];
}

const picksPath = process.argv[2];
if (!picksPath) {
  console.error("Usage: pnpm eval:discovery:score <picks.json> [--md summary.md]");
  process.exit(1);
}
const mdArgIndex = process.argv.indexOf("--md");
const mdPath =
  mdArgIndex > -1 ? resolve(process.argv[mdArgIndex + 1] ?? "") : undefined;

const golden = JSON.parse(
  await readFile(
    resolve(import.meta.dirname, "../evals/discovery/golden-prompts.json"),
    "utf8",
  ),
) as GoldenPrompt[];
const ids = opaqueIds(golden.map(({ id }) => id));
const picks = new Map(
  (
    JSON.parse(await readFile(resolve(picksPath), "utf8")) as Array<{
      id: string;
      choice: string;
    }>
  ).map(({ id, choice }) => [id, choice.trim()]),
);

// A negative passes when the pick is anything but one of this server's tools.
function isCorrect(entry: GoldenPrompt, choice: string | undefined): boolean {
  if (choice === undefined) return false;
  if (entry.expected === null) return !serverTools.has(choice);
  return (
    choice === entry.expected || (entry.alsoAcceptable ?? []).includes(choice)
  );
}

const rows = golden.map((entry) => {
  // Older result files are keyed by the original ids.
  const choice = picks.get(ids.get(entry.id) ?? entry.id) ?? picks.get(entry.id);
  return { ...entry, choice, correct: isCorrect(entry, choice) };
});

function score(filter: (row: (typeof rows)[number]) => boolean) {
  const subset = rows.filter(filter);
  const correct = subset.filter((row) => row.correct).length;
  const pct = subset.length ? ((correct / subset.length) * 100).toFixed(1) : "–";
  return `${correct}/${subset.length} (${pct}%)`;
}

const categories = ["direct", "indirect", "negative"] as const;
const langs = ["de", "en", "mixed"] as const;
const lines = [
  `| | ${langs.join(" | ")} | all |`,
  `|---|${langs.map(() => "---").join("|")}|---|`,
  ...categories.map(
    (category) =>
      `| ${category} | ${langs
        .map((lang) =>
          score((row) => row.category === category && row.lang === lang),
        )
        .join(" | ")} | ${score((row) => row.category === category)} |`,
  ),
  `| **all** | ${langs.map((lang) => score((row) => row.lang === lang)).join(" | ")} | **${score(() => true)}** |`,
];

const misses = rows.filter((row) => !row.correct);
const missLines = misses.map(
  (row) =>
    `- \`${row.id}\` (${row.category}, ${row.lang}) „${row.prompt}“ → picked \`${row.choice ?? "missing"}\`, expected \`${row.expected ?? "not a server tool"}\``,
);

const summary = [
  `**Discovery eval** — ${picksPath}`,
  "",
  ...lines,
  "",
  misses.length ? `**Misses (${misses.length})**` : "**No misses**",
  ...missLines,
  "",
].join("\n");

console.log(summary);
if (mdPath) await writeFile(mdPath, summary);
