/**
 * TUI-specific error types for OpenTUI backend.
 * Follows DEV-GUIDELINES.md error handling patterns.
 */

/**
 * Base TUI error class
 */
export class TUIError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  readonly context?: Record<string, unknown>;
  readonly timestamp: string;

  constructor(
    message: string,
    code: string,
    recoverable = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TUIError";
    this.code = code;
    this.recoverable = recoverable;
    this.context = context;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      recoverable: this.recoverable,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Rendering errors (component update failures)
 */
export class RenderError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "RENDER_ERROR", false, context);
    this.name = "RenderError";
  }
}

/**
 * Data/validation errors
 */
export class DataError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATA_ERROR", true, context);
    this.name = "DataError";
  }
}

/**
 * Navigation errors (invalid index, etc.)
 */
export class NavigationError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NAV_ERROR", true, context);
    this.name = "NavigationError";
  }
}

/**
 * Network/API errors
 */
export class NetworkError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", true, context);
    this.name = "NetworkError";
  }
}

/**
 * Initialization errors
 */
export class InitError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "INIT_ERROR", false, context);
    this.name = "InitError";
  }
}

/**
 * Type guards
 */
export function isTUIError(err: unknown): err is TUIError {
  return err instanceof TUIError;
}

export function isRenderError(err: unknown): err is RenderError {
  return err instanceof RenderError;
}

export function isDataError(err: unknown): err is DataError {
  return err instanceof DataError;
}

export function isNetworkError(err: unknown): err is NetworkError {
  return err instanceof NetworkError;
}

export function isNavigationError(err: unknown): err is NavigationError {
  return err instanceof NavigationError;
}

export function isInitError(err: unknown): err is InitError {
  return err instanceof InitError;
}

/**
 * Normalize any error to TUIError
 */
export function normalizeError(err: unknown): TUIError {
  if (err instanceof TUIError) {
    return err;
  }

  if (err instanceof Error) {
    return new TUIError(err.message, "UNKNOWN_ERROR", true, {
      originalError: err.name,
      stack: err.stack,
    });
  }

  return new TUIError(String(err), "UNKNOWN_ERROR", true, { originalValue: err });
}
