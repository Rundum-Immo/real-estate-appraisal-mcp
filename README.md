# Rundum Immo Real Estate Appraisal MCP

An open-source Model Context Protocol server for indicative German real-estate depreciation estimates. It exposes one tool, `calculate_property_depreciation`, and delegates calculations to the public [AfaMax](https://afamax.de) API. Proprietary appraisal formulas remain in AFAMAX.

<!-- mcp-name: immo.rundum/real-estate-appraisal -->

> **Status: pre-release.** The source and local stdio transport are ready. The npm package and hosted MCP endpoint will become available with the first production release.

## Planned hosted server

The planned Streamable HTTP endpoint is:

```text
https://mcp.rundum.immo/mcp
```

It is not production-ready yet. Once launched, no end-user API key will be required. The legacy `https://afamax.de/api/mcp` endpoint remains available during migration.

## Run from source over stdio

Node.js 22.12 or newer is required.

```bash
git clone https://github.com/Rundum-Immo/real-estate-appraisal-mcp.git
cd real-estate-appraisal-mcp
pnpm install --frozen-lockfile
pnpm build
```

Configure your MCP client to run the built server, replacing the path with the absolute path to your checkout:

```json
{
  "mcpServers": {
    "rundum-real-estate-appraisal": {
      "command": "node",
      "args": ["/absolute/path/to/real-estate-appraisal-mcp/dist/transports/stdio.js"]
    }
  }
}
```

The stdio server calls the anonymous AFAMAX API directly. Its public limits are 30 requests per minute and 500 requests per rolling day per IP; a tenant-wide ceiling may also apply. It writes protocol messages only to stdout and operational logs only to stderr.

### Install from npm after the first release

Once `v0.1.0` is published, the source path can be replaced with:

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

### Test with MCP Inspector

Build and launch the local stdio server through [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
pnpm build
npx -y @modelcontextprotocol/inspector node dist/transports/stdio.js
```

Connect in the browser, open **Tools**, and call `calculate_property_depreciation` with the example input above. A successful response contains a readable summary and structured output with remaining useful life, annual and monthly AfA, statutory comparison, assumptions, and AfaMax attribution.

To inspect the registered tools from the command line:

```bash
npx -y @modelcontextprotocol/inspector \
  --cli \
  node dist/transports/stdio.js \
  --method tools/list
```

### Develop the HTTP transport

```bash
cp .env.example .env
pnpm dev:http
```

`AFAMAX_SERVICE_TOKEN` is mandatory for HTTP mode. Trusted per-client rate limiting works only with a service credential issued by Rundum Immo and configured with the matching AFAMAX backend value; arbitrary tokens do not enable trusted forwarding. HTTP mode forwards that token and the validated rightmost proxy client address in `X-Afamax-Service-Token` and `X-Afamax-Client-IP`. Never expose this token to MCP clients. Deploy behind a proxy that replaces, rather than blindly appends to, incoming forwarding headers.

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

Production HTTP hosting is intended for Rundum Immo or explicitly authorized operators because it requires a matching AFAMAX service credential. Public users can run the stdio transport without one.

```bash
docker build -t real-estate-appraisal-mcp .
docker run --rm -p 3000:3000 \
  -e AFAMAX_SERVICE_TOKEN='credential-issued-by-rundum-immo' \
  -e PUBLIC_HOSTS='localhost,mcp.rundum.immo' \
  real-estate-appraisal-mcp
```

The image runs as the non-root `node` user. Configure `mcp.rundum.immo` in Coolify and proxy it to port 3000.

## Data and privacy

The adapter is stateless and does not persist tool inputs or raw client IP addresses. Calculation input and the client IP are sent to AFAMAX, which uses the address for abuse prevention. AFAMAX stores a salted hash of the address and limited usage metadata for 30 days; it does not store the raw address in its usage records. Avoid placing personal identifiers in tool input. See [AfaMax privacy information](https://afamax.de/datenschutz) and [SECURITY.md](SECURITY.md).

## Roadmap

The repository is intentionally broader than its first depreciation tool. Potential future capabilities include:

- Property and market-value estimation
- Appraisal and valuation-report workflows
- Purchase-price allocation
- Additional German real-estate tax and appraisal tools

Future tools will follow the same boundary: this repository contains the public MCP integration, while proprietary appraisal logic remains in AFAMAX.

## License

[MIT](LICENSE)
