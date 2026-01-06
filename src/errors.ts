/**
 * Custom error types for the Polymarket analyzer application.
 *
 * These errors provide structured, serializable error information
 * with context for debugging and error handling.
 *
 * @example
 * try {
 *   await fetchMarkets();
 * } catch (err) {
 *   if (err instanceof NetworkError) {
 *     console.error(`Network error: ${err.message}`, { url: err.url });
 *   } else if (err instanceof ValidationError) {
 *     console.error(`Validation error: ${err.message}`, { field: err.field });
 *   }
 * }
 */

/**
 * Base application error class.
 * All custom errors should extend this class.
 */
export class AppError extends Error {
	/** Error code for programmatic error handling */
	readonly code: string;

	/** Additional context about the error */
	readonly context?: Record<string, unknown>;

	/** Timestamp when the error occurred */
	readonly timestamp: string;

	constructor(
		message: string,
		code: string,
		context?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
		this.code = code;
		this.context = context;
		this.timestamp = new Date().toISOString();

		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, this.constructor);
		}
	}

	/**
	 * Convert error to a plain object for serialization.
	 * Useful for logging and API responses.
	 */
	toJSON(): Record<string, unknown> {
		return {
			name: this.name,
			message: this.message,
			code: this.code,
			context: this.context,
			timestamp: this.timestamp,
			stack: this.stack,
		};
	}
}

/**
 * Network-related errors (HTTP failures, timeouts, connection issues).
 */
export class NetworkError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The URL that was requested */
			url?: string;
			/** HTTP method used */
			method?: string;
			/** HTTP status code (if applicable) */
			statusCode?: number;
			/** Request timeout in milliseconds */
			timeoutMs?: number;
			/** Number of retry attempts made */
			retries?: number;
			/** Response body (for HTTP errors) */
			responseBody?: unknown;
		},
	) {
		super(message, "NETWORK_ERROR", context);
	}

	/**
	 * Check if the error is a timeout error.
	 */
	isTimeout(): boolean {
		return (
			this.message.toLowerCase().includes("timeout") || this.code === "TIMEOUT"
		);
	}

	/**
	 * Check if the error is a rate limit error (HTTP 429).
	 */
	isRateLimit(): boolean {
		return (
			this.statusCode === 429 ||
			this.message.toLowerCase().includes("rate limit")
		);
	}

	get statusCode(): number | undefined {
		return this.context?.statusCode as number | undefined;
	}
}

/**
 * Validation errors for invalid data or input.
 */
export class ValidationError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The field or property that failed validation */
			field?: string;
			/** The invalid value that was provided */
			value?: unknown;
			/** Expected type or format */
			expected?: string;
			/** Validation rule that was violated */
			rule?: string;
		},
	) {
		super(message, "VALIDATION_ERROR", context);
	}
}

/**
 * API-related errors (invalid responses, schema violations).
 */
export class ApiError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The API endpoint that was called */
			endpoint?: string;
			/** HTTP status code */
			statusCode?: number;
			/** Response body (if available) */
			responseBody?: unknown;
			/** The request that caused the error */
			request?: {
				url: string;
				method?: string;
				body?: unknown;
			};
		},
	) {
		super(message, "API_ERROR", context);
	}

	get statusCode(): number | undefined {
		return this.context?.statusCode as number | undefined;
	}
}

/**
 * Configuration errors (invalid or missing configuration).
 */
export class ConfigError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The configuration key that is invalid */
			key?: string;
			/** The invalid value that was provided */
			value?: unknown;
		},
	) {
		super(message, "CONFIG_ERROR", context);
	}
}

/**
 * WebSocket-related errors.
 */
export class WebSocketError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The WebSocket URL */
			url?: string;
			/** Connection state */
			readyState?: number;
			/** Whether this is a connection error */
			isConnectionError?: boolean;
		},
	) {
		super(message, "WEBSOCKET_ERROR", context);
	}
}

/**
 * Parsing errors (invalid JSON, malformed data).
 */
export class ParseError extends AppError {
	constructor(
		message: string,
		context?: {
			/** The data that failed to parse */
			data?: unknown;
			/** Expected format */
			expected?: string;
		},
	) {
		super(message, "PARSE_ERROR", context);
	}
}

/**
 * Rate limit error (HTTP 429).
 */
export class RateLimitError extends NetworkError {
	constructor(
		message: string,
		context?: {
			/** The URL that was rate limited */
			url?: string;
			/** Retry-after header value (if provided) */
			retryAfter?: number;
			/** Limit information */
			limit?: {
				/** Maximum requests allowed */
				max: number;
				/** Time window in milliseconds */
				window: number;
			};
		},
	) {
		super(message, { ...context, statusCode: 429 });
		this.name = "RateLimitError";

		// Override the code to be RATE_LIMIT_ERROR instead of NETWORK_ERROR
		Object.defineProperty(this, "code", {
			value: "RATE_LIMIT_ERROR",
			enumerable: true,
			writable: false,
			configurable: false,
		});
	}

	/**
	 * Get the retry-after delay in milliseconds.
	 * @returns Delay in milliseconds, or undefined if not specified
	 */
	getRetryAfterMs(): number | undefined {
		return this.context?.retryAfter as number | undefined;
	}
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(err: unknown): err is AppError {
	return err instanceof AppError;
}

/**
 * Type guard to check if an error is a NetworkError.
 */
export function isNetworkError(err: unknown): err is NetworkError {
	return err instanceof NetworkError;
}

/**
 * Type guard to check if an error is a ValidationError.
 */
export function isValidationError(err: unknown): err is ValidationError {
	return err instanceof ValidationError;
}

/**
 * Type guard to check if an error is an ApiError.
 */
export function isApiError(err: unknown): err is ApiError {
	return err instanceof ApiError;
}

/**
 * Type guard to check if an error is a RateLimitError.
 */
export function isRateLimitError(err: unknown): err is RateLimitError {
	return err instanceof RateLimitError;
}

/**
 * Extract error information from any error type.
 * Returns a structured object with error details.
 */
export function getErrorInfo(err: unknown): {
	message: string;
	code?: string;
	context?: Record<string, unknown>;
	stack?: string;
} {
	if (err instanceof AppError) {
		return {
			message: err.message,
			code: err.code,
			context: err.context,
			stack: err.stack,
		};
	}

	if (err instanceof Error) {
		return {
			message: err.message,
			stack: err.stack,
		};
	}

	if (typeof err === "string") {
		return { message: err };
	}

	if (err && typeof err === "object") {
		const record = err as Record<string, unknown>;
		const message =
			(typeof record.message === "string" && record.message) ||
			(typeof record.error === "string" && record.error) ||
			JSON.stringify(err);
		return {
			message,
			context: err as Record<string, unknown>,
		};
	}

	return { message: String(err) };
}

/**
 * Format an error for logging.
 * Returns a structured log entry with error details.
 */
export function formatErrorForLogging(
	err: unknown,
	additionalContext?: Record<string, unknown>,
): Record<string, unknown> {
	const info = getErrorInfo(err);

	return {
		error: {
			...info,
			...additionalContext,
		},
		timestamp: new Date().toISOString(),
	};
}

/**
 * Wrap a thrown value in an AppError if it isn't already one.
 * Useful for catch blocks to ensure consistent error types.
 */
export function normalizeError(err: unknown): AppError {
	if (err instanceof AppError) {
		return err;
	}

	if (err instanceof Error) {
		return new AppError(err.message, "UNKNOWN_ERROR", {
			originalError: err.name,
			stack: err.stack,
		});
	}

	return new AppError(String(err), "UNKNOWN_ERROR", { originalValue: err });
}
