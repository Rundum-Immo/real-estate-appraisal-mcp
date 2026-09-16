# Contributing

Issues and pull requests are welcome. Keep the MCP layer thin: calculation formulas and private AFAMAX internals do not belong in this repository.

## Development

Requires Node.js 22.12 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

Use `pnpm dev:stdio` for local MCP clients. To run HTTP locally, copy `.env.example`, set a service token recognized by the matching AFAMAX backend, include `localhost` in `PUBLIC_HOSTS`, and run `pnpm dev:http`.

When the AFAMAX public API changes, update the Zod contract and tests in the same pull request, then run `pnpm contract:check` against the public deployed OpenAPI document.
