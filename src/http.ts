import { NetworkError } from "./errors";
import { RateLimiter } from "./rateLimiter";

/**
 * Options for HTTP requests with retry and timeout support.
 */
export type FetchOptions = {
	/** HTTP method (currently only GET is supported) */
	method?: "GET" | "POST";
	/** Additional HTTP headers to include in the request */
	headers?: Record<string, string>;
	/** Request body to send (will be JSON.stringify'd if present) */
	body?: unknown;
	/** Request timeout in milliseconds (default: 10,000ms = 10 seconds) */
	timeoutMs?: number;
	/** Maximum number of retry attempts (default: 2, meaning 3 total attempts) */
	retries?: number;
	/** AbortSignal for request cancellation */
	signal?: AbortSignal;
};

/**
 * Custom HTTP Error class with HTTP-specific information.
 *
 * Extends NetworkError for consistency with the application error hierarchy.
 *
 * @example
 * try {
 *   await fetchJson(url);
 * } catch (err) {
 *   if (err instanceof HttpError) {
 *     console.log(`HTTP ${err.status}: ${err.message}`);
 *     console.log(`Request URL: ${err.url}`);
 *   }
 * }
 */
export class HttpError extends NetworkError {
	/** HTTP status code (e.g., 404, 500, etc.) */
	status: number;
	/** The full URL that was requested */
	url: string;
	/** Parsed error response body (if available) */
	body: unknown;

	constructor(status: number, url: string, body: unknown, message: string) {
		// Call parent constructor (NetworkError sets code to "NETWORK_ERROR" by default)
		super(message, {
			url,
			statusCode: status,
			responseBody: body,
		});

		this.name = "HttpError";
		this.status = status;
		this.url = url;
		this.body = body;

		// Override the error code based on HTTP status
		// We need to set this after super() call since NetworkError sets it to "NETWORK_ERROR"
		const code =
			status === 429
				? "RATE_LIMIT_ERROR"
				: status >= 500
					? "SERVER_ERROR"
					: status >= 400
						? "CLIENT_ERROR"
						: "HTTP_ERROR";

		Object.defineProperty(this, "code", {
			value: code,
			enumerable: true,
			writable: false,
			configurable: false,
		});
	}

	/**
	 * Check if this is a rate limit error (HTTP 429).
	 */
	override isRateLimit(): boolean {
		return this.status === 429;
	}

	/**
	 * Check if this is a server error (5xx).
	 */
	isServerError(): boolean {
		return this.status >= 500;
	}

	/**
	 * Check if this is a client error (4xx, excluding 429).
	 */
	isClientError(): boolean {
		return this.status >= 400 && this.status < 500 && this.status !== 429;
	}
}

// Rate limiting configuration for Polymarket APIs
const limiter = new RateLimiter();
const WINDOW_MS = 10_000; // 10-second sliding window

/**
 * Rate limit rules for specific Polymarket API endpoints.
 *
 * These are based on Polymarket's documented rate limits:
 * - CLOB endpoints: typically 500-1500 requests per 10 seconds
 * - Gamma API: typically 300-500 requests per 10 seconds
 * - Data API: typically 150-200 requests per 10 seconds
 *
 * @see https://docs.polymarket.com for official rate limit documentation
 */
const RATE_LIMITS = [
	{ host: "clob.polymarket.com", path: "/book", limit: 1500 },
	{ host: "clob.polymarket.com", path: "/books", limit: 500 },
	{ host: "clob.polymarket.com", path: "/price", limit: 1500 },
	{ host: "clob.polymarket.com", path: "/prices", limit: 500 },
	{ host: "clob.polymarket.com", path: "/midpoint", limit: 1500 },
	{ host: "clob.polymarket.com", path: "/prices-history", limit: 1000 },
	{ host: "clob.polymarket.com", path: "/price_history", limit: 1000 },
	{ host: "clob.polymarket.com", path: "/data/trades", limit: 500 },
	{ host: "gamma-api.polymarket.com", path: "/events", limit: 500 },
	{ host: "gamma-api.polymarket.com", path: "/markets", limit: 300 },
	{ host: "data-api.polymarket.com", path: "/positions", limit: 150 },
	{ host: "data-api.polymarket.com", path: "/trades", limit: 200 },
	{ host: "data-api.polymarket.com", path: "/closed-positions", limit: 150 },
];

/**
 * Host-level rate limits as a fallback when no specific path rule matches.
 * These provide overall limits per host to prevent abuse.
 */
const HOST_LIMITS = [
	{ host: "clob.polymarket.com", limit: 9000 },
	{ host: "gamma-api.polymarket.com", limit: 4000 },
	{ host: "data-api.polymarket.com", limit: 1000 },
];

/**
 * Fetch JSON from a URL with automatic retry, exponential backoff, and rate limiting.
 *
 * ## Retry Strategy
 *
 * Retries are performed for:
 * - HTTP 429 (Too Many Requests) - rate limit exceeded
 * - HTTP 5xx (Server Errors) - temporary server issues
 * - Network errors - timeouts, connection failures
 *
 * No retry for:
 * - HTTP 4xx (Client Errors except 429) - invalid requests that won't succeed on retry
 *
 * ## Exponential Backoff with Jitter
 *
 * Formula: delay = (200ms × 2^(attempt-1)) + random(0, 100ms)
 *
 * Timeline example:
 * - Attempt 1 fails → wait ~200ms + jitter → Attempt 2
 * - Attempt 2 fails → wait ~400ms + jitter → Attempt 3
 * - Attempt 3 succeeds
 *
 * Why exponential? Prevents thundering herd when service recovers.
 * Why jitter? Distributes retries to prevent synchronized storms.
 *
 * @param url - Full URL to fetch from
 * @param options - Fetch options including timeout, retry count, etc.
 * @returns Parsed JSON response as type T
 * @throws HttpError on non-retryable failures or after all retries exhausted
 *
 * @example
 * // Basic usage with defaults
 * const data = await fetchJson<MimeType>('https://api.example.com/data');
 *
 * @example
 * // With custom timeout and retries
 * const data = await fetchJson<MimeType>('https://api.example.com/data', {
 *   timeoutMs: 5000,  // 5 second timeout
 *   retries: 3        // Try up to 4 times total
 * });
 */
export async function fetchJson<T>(
	url: string,
	options: FetchOptions = {},
): Promise<T> {
	const {
		method = "GET",
		headers = {},
		body,
		timeoutMs = 10_000,
		retries = 2,
		signal: externalSignal,
	} = options;
	const requestUrl = new URL(url);

	// Check if already aborted before starting
	if (externalSignal?.aborted) {
		const error = new Error("Request aborted");
		error.name = "AbortError";
		throw error;
	}

	// Apply rate limiting if rule exists for this endpoint
	const limitRule = matchRateLimit(requestUrl);
	if (limitRule) await limiter.take(limitRule);

	let attempt = 0;
	while (true) {
		// Create internal abort controller for timeout, but also listen to external signal
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);

		// Link external signal to internal controller
		const abortHandler = () => controller.abort();
		externalSignal?.addEventListener("abort", abortHandler);

		try {
			const res = await fetch(requestUrl, {
				method,
				headers: {
					"content-type": "application/json",
					...headers,
				},
				body: body ? JSON.stringify(body) : undefined,
				signal: controller.signal,
			});

			if (!res.ok) {
				// Retry on rate limits (429) and server errors (5xx)
				if (shouldRetry(res.status) && attempt < retries) {
					attempt += 1;
					await backoff(attempt);
					continue;
				}
				// For non-retryable errors, throw immediately
				const bodyPayload = await readErrorBody(res);
				const bodyMessage = errorBodyMessage(bodyPayload);
				const message = bodyMessage
					? `HTTP ${res.status} ${res.statusText} for ${url}: ${bodyMessage}`
					: `HTTP ${res.status} ${res.statusText} for ${url}`;
				throw new HttpError(res.status, url, bodyPayload, message);
			}

			return (await res.json()) as T;
		} catch (err) {
			// Don't retry HttpError - it was already decided not to retry based on status code.
			if (err instanceof HttpError) {
				throw err;
			}

			// Don't retry on external abort - propagate immediately
			if (externalSignal?.aborted) {
				const abortError = new Error("Request aborted");
				abortError.name = "AbortError";
				throw abortError;
			}

			// Retry on network errors (timeouts, connection failures)
			if (attempt < retries) {
				attempt += 1;
				await backoff(attempt);
				continue;
			}
			// After all retries exhausted, re-throw
			throw err;
		} finally {
			clearTimeout(timeout);
			externalSignal?.removeEventListener("abort", abortHandler);
		}
	}
}

/**
 * Adds query parameters to a URL.
 *
 * @param base - The base URL
 * @param params - Object containing query parameters (undefined values are omitted)
 * @returns Full URL with query parameters appended
 *
 * @example
 * const url = withQuery("https://api.example.com/search", {
 *   q: "polymarket",
 *   limit: 10,
 *   active: true
 * });
 * // → "https://api.example.com/search?q=polymarket&limit=10&active=true"
 */
export function withQuery(
	base: string,
	params: Record<string, string | number | boolean | undefined>,
) {
	const url = new URL(base);
	for (const [key, value] of Object.entries(params)) {
		if (value === undefined) continue;
		url.searchParams.set(key, String(value));
	}
	return url.toString();
}

/**
 * Matches a URL to its rate limit rule based on host and path.
 *
 * Algorithm:
 * 1. Find most specific path match (longest matching path)
 * 2. Fall back to host-level limit if no path match
 * 3. Return undefined if no rule matches
 *
 * @param url - The URL to match against rate limit rules
 * @returns Rate limit rule if found, undefined otherwise
 */
function matchRateLimit(url: URL) {
	const host = url.host;
	const path = url.pathname;
	let best: { host: string; path: string; limit: number } | undefined;

	// Find most specific path match (longest path wins)
	for (const rule of RATE_LIMITS) {
		if (rule.host !== host) continue;
		if (path.startsWith(rule.path)) {
			if (!best || rule.path.length > best.path.length) best = rule;
		}
	}

	if (best)
		return {
			key: `${host}${best.path}`,
			limit: best.limit,
			windowMs: WINDOW_MS,
		};

	// Fall back to host-level limit
	const hostRule = HOST_LIMITS.find((rule) => rule.host === host);
	if (hostRule)
		return { key: host, limit: hostRule.limit, windowMs: WINDOW_MS };

	return undefined;
}

/**
 * Calculate exponential backoff delay with jitter.
 *
 * Formula: delay = (200ms × 2^(attempt-1)) + random(0, 100ms)
 *
 * ## Why exponential backoff?
 * When a service fails and multiple clients are hitting it simultaneously,
 * we don't want all clients to retry at the same time. Exponential backoff
 * means each client waits progressively longer between retries:
 * - Attempt 1: immediate
 * - Attempt 2: ~200ms delay
 * - Attempt 3: ~400ms delay
 * - Attempt 4: ~800ms delay
 *
 * ## Why add jitter?
 * Without jitter, clients that started at the same time will retry at the
 * same time, creating synchronized "waves" of requests. Jitter randomizes
 * the exact wait time slightly to distribute retries more evenly.
 *
 * @param attempt - Current attempt number (1-indexed)
 * @returns Promise that resolves after calculated delay
 */
async function backoff(attempt: number) {
	// Exponential: 200ms, 400ms, 800ms, 1600ms, 3200ms, ...
	const base = 200 * 2 ** (attempt - 1);

	// Jitter: random 0-100ms to distribute retries
	const jitter = Math.floor(Math.random() * 100);

	await new Promise((resolve) => setTimeout(resolve, base + jitter));
}

/**
 * Determines if an HTTP status code should trigger a retry.
 *
 * Retry policy:
 * - 429 (Too Many Requests) → Yes, rate limit is temporary
 * - 500-599 (Server Errors) → Yes, server may recover
 * - 400-499 (Client Errors except 429) → No, client error won't fix itself
 *
 * @param status - HTTP status code
 * @returns true if should retry, false otherwise
 */
function shouldRetry(status: number) {
	return status === 429 || status >= 500;
}

/**
 * Checks if an error indicates "no orderbook exists" for a market.
 * This is a specific Polymarket API condition that should be handled gracefully.
 *
 * @param err - Unknown error to check
 * @returns true if error is a "no orderbook" error (404 with specific message)
 */
export function isNoOrderbookError(err: unknown) {
	const message = extractErrorMessage(err);
	if (!message) return false;
	// Only 404 errors about orderbooks should be treated as "no orderbook"
	if (err instanceof HttpError && err.status !== 404) return false;
	return message.toLowerCase().includes("no orderbook exists");
}

/**
 * Extracts error message from various error types.
 *
 * Handles:
 * - HttpError (with body message)
 * - Error objects
 * - Strings
 * - Unknown objects (JSON stringified)
 *
 * @param err - Error to extract message from
 * @returns Extracted error message or empty string
 */
function extractErrorMessage(err: unknown) {
	if (!err) return "";
	if (err instanceof HttpError) {
		const bodyMessage = errorBodyMessage(err.body);
		return bodyMessage || err.message;
	}
	if (err instanceof Error) return err.message;
	if (typeof err === "string") return err;
	try {
		return JSON.stringify(err);
	} catch {
		return String(err);
	}
}

/**
 * Reads error response body from a failed HTTP response.
 *
 * @param res - Failed HTTP response
 * @returns Parsed error body (JSON or text)
 */
async function readErrorBody(res: Response) {
	const text = await res.text();
	if (!text) return "";
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

/**
 * Extracts human-readable error message from error response body.
 *
 * Looks for common error message fields in order:
 * - error
 * - message
 * - detail
 *
 * @param body - Error response body
 * @returns Extracted message (truncated to 200 chars) or empty string
 */
function errorBodyMessage(body: unknown) {
	if (!body) return "";
	if (typeof body === "string") return body.slice(0, 200);
	if (typeof body === "object") {
		const record = body as Record<string, unknown>;
		const message =
			(typeof record.error === "string" && record.error) ||
			(typeof record.message === "string" && record.message) ||
			(typeof record.detail === "string" && record.detail);
		if (message) return message.slice(0, 200);
		try {
			return JSON.stringify(body).slice(0, 200);
		} catch {
			return "[object]";
		}
	}
	return String(body).slice(0, 200);
}
