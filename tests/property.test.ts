/**
 * Property-based tests using fast-check.
 *
 * These tests verify that functions maintain their properties
 * across a wide range of randomly generated inputs.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import { asNumber, extractPrice, normalizeOrderbook } from "../src/parsers";
import {
	asConditionId,
	asMarketId,
	asTokenId,
	isConditionId,
	isMarketId,
	isTokenId,
} from "../src/types";
import {
	formatNumber,
	formatPct,
	formatPrice,
	midpointFrom,
} from "../src/utils";

describe("Property-based Tests", () => {
	describe("formatPct", () => {
		it("always returns a string ending with %", () => {
			fc.assert(
				fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
					const result = formatPct(value);
					return typeof result === "string" && result.endsWith("%");
				}),
			);
		});

		it("returns - for undefined", () => {
			fc.assert(
				fc.property(fc.constant(undefined), (value) => {
					return formatPct(value) === "-";
				}),
			);
		});

		it("is idempotent for same input", () => {
			fc.assert(
				fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
					const first = formatPct(value);
					const second = formatPct(value);
					return first === second;
				}),
			);
		});
	});

	describe("formatPrice", () => {
		it("always returns a string with 4 decimal places", () => {
			fc.assert(
				fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
					const result = formatPrice(value);
					const parts = result.split(".");
					return (
						typeof result === "string" &&
						(parts.length === 1 || parts[1]?.length === 4)
					);
				}),
			);
		});

		it("returns - for undefined", () => {
			fc.assert(
				fc.property(fc.constant(undefined), (value) => {
					return formatPrice(value) === "-";
				}),
			);
		});
	});

	describe("formatNumber", () => {
		it("returns non-empty string for valid numbers", () => {
			fc.assert(
				fc.property(
					fc.float({ min: 0, max: 1_000_000_000, noNaN: true }),
					(value) => {
						const result = formatNumber(value);
						return typeof result === "string" && result.length > 0;
					},
				),
			);
		});

		it("returns - for undefined", () => {
			fc.assert(
				fc.property(fc.constant(undefined), (value) => {
					return formatNumber(value) === "-";
				}),
			);
		});
	});

	describe("midpointFrom", () => {
		it("returns average of bid and ask", () => {
			fc.assert(
				fc.property(
					fc.float({ min: 0, max: 1, noNaN: true }),
					fc.float({ min: 0, max: 1, noNaN: true }),
					(bid, ask) => {
						const midpoint = midpointFrom(bid, ask);
						return midpoint !== undefined && midpoint === (bid + ask) / 2;
					},
				),
			);
		});

		it("returns undefined when either is undefined", () => {
			fc.assert(
				fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
					return (
						midpointFrom(undefined, value) === undefined &&
						midpointFrom(value, undefined) === undefined
					);
				}),
			);
		});
	});

	describe("asNumber", () => {
		it("returns number for numeric input", () => {
			fc.assert(
				fc.property(
					fc.float({ min: -1000, max: 1000, noNaN: true }),
					(value) => {
						const result = asNumber(value);
						return typeof result === "number" && !Number.isNaN(result);
					},
				),
			);
		});

		it("converts string numbers", () => {
			fc.assert(
				fc.property(
					fc.float({ min: -1000, max: 1000, noNaN: true }).map(String),
					(value) => {
						const result = asNumber(value);
						return typeof result === "number" && !Number.isNaN(result);
					},
				),
			);
		});

		it("returns undefined for non-numeric input", () => {
			fc.assert(
				fc.property(fc.string(), (value) => {
					// Only test non-numeric strings
					if (typeof value === "string" && !Number.isNaN(Number(value))) {
						return true; // Skip numeric strings
					}
					return asNumber(value) === undefined;
				}),
			);
		});
	});

	describe("extractPrice", () => {
		it("extracts price from valid response", () => {
			fc.assert(
				fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (price) => {
					const response = { price };
					const result = extractPrice(response);
					return result === price;
				}),
			);
		});

		it("returns undefined when no price field", () => {
			fc.assert(
				fc.property(fc.object(), (obj) => {
					const response = { ...obj };
					// Ensure no price field
					delete (response as { price?: unknown }).price;
					delete (response as { best_price?: unknown }).best_price;
					delete (response as { value?: unknown }).value;
					return extractPrice(response) === undefined;
				}),
			);
		});
	});

	describe("normalizeOrderbook", () => {
		it("returns orderbook with bids and asks arrays", () => {
			fc.assert(
				fc.property(
					fc.array(
						fc.tuple(
							fc.float({ min: 0, max: 1 }),
							fc.float({ min: 0, max: 1000 }),
						),
					),
					(levels) => {
						const response = { bids: levels, asks: [] };
						const result = normalizeOrderbook(response);
						return Array.isArray(result.bids) && Array.isArray(result.asks);
					},
				),
			);
		});
	});

	// Use specific test cases for branded type validation instead of property tests
	// Property tests with fast-check are inefficient for these strict format validators
	describe("asTokenId", () => {
		it("rejects token IDs without 0x prefix", () => {
			const invalidIds = ["1234567890abcdef", "abc123def456", "FFFFFFFFFFFF"];
			for (const id of invalidIds) {
				expect(() => asTokenId(id)).toThrow();
			}
		});

		it("rejects too short token IDs", () => {
			const tooShortCases = [
				"0x",
				"0x1",
				"0x12",
				"0x123",
				"0x1234",
				"0x12345",
				"0x123456",
				"0x1234567",
			];
			for (const id of tooShortCases) {
				expect(() => asTokenId(id)).toThrow();
			}
		});
	});

	describe("asConditionId", () => {
		it("accepts valid 66-character condition IDs", () => {
			const validIds = [
				`0x${"0".repeat(64)}`,
				`0x${"a".repeat(64)}`,
				`0x${"f".repeat(64)}`,
			];
			for (const id of validIds) {
				expect(() => asConditionId(id)).not.toThrow();
			}
		});

		it("rejects condition IDs that are not 66 characters", () => {
			const invalidIds = [
				"0x1234567890abcdef",
				`0x${"a".repeat(42)}`,
				`0x${"f".repeat(100)}`,
			];
			for (const id of invalidIds) {
				expect(() => asConditionId(id)).toThrow();
			}
		});
	});

	describe("asMarketId", () => {
		it("accepts valid hex market IDs", () => {
			const validIds = [`0x${"a".repeat(42)}`, `0x${"0".repeat(22)}`];
			for (const id of validIds) {
				expect(() => asMarketId(id)).not.toThrow();
			}
		});

		it("accepts valid slug market IDs", () => {
			const validSlugs = [
				"bitcoin-price-2025",
				"will-trump-win-2024",
				"crypto_market_2025",
				"market-123",
			];
			for (const slug of validSlugs) {
				expect(() => asMarketId(slug)).not.toThrow();
			}
		});
	});

	describe("isTokenId type guard", () => {
		it("returns true only for valid token ID format", () => {
			const validIds = ["0x1234567890abcdef", `0x${"a".repeat(64)}`];
			for (const id of validIds) {
				expect(isTokenId(id)).toBe(true);
			}
		});

		it("returns false for invalid formats", () => {
			const invalidIds = [
				"",
				"12345",
				"0x123",
				"no prefix",
				`0x${"a".repeat(100)}`,
			];
			for (const id of invalidIds) {
				expect(isTokenId(id)).toBe(false);
			}
		});
	});

	describe("isConditionId type guard", () => {
		it("returns true only for 66-character hex strings", () => {
			const validIds = [
				`0x${"0".repeat(64)}`,
				`0x${"a".repeat(64)}`,
				`0x${"f".repeat(64)}`,
			];
			for (const id of validIds) {
				expect(isConditionId(id)).toBe(true);
			}
		});

		it("returns false for non-66-character strings", () => {
			const invalidIds = [
				"",
				"12345",
				"0x1234567890abcdef",
				`0x${"a".repeat(42)}`,
				`0x${"f".repeat(100)}`,
			];
			for (const id of invalidIds) {
				expect(isConditionId(id)).toBe(false);
			}
		});
	});

	describe("isMarketId type guard", () => {
		it("returns true for valid hex or slug formats", () => {
			const validIds = [
				`0x${"a".repeat(42)}`,
				"bitcoin-price-2025",
				"will-trump-win-2024",
				"crypto_market_2025",
			];
			for (const id of validIds) {
				expect(isMarketId(id)).toBe(true);
			}
		});

		it("returns false for invalid formats", () => {
			const invalidIds = [
				"",
				"invalid slug with spaces",
				"Invalid-Uppercase",
				"0x123",
				`0x${"a".repeat(100)}`,
			];
			for (const id of invalidIds) {
				expect(isMarketId(id)).toBe(false);
			}
		});
	});
});
