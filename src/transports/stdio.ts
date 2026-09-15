#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createDependencies } from "../bootstrap.js";
import { loadConfig } from "../config/env.js";
import { createServer } from "../server.js";

const config = loadConfig("stdio");
const { logger, provider } = createDependencies(config);
const handle = serveStdio(() => createServer({ provider, logger }), {
  onerror: (error) =>
    logger.error("stdio_transport_error", { errorType: error.name }),
});

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  logger.info("server_stopping", { transport: "stdio", signal });
  await handle.close();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
