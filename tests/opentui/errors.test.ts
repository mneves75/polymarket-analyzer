/**
 * Unit tests for OpenTUI error types
 */

import { describe, expect, it } from "bun:test";
import {
	DataError,
	InitError,
	isDataError,
	isInitError,
	isNavigationError,
	isNetworkError,
	isRenderError,
	isTUIError,
	NavigationError,
	NetworkError,
	RenderError,
	TUIError,
} from "../../src/opentui/errors";

describe("TUIError", () => {
	it("creates error with message and code", () => {
		const error = new TUIError("Test error", "TEST_CODE");

		expect(error.message).toBe("Test error");
		expect(error.code).toBe("TEST_CODE");
		expect(error.name).toBe("TUIError");
		expect(error.timestamp).toBeDefined();
	});

	it("includes context when provided", () => {
		const error = new TUIError("Test error", "TEST_CODE", true, {
			key: "value",
		});

		expect(error.context).toEqual({ key: "value" });
	});

	it("toJSON serializes correctly", () => {
		const error = new TUIError("Test error", "TEST_CODE", true, {
			key: "value",
		});
		const json = error.toJSON();

		expect(json.name).toBe("TUIError");
		expect(json.message).toBe("Test error");
		expect(json.code).toBe("TEST_CODE");
		expect(json.context).toEqual({ key: "value" });
		expect(json.timestamp).toBeDefined();
	});
});

describe("RenderError", () => {
	it("creates render error with component info", () => {
		const error = new RenderError("Render failed", {
			component: "RadarComponent",
		});

		expect(error.message).toBe("Render failed");
		expect(error.code).toBe("RENDER_ERROR");
		expect(error.context?.component).toBe("RadarComponent");
	});
});

describe("DataError", () => {
	it("creates data error", () => {
		const error = new DataError("Invalid data", { field: "markets" });

		expect(error.message).toBe("Invalid data");
		expect(error.code).toBe("DATA_ERROR");
		expect(error.context?.field).toBe("markets");
	});
});

describe("NavigationError", () => {
	it("creates navigation error with direction info", () => {
		const error = new NavigationError("Cannot navigate", {
			direction: "next",
			currentIndex: 0,
		});

		expect(error.message).toBe("Cannot navigate");
		expect(error.code).toBe("NAV_ERROR");
		expect(error.context?.direction).toBe("next");
	});
});

describe("NetworkError", () => {
	it("creates network error", () => {
		const error = new NetworkError("Connection failed", {
			url: "https://api.example.com",
		});

		expect(error.message).toBe("Connection failed");
		expect(error.code).toBe("NETWORK_ERROR");
		expect(error.context?.url).toBe("https://api.example.com");
	});
});

describe("InitError", () => {
	it("creates initialization error", () => {
		const error = new InitError("Init failed", { phase: "renderer" });

		expect(error.message).toBe("Init failed");
		expect(error.code).toBe("INIT_ERROR");
		expect(error.context?.phase).toBe("renderer");
	});
});

describe("Type guards", () => {
	it("isTUIError identifies TUIError instances", () => {
		const tuiError = new TUIError("Test", "TEST");
		const renderError = new RenderError("Test");
		const standardError = new Error("Test");

		expect(isTUIError(tuiError)).toBe(true);
		expect(isTUIError(renderError)).toBe(true);
		expect(isTUIError(standardError)).toBe(false);
		expect(isTUIError(null)).toBe(false);
		expect(isTUIError("string")).toBe(false);
	});

	it("isRenderError identifies RenderError instances", () => {
		const renderError = new RenderError("Test");
		const dataError = new DataError("Test");

		expect(isRenderError(renderError)).toBe(true);
		expect(isRenderError(dataError)).toBe(false);
	});

	it("isDataError identifies DataError instances", () => {
		const dataError = new DataError("Test");
		const networkError = new NetworkError("Test");

		expect(isDataError(dataError)).toBe(true);
		expect(isDataError(networkError)).toBe(false);
	});

	it("isNavigationError identifies NavigationError instances", () => {
		const navError = new NavigationError("Test");
		const dataError = new DataError("Test");

		expect(isNavigationError(navError)).toBe(true);
		expect(isNavigationError(dataError)).toBe(false);
	});

	it("isNetworkError identifies NetworkError instances", () => {
		const networkError = new NetworkError("Test");
		const initError = new InitError("Test");

		expect(isNetworkError(networkError)).toBe(true);
		expect(isNetworkError(initError)).toBe(false);
	});

	it("isInitError identifies InitError instances", () => {
		const initError = new InitError("Test");
		const tuiError = new TUIError("Test", "TEST");

		expect(isInitError(initError)).toBe(true);
		expect(isInitError(tuiError)).toBe(false);
	});
});
