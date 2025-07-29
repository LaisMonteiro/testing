export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string | undefined;
    name: string;
  };
}

class Logger {
  private currentLevel: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.currentLevel = level;
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>, error?: Error): void {
    if (level <= this.currentLevel) {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(context && { context }),
        ...(error && { error: { message: error.message, stack: error.stack, name: error.name } })
      };

      const levelNames = ['ERROR', 'WARN', 'INFO', 'DEBUG'];
      const levelName = levelNames[level];
      
      if (level === LogLevel.ERROR) {
        console.error(`[${levelName}] ${entry.timestamp}: ${message}`, entry.context || '', error || '');
      } else if (level === LogLevel.WARN) {
        console.warn(`[${levelName}] ${entry.timestamp}: ${message}`, entry.context || '');
      } else {
        console.log(`[${levelName}] ${entry.timestamp}: ${message}`, entry.context || '');
      }
    }
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, error);
  }

  warn(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// Export singleton instance
export const logger = new Logger(
  process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO
);