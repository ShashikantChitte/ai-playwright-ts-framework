type Level = 'debug' | 'info' | 'warn' | 'error';
const order: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = order[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? 20;

/** Structured, greppable logger (JSON lines in CI, readable text locally). */
export class Logger {
  constructor(private readonly scope: string) {}

  private emit(level: Level, msg: string, meta?: Record<string, unknown>) {
    if (order[level] < threshold) return;
    const ts = new Date().toISOString();
    if (process.env.CI === 'true') {
      console.log(JSON.stringify({ ts, level, scope: this.scope, msg, ...meta }));
    } else {
      console.log(
        `${ts} [${level.toUpperCase()}] ${this.scope}: ${msg}${meta ? ' ' + JSON.stringify(meta) : ''}`,
      );
    }
  }
  debug = (m: string, x?: Record<string, unknown>) => this.emit('debug', m, x);
  info = (m: string, x?: Record<string, unknown>) => this.emit('info', m, x);
  warn = (m: string, x?: Record<string, unknown>) => this.emit('warn', m, x);
  error = (m: string, x?: Record<string, unknown>) => this.emit('error', m, x);
}

export const createLogger = (scope: string) => new Logger(scope);
