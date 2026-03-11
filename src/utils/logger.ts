type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class Logger {
  private level: LogLevel = 'info';
  private prefix: string;
  private structured: boolean;
  private contextData: LogContext;

  constructor(
    prefix = 'jellytent',
    options: { level?: LogLevel; structured?: boolean; context?: LogContext } = {},
  ) {
    this.prefix = prefix;
    this.level = options.level ?? (process.env['LOG_LEVEL'] as LogLevel) ?? 'info';
    this.structured = options.structured ?? process.env['NODE_ENV'] === 'production';
    this.contextData = options.context ?? {};
  }

  configure(options: { level?: LogLevel; structured?: boolean }): void {
    if (options.level) this.level = options.level;
    if (options.structured !== undefined) this.structured = options.structured;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(entry: LogEntry): string {
    const context = { ...this.contextData, ...entry.context };

    if (this.structured) {
      return JSON.stringify({
        timestamp: entry.timestamp,
        level: entry.level,
        service: this.prefix,
        message: entry.message,
        ...context,
      });
    }

    const time = entry.timestamp.split('T')[1]?.slice(0, 12) ?? entry.timestamp;
    const levelStr = entry.level.toUpperCase().padEnd(5);
    const ctx = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    return `${time} ${levelStr} [${this.prefix}] ${entry.message}${ctx}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    const formatted = this.formatEntry(entry);

    switch (level) {
      case 'debug':
        console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
        console.error(formatted);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  child(name: string, context?: LogContext): Logger {
    return new Logger(`${this.prefix}:${name}`, {
      level: this.level,
      structured: this.structured,
      context: { ...this.contextData, ...context },
    });
  }

  withContext(context: LogContext): Logger {
    return new Logger(this.prefix, {
      level: this.level,
      structured: this.structured,
      context: { ...this.contextData, ...context },
    });
  }
}

export const logger = new Logger();

export type { LogLevel, LogContext };
