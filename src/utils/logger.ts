type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel = 'info';
  private prefix: string = '[Jellytent]';

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private format(entry: LogEntry): string {
    const time = entry.timestamp.toISOString();
    const ctx = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `${this.prefix} ${time} [${entry.level.toUpperCase()}] ${entry.message}${ctx}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format({ level: 'debug', message, timestamp: new Date(), context }));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.format({ level: 'info', message, timestamp: new Date(), context }));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format({ level: 'warn', message, timestamp: new Date(), context }));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.format({ level: 'error', message, timestamp: new Date(), context }));
    }
  }
}

export const logger = new Logger();
