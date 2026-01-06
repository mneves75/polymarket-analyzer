import { describe, expect, it } from "bun:test";
import {
	ApiError,
	AppError,
	ConfigError,
	formatErrorForLogging,
	getErrorInfo,
	isApiError,
	isAppError,
	isNetworkError,
	isRateLimitError,
	isValidationError,
	NetworkError,
	normalizeError,
	ParseError,
	RateLimitError,
	ValidationError,
	WebSocketError,
} from "../src/errors";

describe("AppError", () => {
	it("creates error with code and context", () => {
		const error = new AppError("Test error", "TEST_CODE", { key: "value" });

		expect(error.message).toBe("Test error");
		expect(error.code).toBe("TEST_CODE");
		expect(error.context).toEqual({ key: "value" });
		expect(error.name).toBe("AppError");
		expect(error.timestamp).toBeDefined();
	});

	it("converts to JSON for serialization", () => {
		const error = new AppError("Test error", "TEST_CODE", { key: "value" });
		const json = error.toJSON();

		expect(json.name).toBe("AppError");
		expect(json.message).toBe("Test error");
		expect(json.code).toBe("TEST_CODE");
		expect(json.context).toEqual({ key: "value" });
		expect(json.timestamp).toBeDefined();
	});

	it("includes stack trace in JSON", () => {
		const error = new AppError("Test error", "TEST_CODE");
		const json = error.toJSON();

		expect(json.stack).toBeDefined();
	});
});

describe("NetworkError", () => {
	it("creates network error with context", () => {
		const error = new NetworkError("Connection failed", {
			url: "https://api.test.com",
			statusCode: 500,
			timeoutMs: 5000,
		});

		expect(error.message).toBe("Connection failed");
		expect(error.code).toBe("NETWORK_ERROR");
		expect(error.statusCode).toBe(500);
	});

	it("identifies timeout errors", () => {
		const timeoutError = new NetworkError("Request failed", {
			timeoutMs: 5000,
		});

		expect(timeoutError.isTimeout()).toBe(false); // No "timeout" in message

		const timeoutWithMessage = new NetworkError("timeout occurred", {
			timeoutMs: 5000,
		});

		expect(timeoutWithMessage.isTimeout()).toBe(true);
	});

	it("identifies rate limit errors", () => {
		const rateLimitError = new NetworkError("Rate limit exceeded", {
			statusCode: 429,
		});

		expect(rateLimitError.isRateLimit()).toBe(true);
	});

	it("identifies non-rate-limit errors", () => {
		const serverError = new NetworkError("Server error", {
			statusCode: 500,
		});

		expect(serverError.isRateLimit()).toBe(false);
	});
});

describe("ValidationError", () => {
	it("creates validation error with field context", () => {
		const error = new ValidationError("Invalid email format", {
			field: "email",
			value: "not-an-email",
			expected: "email@domain.com",
		});

		expect(error.message).toBe("Invalid email format");
		expect(error.code).toBe("VALIDATION_ERROR");
		expect(error.context?.field).toBe("email");
	});
});

describe("ApiError", () => {
	it("creates API error with endpoint context", () => {
		const error = new ApiError("API request failed", {
			endpoint: "/markets",
			statusCode: 500,
			responseBody: { error: "Internal server error" },
		});

		expect(error.message).toBe("API request failed");
		expect(error.code).toBe("API_ERROR");
		expect(error.statusCode).toBe(500);
	});
});

describe("ConfigError", () => {
	it("creates config error with key context", () => {
		const error = new ConfigError("Missing required config", {
			key: "API_KEY",
		});

		expect(error.message).toBe("Missing required config");
		expect(error.code).toBe("CONFIG_ERROR");
	});
});

describe("WebSocketError", () => {
	it("creates WebSocket error with connection context", () => {
		const error = new WebSocketError("WebSocket disconnected", {
			url: "wss://ws.example.com",
			readyState: 3,
		});

		expect(error.message).toBe("WebSocket disconnected");
		expect(error.code).toBe("WEBSOCKET_ERROR");
	});
});

describe("ParseError", () => {
	it("creates parse error with data context", () => {
		const error = new ParseError("Invalid JSON", {
			data: "{ invalid json }",
			expected: "valid JSON object",
		});

		expect(error.message).toBe("Invalid JSON");
		expect(error.code).toBe("PARSE_ERROR");
	});
});

describe("RateLimitError", () => {
	it("creates rate limit error with retry information", () => {
		const error = new RateLimitError("Too many requests", {
			url: "https://api.test.com",
			retryAfter: 5000,
			limit: { max: 100, window: 10000 },
		});

		expect(error.code).toBe("RATE_LIMIT_ERROR");
		expect(error.statusCode).toBe(429);
		expect(error.getRetryAfterMs()).toBe(5000);
	});

	it("returns undefined when retry-after not specified", () => {
		const error = new RateLimitError("Too many requests");

		expect(error.getRetryAfterMs()).toBeUndefined();
	});
});

describe("Type guards", () => {
	it("isAppError identifies AppError instances", () => {
		const appError = new AppError("Test", "TEST");
		const networkError = new NetworkError("Test");
		const standardError = new Error("Test");

		expect(isAppError(appError)).toBe(true);
		expect(isAppError(networkError)).toBe(true);
		expect(isAppError(standardError)).toBe(false);
		expect(isAppError("string error")).toBe(false);
		expect(isAppError(null)).toBe(false);
	});

	it("isNetworkError identifies NetworkError instances", () => {
		const networkError = new NetworkError("Test");
		const validationError = new ValidationError("Test");

		expect(isNetworkError(networkError)).toBe(true);
		expect(isNetworkError(validationError)).toBe(false);
	});

	it("isValidationError identifies ValidationError instances", () => {
		const validationError = new ValidationError("Test");
		const networkError = new NetworkError("Test");

		expect(isValidationError(validationError)).toBe(true);
		expect(isValidationError(networkError)).toBe(false);
	});

	it("isApiError identifies ApiError instances", () => {
		const apiError = new ApiError("Test");
		const networkError = new NetworkError("Test");

		expect(isApiError(apiError)).toBe(true);
		expect(isApiError(networkError)).toBe(false);
	});

	it("isRateLimitError identifies RateLimitError instances", () => {
		const rateLimitError = new RateLimitError("Test");
		const networkError = new NetworkError("Test");

		expect(isRateLimitError(rateLimitError)).toBe(true);
		expect(isRateLimitError(networkError)).toBe(false);
	});
});

describe("getErrorInfo", () => {
	it("extracts info from AppError", () => {
		const error = new AppError("Test error", "TEST_CODE", { key: "value" });
		const info = getErrorInfo(error);

		expect(info.message).toBe("Test error");
		expect(info.code).toBe("TEST_CODE");
		expect(info.context).toEqual({ key: "value" });
	});

	it("extracts info from standard Error", () => {
		const error = new Error("Standard error");
		const info = getErrorInfo(error);

		expect(info.message).toBe("Standard error");
		expect(info.code).toBeUndefined();
	});

	it("extracts info from string", () => {
		const info = getErrorInfo("String error");

		expect(info.message).toBe("String error");
	});

	it("extracts info from object with message property", () => {
		const obj = { message: "Object error", code: "OBJ_ERR" };
		const info = getErrorInfo(obj);

		expect(info.message).toBe("Object error");
	});

	it("extracts info from object with error property", () => {
		const obj = { error: "Error property" };
		const info = getErrorInfo(obj);

		expect(info.message).toBe("Error property");
	});

	it("extracts info from plain object", () => {
		const obj = { data: "value" };
		const info = getErrorInfo(obj);

		expect(info.message).toBe(JSON.stringify(obj));
	});

	it("handles null and undefined", () => {
		expect(getErrorInfo(null).message).toBe("null");
		expect(getErrorInfo(undefined).message).toBe("undefined");
	});
});

describe("formatErrorForLogging", () => {
	it("formats AppError with additional context", () => {
		const error = new AppError("Test error", "TEST_CODE");
		const formatted = formatErrorForLogging(error, { extra: "context" });

		expect(formatted.error?.message).toBe("Test error");
		expect(formatted.error?.code).toBe("TEST_CODE");
		expect(formatted.error?.extra).toBe("context");
		expect(formatted.timestamp).toBeDefined();
	});

	it("formats standard Error", () => {
		const error = new Error("Standard error");
		const formatted = formatErrorForLogging(error);

		expect(formatted.error?.message).toBe("Standard error");
		expect(formatted.timestamp).toBeDefined();
	});

	it("formats string error", () => {
		const formatted = formatErrorForLogging("String error");

		expect(formatted.error?.message).toBe("String error");
		expect(formatted.timestamp).toBeDefined();
	});
});

describe("normalizeError", () => {
	it("returns AppError unchanged", () => {
		const appError = new AppError("Test", "TEST");
		const normalized = normalizeError(appError);

		expect(normalized).toBe(appError);
	});

	it("wraps standard Error in AppError", () => {
		const standardError = new Error("Standard error");
		const normalized = normalizeError(standardError);

		expect(normalized).toBeInstanceOf(AppError);
		expect(normalized.message).toBe("Standard error");
		expect(normalized.context?.originalError).toBe("Error");
	});

	it("wraps string in AppError", () => {
		const normalized = normalizeError("String error");

		expect(normalized).toBeInstanceOf(AppError);
		expect(normalized.message).toBe("String error");
	});

	it("wraps object in AppError", () => {
		const obj = { data: "value" };
		const normalized = normalizeError(obj);

		expect(normalized).toBeInstanceOf(AppError);
		expect(normalized.context?.originalValue).toEqual(obj);
	});
});
