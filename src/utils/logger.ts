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

class Logger {
  private level: LogLevel = 'info';
  private prefix = 'jellytent';
  private structured = false;

  configure(options: { level?: LogLevel; structured?: boolean }): void {
    if (options.level) this.level = options.level;
    if (options.structured !== undefined) this.structured = options.structured;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(entry: LogEntry): string {
    if (this.structured) {
      return JSON.stringify({
        ...entry,
        service: this.prefix,
      });
    }

    const time = entry.timestamp;
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${this.prefix}] ${time} ${entry.level.toUpperCase()} ${entry.message}${ctx}`;
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

  child(prefix: string): Logger {
    const child = new Logger();
    child.prefix = `${this.prefix}:${prefix}`;
    child.level = this.level;
    child.structured = this.structured;
    return child;
  }
}

export const logger = new Logger();
