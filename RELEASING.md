# Releasing

This runbook covers releases of both supported transports:

- the hosted Streamable HTTP server at `https://mcp.rundum.immo/mcp`
- the stdio package `@rundum-immo/real-estate-appraisal-mcp`

The release order is intentional: prepare and verify one commit, deploy that
commit to Coolify, publish it to npm, tag it, create the GitHub Release, and
finally publish its metadata to the MCP Registry.

## Required access

The release maintainer needs:

- write access to this GitHub repository
- access to the Rundum Immo Coolify application
- membership in the npm `rundum-immo` organization with 2FA enabled
- access to the AFAMAX service credential used by the hosted server
- access to the `rundum.immo` MCP Registry signing key in the company secret
  manager

Never commit or paste the AFAMAX service token or MCP Registry private key into
issues, release notes, build logs, or shell scripts.

## 1. Choose and synchronize the version

Use semantic versioning. Before committing a release, update the version in
all of these locations:

- `package.json`
- the top-level version and npm package version in `server.json`
- the MCP server implementation in `src/server.ts`
- the `/health` response in `src/transports/http.ts`
- the AFAMAX user agent in `src/providers/afamax/afamax.client.ts`

Search the repository for the previous version and confirm no runtime version
was missed:

```bash
rg -n '0\.1\.0' package.json server.json src
```

Replace `0.1.0` with the version being superseded. Do not reuse an npm version;
published versions are immutable.

## 2. Run pre-release checks

Use Node.js 22.12 or newer and pnpm 10:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm contract:check
npm publish --dry-run --access public
mcp-publisher validate server.json
```

Build and smoke-test the production image:

```bash
docker build -t real-estate-appraisal-mcp:release .
```

Confirm the image starts as a non-root user, becomes healthy, and returns the
new version from `/health`. Inspect the npm dry-run file list and confirm it
contains only `dist`, `README.md`, `LICENSE`, and package metadata. It must not
contain `.env`, credentials, tests, or development-only files.

Commit the release preparation, push `main`, and wait for CI to pass. Record
the full release commit SHA; the Coolify deployment, npm package, and Git tag
must all refer to that commit.

## 3. Deploy the hosted server

Coolify automatic deployments are disabled. Pushing to `main` does not change
production.

1. Open the `mcp.rundum.immo` application in Coolify.
2. Confirm the environment variables and masked `AFAMAX_SERVICE_TOKEN` are
   present.
3. Manually deploy the release commit from the configured `main` branch.
4. Confirm the container is healthy and inspect its startup logs.
5. Verify `https://mcp.rundum.immo/health` reports the new version.
6. Connect an MCP client to `https://mcp.rundum.immo/mcp`, list both tools, and
   complete one call to each tool.

If production verification fails, roll back to the previous healthy Coolify
deployment. Do not publish the npm package or Git tag.

## 4. Publish and verify npm

From a clean checkout of the verified release commit, confirm the account and
package state:

```bash
git status --short
node --version
npm whoami
npm view @rundum-immo/real-estate-appraisal-mcp version
```

Publish once and complete the interactive 2FA challenge:

```bash
npm publish --access public
```

Verify the version and distribution tag after registry propagation:

```bash
npm view @rundum-immo/real-estate-appraisal-mcp version
npm view @rundum-immo/real-estate-appraisal-mcp dist-tags
```

A newly created scoped package can briefly return `404` immediately after a
successful publish. The `+ @rundum-immo/real-estate-appraisal-mcp@<version>`
line indicates success; wait and query npm again. Never retry until the
registry has been checked, because the version may already exist.

Install the published package into a clean temporary directory and verify its
stdio entrypoint with MCP Inspector:

```bash
RELEASE_TEST_DIR="$(mktemp -d)"
npm install --prefix "$RELEASE_TEST_DIR" \
  @rundum-immo/real-estate-appraisal-mcp@<version>
npx -y @modelcontextprotocol/inspector --cli \
  node "$RELEASE_TEST_DIR/node_modules/@rundum-immo/real-estate-appraisal-mcp/dist/transports/stdio.js" \
  --method tools/list
```

Both calculation tools must be listed. Remove the temporary directory after
verification.

## 5. Tag and create the GitHub Release

Tag the exact commit recorded in the npm package's `gitHead`:

```bash
git tag -a v<version> <release-commit-sha> -m "Release v<version>"
git show --no-patch --decorate v<version>
git push origin v<version>
```

On GitHub, create a release from the existing tag:

- title: `v<version> - <short release name>`
- mark it as the latest release
- use a pre-release label only for pre-release versions
- summarize tools, transports, compatibility requirements, and material
  changes
- do not upload the npm tarball; npm is the package source of truth

Do not move or recreate a published release tag. Correct mistakes with a new
patch release.

## 6. Publish to the MCP Registry

The npm package and hosted endpoint must be live before publishing
`server.json`:

```bash
mcp-publisher validate server.json
read -rsp "MCP Registry private key: " MCP_PRIVATE_KEY
echo
mcp-publisher login dns --domain rundum.immo \
  --private-key "$MCP_PRIVATE_KEY"
unset MCP_PRIVATE_KEY
mcp-publisher publish server.json
```

The DNS public-key proof remains on the `rundum.immo` apex. The private key
must remain in the company secret manager. After publication, verify the
registry entry `immo.rundum/real-estate-appraisal` exposes both the npm stdio
package and `https://mcp.rundum.immo/mcp`.

## 7. Post-release checks

- Confirm GitHub, npm, `server.json`, `/health`, and the MCP Registry report the
  same version.
- Confirm the GitHub tag resolves to npm's `gitHead`.
- Monitor Coolify health and application logs.
- Monitor AFAMAX trusted-service errors and rate-limit behavior.
- Record any compatibility warnings for the next patch release.

Documentation-only commits made after the tag do not require a Coolify
deployment. Runtime changes always require a new version and a deliberate
manual deployment.
