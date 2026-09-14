# Rundum Immo Real Estate Appraisal MCP

An open-source Model Context Protocol server for indicative German real-estate depreciation estimates. It exposes one tool, `calculate_property_depreciation`, and delegates calculations to the public [AfaMax](https://afamax.de) API. Proprietary appraisal formulas remain in AFAMAX.

<!-- mcp-name: immo.rundum/real-estate-appraisal -->

## Use the hosted server

Connect an MCP client that supports Streamable HTTP to:

```text
https://mcp.rundum.immo/mcp
```

No end-user API key is required. The legacy `https://afamax.de/api/mcp` endpoint remains available during migration.

## Run locally over stdio

Node.js 22.12 or newer is required.

```json
{
  "mcpServers": {
    "rundum-real-estate-appraisal": {
      "command": "npx",
      "args": ["-y", "@rundum-immo/real-estate-appraisal-mcp"]
    }
  }
}
```

The stdio server calls the anonymous AFAMAX API directly and is subject to its public rate limits. It writes protocol messages only to stdout and operational logs only to stderr.

## Tool

`calculate_property_depreciation` accepts the complete public AFAMAX request contract:

- Required: property type, construction year, and floor area.
- Optional: purchase price, land area, standard land value, inventory, purchase costs, core-renovation year, marginal tax rate, locale, coarse modernization level, and eight detailed modernization component states.
- Results: annual and monthly AfA, comparison with statutory AfA, estimated tax savings, building-value assumptions, modernization points, and remaining useful life.

Omitting modernization data means AFAMAX assumes no modernization, producing an upper-bound estimate. For multi-unit buildings, provide whole-building figures or calculate individual units separately. Results are indicative and do not replace tax, legal, or appraisal advice.

Example input:

```json
{
  "propertyType": "CONDOMINIUM",
  "constructionYear": 1970,
  "floorArea": 85,
  "purchasePrice": 350000,
  "taxRate": 0.42,
  "locale": "en"
}
```

## Architecture

```text
MCP client  ->  this public adapter  ->  AFAMAX public HTTPS API
```

This repository contains transport, validation, error mapping, and presentation code only. It contains no appraisal formulas, databases, tenant logic, or report-generation internals. The transport-neutral server factory is shared by stdio and stateless Streamable HTTP.

## Development

```bash
pnpm install
pnpm check
pnpm dev:stdio
```

To run the hosted HTTP transport:

```bash
cp .env.example .env
pnpm dev:http
```

`AFAMAX_SERVICE_TOKEN` is mandatory for HTTP mode and must match the trusted-service token configured in AFAMAX. HTTP mode forwards that token and the validated rightmost proxy client address in `X-Afamax-Service-Token` and `X-Afamax-Client-IP`. Never expose this token to MCP clients. Deploy behind a proxy that replaces, rather than blindly appends to, incoming forwarding headers.

Configuration:

| Variable | Default | Purpose |
|---|---|---|
| `AFAMAX_API_URL` | `https://afamax.de/api/v1/afa-calculation` | Public calculation endpoint |
| `AFAMAX_SERVICE_TOKEN` | — | Required trusted-service credential in HTTP mode |
| `AFAMAX_TIMEOUT_MS` | `10000` | Upstream timeout |
| `HOST` | `0.0.0.0` | Listen address |
| `PORT` | `3000` | Listen port |
| `PUBLIC_HOSTS` | `mcp.rundum.immo` | Comma-separated allowed Host header names |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, or `error` |

The HTTP server exposes `/mcp` and `/health`, limits request bodies to 64 KiB, validates Host and Origin syntax, and returns permissive CORS headers for anonymous browser clients.

## Deploy with Docker

```bash
docker build -t real-estate-appraisal-mcp .
docker run --rm -p 3000:3000 \
  -e AFAMAX_SERVICE_TOKEN='your-shared-secret' \
  -e PUBLIC_HOSTS='localhost,mcp.rundum.immo' \
  real-estate-appraisal-mcp
```

The image runs as the non-root `node` user. Configure `mcp.rundum.immo` in Coolify and proxy it to port 3000.

## Data and privacy

The adapter is stateless and does not persist tool inputs or raw client IP addresses. Calculation input and the client IP are sent to AFAMAX, which uses the address for abuse prevention. Avoid placing personal identifiers in tool input. See [AfaMax privacy information](https://afamax.de/datenschutz) and [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
