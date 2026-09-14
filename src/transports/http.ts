#!/usr/bin/env node
import { createServer as createNodeServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { createMcpHandler, type McpHttpHandler } from '@modelcontextprotocol/server';
import { hostHeaderValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { createDependencies } from '../bootstrap.js';
import { loadConfig, type AppConfig } from '../config/env.js';
import type { Logger } from '../observability/logger.js';
import type { AppraisalProvider } from '../providers/appraisal-provider.js';
import { createServer } from '../server.js';

const maxRequestBytes = 64 * 1024;
const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type, mcp-protocol-version, mcp-session-id, last-event-id',
  'access-control-expose-headers': 'mcp-session-id',
} as const;

export interface HttpServerDependencies {
  config: AppConfig;
  logger: Logger;
  provider: AppraisalProvider;
}

export function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const candidate = forwardedFor?.split(',').at(-1)?.trim() || request.headers.get('x-real-ip')?.trim();
  return candidate && isIP(candidate) ? candidate : undefined;
}

function hasValidOrigin(request: IncomingMessage): boolean {
  const origin = request.headers.origin;
  if (!origin) return true;
  if (Array.isArray(origin)) return false;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname) && parsed.origin === origin;
  } catch {
    return false;
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...corsHeaders });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxRequestBytes) {
      throw new RequestBodyError(413, 'Request body exceeds 64 KiB');
    }
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestBodyError(400, 'Request body must contain valid JSON');
  }
}

class RequestBodyError extends Error {
  constructor(public readonly status: 400 | 413 | 415, message: string) {
    super(message);
  }
}

function buildMcpHandler(provider: AppraisalProvider, logger: Logger): McpHttpHandler {
  return createMcpHandler(
    (context) => {
      const clientIp = context.requestInfo ? getClientIp(context.requestInfo) : undefined;
      return createServer({ provider, logger, requestContext: clientIp ? { clientIp } : {} });
    },
    {
      legacy: 'stateless',
      responseMode: 'json',
      onerror: (error) => logger.error('mcp_handler_error', { errorType: error.name }),
    },
  );
}

export function createHttpServer({ config, logger, provider }: HttpServerDependencies) {
  const validateHost = hostHeaderValidation(config.publicHosts);
  const mcpHandler = buildMcpHandler(provider, logger);
  const nodeHandler = toNodeHandler(mcpHandler, {
    onerror: (error) => logger.error('http_adapter_error', { errorType: error.name }),
  });

  const server = createNodeServer(async (request, response) => {
    Object.entries(corsHeaders).forEach(([key, value]) => response.setHeader(key, value));

    if (!validateHost(request, response)) return;
    if (!hasValidOrigin(request)) {
      sendJson(response, 403, { error: 'Invalid Origin header' });
      return;
    }

    const pathname = new URL(request.url ?? '/', `http://${request.headers.host}`).pathname;
    if (pathname === '/health' && request.method === 'GET') {
      sendJson(response, 200, { status: 'ok', service: 'real-estate-appraisal-mcp', version: '0.1.0' });
      return;
    }
    if (pathname !== '/mcp') {
      sendJson(response, 404, { error: 'Not found' });
      return;
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, corsHeaders);
      response.end();
      return;
    }
    if (!['GET', 'POST', 'DELETE'].includes(request.method ?? '')) {
      sendJson(response, 405, { error: 'Method not allowed' });
      return;
    }

    try {
      if (request.method === 'POST') {
        const contentType = request.headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
        if (contentType !== 'application/json') {
          throw new RequestBodyError(415, 'Content-Type must be application/json');
        }
        await nodeHandler(request as Parameters<typeof nodeHandler>[0], response, await readJsonBody(request));
      } else {
        await nodeHandler(request as Parameters<typeof nodeHandler>[0], response);
      }
    } catch (error) {
      if (error instanceof RequestBodyError) {
        sendJson(response, error.status, {
          jsonrpc: '2.0',
          error: { code: error.status === 400 ? -32700 : -32600, message: error.message },
          id: null,
        });
        return;
      }
      logger.error('http_request_error', { errorType: error instanceof Error ? error.name : 'UnknownError' });
      if (!response.headersSent) sendJson(response, 500, { error: 'Internal server error' });
      else response.end();
    }
  });

  return { server, closeMcpHandler: () => mcpHandler.close() };
}

async function main(): Promise<void> {
  const config = loadConfig('http');
  const { logger, provider } = createDependencies(config);
  const { server, closeMcpHandler } = createHttpServer({ config, logger, provider });
  server.listen(config.port, config.host, () => {
    logger.info('server_started', { transport: 'http', host: config.host, port: config.port });
  });

  let closing = false;
  const shutdown = async (signal: string) => {
    if (closing) return;
    closing = true;
    logger.info('server_stopping', { transport: 'http', signal });
    server.close();
    await closeMcpHandler();
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  void main().catch((error) => {
    process.stderr.write(`${JSON.stringify({ level: 'error', event: 'startup_failed', errorType: error instanceof Error ? error.name : 'UnknownError' })}\n`);
    process.exitCode = 1;
  });
}
