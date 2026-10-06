# Discovery eval (Golden Prompts)

Checks whether an AI assistant that is connected to this server picks the right tool, or correctly picks none of
ours, for real user questions. Most questions are German and colloquial. Only tool selection is tested: no tool is
executed and no API key is needed. Any coding agent (Claude Code, Codex, …) acts as the router.

- `golden-prompts.json`: 84 prompts (24 direct, 36 indirect, 24 negative; 59 German, 17 English, 8 mixed) with the
  expected tool. For a negative prompt, any pick that is not one of this server's tools counts as correct.
- `distractor-tools.json`: generic tools from other servers (web search, calculator, income tax, calendar, restaurant
  booking), listed next to ours so the router has realistic alternatives.
- `results/`: committed picks from earlier runs.

## Run

1. Export the blind bundle. It contains the server instructions, `tools/list`, the distractors and the prompts, but
   no expected answers.

   ```bash
   pnpm eval:discovery:export --out evals/discovery/out/bundle.md
   ```

2. Hand **only** that file to a fresh agent session or subagent that has no access to the rest of this directory,
   with this prompt:

   > Read only `evals/discovery/out/bundle.md` and follow the task in it. Do not open any other file. Write the JSON
   > answer to `evals/discovery/out/picks.json`.

   For a less capable router, also run it on a small model (e.g. Claude Haiku). Strong models tend to score close to
   100 % either way, so the small model is where metadata changes show.

3. Score the picks. `--md` also writes a Markdown summary to paste into a ticket.

   ```bash
   pnpm eval:discovery:score evals/discovery/out/picks.json --md evals/discovery/out/summary.md
   ```

When changing tool titles, descriptions or the server instructions, run the eval before and after the change and
commit both pick files under `results/`.
