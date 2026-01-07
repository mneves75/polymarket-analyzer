/**
 * TUI-safe logger that writes to stderr instead of stdout.
 * CRITICAL: Never use console.log in TUI mode - it corrupts the screen.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  levelName: string;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

/**
 * TUI-safe logger that stores logs in memory and optionally writes to stderr.
 */
class TUILogger {
  private logs: LogEntry[] = [];
  private maxLogs = 100;
  private minLevel: LogLevel = LogLevel.INFO;
  private writeToStderr = true;

  /**
   * Set minimum log level
   */
  setLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  /**
   * Enable/disable writing to stderr
   */
  setWriteToStderr(enabled: boolean): void {
    this.writeToStderr = enabled;
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, levelName: string, message: string, context?: Record<string, unknown>): void {
    if (level < this.minLevel) {
      return;
    }

    const entry: LogEntry = {
      level,
      levelName,
      message,
      timestamp: Date.now(),
      context,
    };

    this.logs.push(entry);

    // Trim old logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Write to stderr (not stdout - that would corrupt TUI)
    if (this.writeToStderr && level >= LogLevel.ERROR) {
      const contextStr = context ? ` ${JSON.stringify(context)}` : "";
      process.stderr.write(`[${levelName}] ${message}${contextStr}\n`);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, "DEBUG", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, "INFO", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, "WARN", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, "ERROR", message, context);
  }

  /**
   * Get all logs (for debugging/export)
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * Get recent logs of a specific level or higher
   */
  getRecentLogs(minLevel: LogLevel = LogLevel.DEBUG, count = 10): LogEntry[] {
    return this.logs
      .filter((entry) => entry.level >= minLevel)
      .slice(-count);
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Get log count by level
   */
  getCounts(): Record<string, number> {
    const counts: Record<string, number> = {
      DEBUG: 0,
      INFO: 0,
      WARN: 0,
      ERROR: 0,
    };

    for (const entry of this.logs) {
      counts[entry.levelName] = (counts[entry.levelName] ?? 0) + 1;
    }

    return counts;
  }
}

// Singleton instance
export const logger = new TUILogger();

// Re-export LogLevel for external use
export { LogLevel as TUILogLevel };
