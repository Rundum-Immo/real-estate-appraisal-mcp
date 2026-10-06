// Builds the blind input for the Golden Prompt discovery eval: server instructions, the
// advertised tools, distractor tools and the prompts — never the expected answers.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { createLogger } from "../src/observability/logger.js";
import type { AppraisalProvider } from "../src/providers/appraisal-provider.js";
import { createServer } from "../src/server.js";
import { opaqueIds } from "./discovery-ids.js";

const evalDir = resolve(import.meta.dirname, "../evals/discovery");
const outArgIndex = process.argv.indexOf("--out");
const outPath = resolve(
  outArgIndex > -1
    ? (process.argv[outArgIndex + 1] ?? "")
    : `${evalDir}/out/bundle.md`,
);

const unreachable = async (): Promise<never> => {
  throw new Error("The discovery eval never calls tools");
};
const provider: AppraisalProvider = {
  calculatePropertyDepreciation: unreachable,
  calculatePurchasePriceAllocation: unreachable,
  getPriceQuote: unreachable,
  getAvailableAppointments: unreachable,
  bookAppointment: unreachable,
};

interface GoldenPrompt {
  id: string;
  prompt: string;
}

const server = createServer({ provider, logger: createLogger("error") });
const client = new Client({ name: "discovery-eval", version: "1.0.0" });
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await Promise.all([
  server.connect(serverTransport),
  client.connect(clientTransport),
]);
const instructions = client.getInstructions();
const { tools } = await client.listTools();
await client.close();
await server.close();

const distractors = JSON.parse(
  await readFile(`${evalDir}/distractor-tools.json`, "utf8"),
) as Array<{ name: string; description: string }>;
const golden = JSON.parse(
  await readFile(`${evalDir}/golden-prompts.json`, "utf8"),
) as GoldenPrompt[];
const ids = opaqueIds(golden.map(({ id }) => id));
const prompts = golden
  .map(({ id, prompt }) => ({ id: ids.get(id) ?? id, prompt }))
  .sort((a, b) => a.id.localeCompare(b.id));

// Shuffle our tools in with the distractors so list position gives nothing away.
const toolList = [
  ...tools.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
  })),
  ...distractors,
].sort((a, b) => a.name.localeCompare(b.name));

const bundle = `# Tool selection task

You are the tool router of an AI assistant. The assistant is connected to the MCP servers and tools below.
For each user message, decide which **one** tool the assistant should use to handle the request — even if it
first has to ask the user for missing inputs — or \`none\` if no listed tool is a good fit and the assistant
should answer from its own knowledge. Judge only from the metadata below; do not use outside knowledge about
any vendor. Do not call any tools yourself.

Answer with JSON only, one entry per prompt, in this exact shape:

\`\`\`json
[{ "id": "q01", "choice": "tool_name_or_none" }]
\`\`\`

## MCP server \`immo.rundum/real-estate-appraisal\` instructions

${instructions?.trim() || "_(this server sends no instructions)_"}

## Available tools

\`\`\`json
${JSON.stringify(toolList, null, 2)}
\`\`\`

## User messages

\`\`\`json
${JSON.stringify(prompts, null, 2)}
\`\`\`
`;

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, bundle);
console.log(
  `Wrote ${outPath}: ${prompts.length} prompts, ${tools.length} server tools, ${distractors.length} distractors, instructions: ${instructions ? "yes" : "no"}`,
);
