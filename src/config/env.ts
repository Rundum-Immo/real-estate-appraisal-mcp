import { z } from 'zod';

const defaultApiUrl = 'https://afamax.de/api/v1/afa-calculation';

const commonEnvironmentSchema = z.object({
  AFAMAX_API_URL: z.url().default(defaultApiUrl),
  AFAMAX_SERVICE_TOKEN: z.string().min(32).optional(),
  AFAMAX_TIMEOUT_MS: z.coerce.number().int().positive().max(60_000).default(10_000),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  PUBLIC_HOSTS: z.string().default('mcp.rundum.immo'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export interface AppConfig {
  afamaxApiUrl: URL;
  afamaxServiceToken?: string;
  afamaxTimeoutMs: number;
  host: string;
  port: number;
  publicHosts: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export function loadConfig(transport: 'http' | 'stdio', environment: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = commonEnvironmentSchema.parse(environment);

  if (transport === 'http' && !parsed.AFAMAX_SERVICE_TOKEN) {
    throw new Error('AFAMAX_SERVICE_TOKEN is required when running the hosted HTTP transport');
  }

  const publicHosts = parsed.PUBLIC_HOSTS.split(',').map((host) => host.trim()).filter(Boolean);
  if (publicHosts.length === 0) {
    throw new Error('PUBLIC_HOSTS must contain at least one hostname');
  }

  return {
    afamaxApiUrl: new URL(parsed.AFAMAX_API_URL),
    ...(parsed.AFAMAX_SERVICE_TOKEN ? { afamaxServiceToken: parsed.AFAMAX_SERVICE_TOKEN } : {}),
    afamaxTimeoutMs: parsed.AFAMAX_TIMEOUT_MS,
    host: parsed.HOST,
    port: parsed.PORT,
    publicHosts,
    logLevel: parsed.LOG_LEVEL,
  };
}
