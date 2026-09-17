# Contributing

Issues and pull requests are welcome. Keep the MCP layer thin: calculation formulas and private AfAMax internals do not belong in this repository.

## Development

Requires Node.js 22.12 or newer and pnpm 10.

```bash
pnpm install
pnpm check
```

Use `pnpm dev:stdio` for local MCP clients. To run HTTP locally, copy `.env.example`, set a service token recognized by the matching AfAMax backend, include `localhost` in `PUBLIC_HOSTS`, and run `pnpm dev:http`.

When the AfAMax public API changes, update the Zod contract and tests in the same pull request, then run `pnpm contract:check` against the public deployed OpenAPI document.

## Releases

Maintainers should follow [RELEASING.md](RELEASING.md) for versioning, hosted deployment, npm publication, GitHub releases, and MCP Registry publication.
