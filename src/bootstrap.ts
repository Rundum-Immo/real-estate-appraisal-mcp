import type { AppConfig } from "./config/env.js";
import { createLogger } from "./observability/logger.js";
import { AfamaxClient } from "./providers/afamax/afamax.client.js";
import { AfamaxAppraisalProvider } from "./providers/afamax/afamax.provider.js";

export function createDependencies(config: AppConfig) {
  const logger = createLogger(config.logLevel);
  const clientOptions = {
    apiUrl: config.afamaxApiUrl,
    timeoutMs: config.afamaxTimeoutMs,
    ...(config.afamaxServiceToken
      ? { serviceToken: config.afamaxServiceToken }
      : {}),
  };
  const provider = new AfamaxAppraisalProvider(new AfamaxClient(clientOptions));
  return { logger, provider };
}
