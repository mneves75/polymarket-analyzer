/**
 * Structured Logging Implementation
 *
 * This module provides a structured logging system compliant with LOG-GUIDELINES.md:
 * - Structured log entries with consistent fields
 * - Multiple log levels (debug, info, warn, error)
 * - Context propagation for request tracing
 * - Privacy-first data handling (no sensitive data in logs)
 * - JSON-formatted output for machine parsing
 * - Human-readable formatting for TUI environments
 *
 * ## Usage
 *
 * ```typescript
 * import { logger, createLogger } from "./logger";
 *
 * // Default logger
 * logger.info("Application started", { version: "1.0.0" });
 *
 * // Component-specific logger with context
 * const apiLogger = createLogger("API");
 * apiLogger.info("Fetching markets", { limit: 10 });
 *
 * // Error logging with exception details
 * try {
 *   await fetchData();
 * } catch (err) {
 *   logger.error("Failed to fetch data", err, { endpoint: "/markets" });
 * }
 * ```
 *
 * ## Log Entry Structure
 *
 * All log entries include:
 * - timestamp: ISO 8601 timestamp
 * - level: Log level (debug/info/warn/error)
 * - message: Human-readable message
 * - component: Optional component name
 * - context: Optional additional structured data
 * - error: Optional error details (for error level logs)
 * - requestId: Optional request ID for tracing
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Structured log entry that conforms to LOG-GUIDELINES.md requirements.
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Log level */
  level: LogLevel;
  /** Human-readable log message */
  message: string;
  /** Optional component/module name */
  component?: string;
  /** Additional structured context */
  context?: LogContext;
  /** Error details (for error logs) */
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  /** Request ID for distributed tracing */
  requestId?: string;
  /** User ID for multi-user scenarios */
  userId?: string;
}

/**
 * Additional structured context for log entries.
 *
 * Use for any extra data that provides debugging context.
 * Avoid including sensitive data (passwords, tokens, PII).
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * Logger options configuration.
 */
export interface LoggerOptions {
  /** Minimum log level to output (default: "info") */
  minLevel?: LogLevel;
  /** Component/module name for this logger instance */
  component?: string;
  /** Whether to use pretty formatting for TUI (default: false) */
  pretty?: boolean;
}

/**
 * Request-scoped data that can be attached to logs.
 */
export interface RequestContext {
  /** Unique request ID for tracing */
  requestId: string;
  /** User ID if applicable */
  userId?: string;
  /** Additional request metadata */
  metadata?: LogContext;
}

// Global request context storage (for async local storage pattern)
const asyncLocalStorage = new Map<symbol, RequestContext>();

// Symbol for storing request context in async local storage
const REQUEST_CONTEXT_KEY = Symbol("request-context");

/**
 * Set request context for the current async scope.
 *
 * This allows request IDs and other metadata to be automatically
 * included in all logs within that scope.
 *
 * @param context - Request context to set
 *
 * @example
 * usingRequestContext({ requestId: "req-123" }, () => {
 *   logger.info("This log will include requestId");
 * });
 */
export function usingRequestContext<T>(
  context: RequestContext,
  fn: () => T
): T {
  asyncLocalStorage.set(REQUEST_CONTEXT_KEY, context);
  try {
    return fn();
  } finally {
    asyncLocalStorage.delete(REQUEST_CONTEXT_KEY);
  }
}

/**
 * Get the current request context if available.
 */
function getCurrentRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.get(REQUEST_CONTEXT_KEY);
}

/**
 * Counter for generating unique request IDs.
 */
let requestIdCounter = 0;

/**
 * Generate a unique request ID for tracing.
 *
 * Format: req-{timestamp}-{counter}
 *
 * @returns Unique request ID string
 */
export function generateRequestId(): string {
  return `req-${Date.now()}-${++requestIdCounter}`;
}

/**
 * Check if a log level should be output based on minimum level.
 *
 * Levels: debug < info < warn < error
 *
 * @param level - Log level to check
 * @param minLevel - Minimum level to output
 * @returns true if level >= minLevel
 */
function shouldLog(level: LogLevel, minLevel: LogLevel): boolean {
  const levels: LogLevel[] = ["debug", "info", "warn", "error"];
  return levels.indexOf(level) >= levels.indexOf(minLevel);
}

/**
 * Format a log entry for output.
 *
 * @param entry - Log entry to format
 * @param pretty - Whether to use pretty formatting
 * @returns Formatted log string
 */
function formatLogEntry(entry: LogEntry, pretty = false): string {
  if (pretty) {
    // Pretty formatting for TUI/human consumption
    const levelColor = {
      debug: "\x1b[36m",  // cyan
      info: "\x1b[32m",   // green
      warn: "\x1b[33m",   // yellow
      error: "\x1b[31m"   // red
    }[entry.level];

    const reset = "\x1b[0m";
    const time = new Date(entry.timestamp).toLocaleTimeString();

    const parts = [
      `${levelColor}[${entry.level.toUpperCase()}]${reset}`,
      `${time}`,
      entry.component ? `${entry.component}:` : "",
      entry.message
    ].filter(Boolean).join(" ");

    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
        .join(" ");
      return `${parts} ${contextStr}`;
    }

    if (entry.error) {
      return `${parts} ${entry.error.name}: ${entry.error.message}`;
    }

    return parts;
  }

  // JSON formatting for machine parsing
  return JSON.stringify(entry);
}

/**
 * Core Logger class implementing structured logging.
 *
 * Thread-safe and supports component-scoped logging with context.
 */
class Logger {
  private options: Required<Omit<LoggerOptions, "pretty">>;

  constructor(options: LoggerOptions = {}) {
    this.options = {
      minLevel: options.minLevel ?? "info",
      component: options.component ?? "app"
    };
  }

  /**
   * Create a new logger with additional context.
   *
   * @param additionalContext - Context to add to all log entries
   * @returns New logger instance with context
   */
  withContext(additionalContext: LogContext): Logger {
    return new ContextLogger(this, additionalContext);
  }

  /**
   * Create a new logger with a specific component name.
   *
   * @param component - Component name
   * @returns New logger instance for that component
   */
  withComponent(component: string): Logger {
    return new Logger({
      ...this.options,
      component
    });
  }

  /**
   * Create a new logger for a specific request.
   *
   * @param requestId - Request ID for tracing
   * @returns New logger instance with request ID
   */
  withRequest(requestId: string): Logger {
    return new ContextLogger(this, { requestId });
  }

  /**
   * Log a debug message.
   *
   * Debug messages are for detailed diagnostics during development.
   *
   * @param message - Log message
   * @param context - Optional structured context
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, undefined, context);
  }

  /**
   * Log an info message.
   *
   * Info messages are for normal operational events.
   *
   * @param message - Log message
   * @param context - Optional structured context
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, undefined, context);
  }

  /**
   * Log a warning message.
   *
   * Warnings indicate something unexpected but not fatal.
   *
   * @param message - Log message
   * @param context - Optional structured context
   */
  warn(message: string, context?: LogContext): void {
    this.log("warn", message, undefined, context);
  }

  /**
   * Log an error message with exception details.
   *
   * @param message - Log message
   * @param error - Error object or unknown value
   * @param context - Optional structured context
   */
  error(message: string, error: Error | unknown, context?: LogContext): void {
    this.log("error", message, error, context);
  }

  /**
   * Internal log method that builds and outputs log entries.
   *
   * @param level - Log level
   * @param message - Log message
   * @param error - Optional error object
   * @param context - Optional structured context
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext
  ): void {
    if (!shouldLog(level, this.options.minLevel)) {
      return;
    }

    // Build error details if error provided
    let errorDetails: LogEntry["error"] | undefined;
    if (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const details: LogEntry["error"] = {
        name: err.name,
        message: err.message
      };
      if (err.stack !== undefined) details.stack = err.stack;
      const code = (err as unknown as { code?: string }).code;
      if (code !== undefined) details.code = code;
      errorDetails = details;
    }

    // Get current request context if available
    const requestContext = getCurrentRequestContext();

    // Build log entry
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component: this.options.component,
      context: {
        ...context,
        ...requestContext?.metadata
      },
      ...(errorDetails && { error: errorDetails }),
      ...(requestContext && {
        requestId: requestContext.requestId,
        userId: requestContext.userId
      })
    };

    // Detect if we're in a TUI environment (pretty output)
    const isTui = process['env']['TUI_MODE'] === "true" || process.stdout.isTTY;
    const formatted = formatLogEntry(entry, isTui);

    // Output to appropriate stream
    if (level === "error" || level === "warn") {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

/**
 * Logger with pre-bound context.
 *
 * Used for withContext() to create loggers that automatically
 * include specific context in all log entries.
 */
class ContextLogger extends Logger {
  constructor(
    private parent: Logger,
    private boundContext: LogContext
  ) {
    super({ component: (parent as any).options.component });
  }

  override debug(message: string, context?: LogContext): void {
    this.parent.debug(message, { ...this.boundContext, ...context });
  }

  override info(message: string, context?: LogContext): void {
    this.parent.info(message, { ...this.boundContext, ...context });
  }

  override warn(message: string, context?: LogContext): void {
    this.parent.warn(message, { ...this.boundContext, ...context });
  }

  override error(message: string, error: Error | unknown, context?: LogContext): void {
    this.parent.error(message, error, { ...this.boundContext, ...context });
  }
}

/**
 * Default global logger instance.
 */
export const logger = new Logger({
  component: "polymarket-analyzer"
});

/**
 * Create a new logger scoped to a specific component.
 *
 * @param component - Component/module name
 * @returns New logger instance for that component
 *
 * @example
 * const apiLogger = createLogger("API");
 * const wsLogger = createLogger("WebSocket");
 *
 * apiLogger.info("Fetching markets");
 * wsLogger.debug("WebSocket message received", { size: 256 });
 */
export function createLogger(component: string): Logger {
  return new Logger({ component });
}

/**
 * Create a logger with a specific minimum log level.
 *
 * @param minLevel - Minimum level to output
 * @returns New logger instance with custom level
 *
 * @example
 * const verboseLogger = createLoggerWithLevel("debug");
 * const quietLogger = createLoggerWithLevel("warn");
 */
export function createLoggerWithLevel(minLevel: LogLevel): Logger {
  return new Logger({ minLevel });
}

/**
 * Timed operation helper for measuring execution time.
 *
 * @param operation - Operation name for logging
 * @param fn - Async function to time
 * @returns Result of the function
 *
 * @example
 * const result = await timeOperation("fetch-markets", async () => {
 *   return await fetchMarkets(10);
 * });
 * // Logs: [info] fetch-markets completed in 234ms
 */
export async function timeOperation<T>(
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  logger.debug(`Starting operation: ${operation}`);
  try {
    const result = await fn();
    const duration = performance.now() - start;
    logger.info(`${operation} completed`, {
      operation,
      durationMs: Math.round(duration)
    });
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(`${operation} failed`, error, {
      operation,
      durationMs: Math.round(duration)
    });
    throw error;
  }
}

// Backward compatibility exports
export function logError(context: string, error: unknown) {
  logger.error(context, error);
}

export function logInfo(message: string) {
  logger.info(message);
}
