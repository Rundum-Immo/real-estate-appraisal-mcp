export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const priorities: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(event: string, details?: Record<string, unknown>): void;
  info(event: string, details?: Record<string, unknown>): void;
  warn(event: string, details?: Record<string, unknown>): void;
  error(event: string, details?: Record<string, unknown>): void;
}

export function createLogger(minimumLevel: LogLevel = 'info'): Logger {
  const write = (level: LogLevel, event: string, details: Record<string, unknown> = {}) => {
    if (priorities[level] < priorities[minimumLevel]) return;
    process.stderr.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...details })}\n`);
  };

  return {
    debug: (event, details) => write('debug', event, details),
    info: (event, details) => write('info', event, details),
    warn: (event, details) => write('warn', event, details),
    error: (event, details) => write('error', event, details),
  };
}
