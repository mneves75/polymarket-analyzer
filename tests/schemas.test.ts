import { describe, expect, it } from "bun:test";
import {
	ConditionIdSchema,
	GammaMarketSchema,
	OrderbookStateSchema,
	TokenIdSchema,
	validateWithSchema,
} from "../src/schemas";

describe("Zod Schemas", () => {
	describe("TokenIdSchema", () => {
		it("accepts valid token IDs", () => {
			const valid = ["0x1234567890abcdef", `0x${"a".repeat(64)}`];
			for (const id of valid) {
				const result = TokenIdSchema.safeParse(id);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid token IDs", () => {
			const invalid = [
				"no-prefix",
				"0x",
				"0x123",
				" 0xaaa",
				"0xaaa ",
				`0x${"a".repeat(100)}`,
			];
			for (const id of invalid) {
				const result = TokenIdSchema.safeParse(id);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("ConditionIdSchema", () => {
		it("accepts valid 66-character condition IDs", () => {
			const valid = [`0x${"0".repeat(64)}`, `0x${"f".repeat(64)}`];
			for (const id of valid) {
				const result = ConditionIdSchema.safeParse(id);
				expect(result.success).toBe(true);
			}
		});

		it("rejects invalid condition IDs", () => {
			const invalid = [
				"0x1234567890abcdef",
				`0x${"a".repeat(42)}`,
				`0x${"a".repeat(100)}`,
			];
			for (const id of invalid) {
				const result = ConditionIdSchema.safeParse(id);
				expect(result.success).toBe(false);
			}
		});
	});

	describe("OrderbookStateSchema", () => {
		it("accepts valid orderbook state", () => {
			const validOrderbook = {
				bids: [{ price: 0.5, size: 100 }],
				asks: [{ price: 0.6, size: 50 }],
				tickSize: 0.01,
			};
			const result = OrderbookStateSchema.safeParse(validOrderbook);
			expect(result.success).toBe(true);
		});

		it("rejects invalid orderbook state", () => {
			const invalidOrderbook = {
				bids: "not an array",
				asks: [],
			};
			const result = OrderbookStateSchema.safeParse(invalidOrderbook);
			expect(result.success).toBe(false);
		});
	});

	describe("GammaMarketSchema", () => {
		it("accepts valid market data", () => {
			const validMarket = {
				conditionId: `0x${"0".repeat(64)}`,
				question: "Will it rain?",
				outcomes: ["YES", "NO"],
				clobTokenIds: [`0x${"a".repeat(64)}`],
			};
			const result = GammaMarketSchema.safeParse(validMarket);
			expect(result.success).toBe(true);
		});

		it("rejects market with invalid condition ID", () => {
			const invalidMarket = {
				conditionId: "not-a-valid-id",
				question: "Will it rain?",
				clobTokenIds: [`0x${"a".repeat(64)}`],
			};
			const result = GammaMarketSchema.safeParse(invalidMarket);
			expect(result.success).toBe(false);
		});

		// Regression test: passthrough() allows extra API fields without validation failure
		it("allows extra fields via passthrough (regression: extra API fields)", () => {
			const marketWithExtraFields = {
				conditionId: `0x${"0".repeat(64)}`,
				question: "Will it rain?",
				// Extra fields that the API might return but aren't in our schema
				extraApiField: "some value",
				newFieldFromApiUpdate: 123,
				nestedExtra: { key: "value" },
			};
			const result = GammaMarketSchema.safeParse(marketWithExtraFields);
			expect(result.success).toBe(true);
			// Verify extra fields are preserved in output
			if (result.success) {
				expect((result.data as Record<string, unknown>).extraApiField).toBe(
					"some value",
				);
			}
		});

		// Regression test: nested tokens also allow extra fields
		it("allows extra fields in nested tokens array (regression)", () => {
			const marketWithNestedExtras = {
				conditionId: `0x${"0".repeat(64)}`,
				question: "Test market",
				tokens: [
					{
						tokenId: `0x${"b".repeat(64)}`,
						outcome: "YES",
						// Extra field in token object
						price: 0.65,
						winner: false,
					},
				],
			};
			const result = GammaMarketSchema.safeParse(marketWithNestedExtras);
			expect(result.success).toBe(true);
			// Verify nested extra fields are preserved
			if (result.success && result.data.tokens) {
				const token = result.data.tokens[0] as Record<string, unknown>;
				expect(token.price).toBe(0.65);
			}
		});
	});

	describe("validateWithSchema", () => {
		it("returns validated data for valid input", () => {
			const data = {
				bids: [{ price: 0.5, size: 100 }],
				asks: [{ price: 0.6, size: 50 }],
			};
			const result = validateWithSchema(
				OrderbookStateSchema,
				data,
				"test orderbook",
			);
			expect(result.bids.length).toBe(1);
			expect(result.bids[0]?.price).toBe(0.5);
		});

		it("throws detailed error for invalid input", () => {
			const data = {
				bids: "not an array",
				asks: [],
			};
			expect(() =>
				validateWithSchema(OrderbookStateSchema, data, "test orderbook"),
			).toThrow("Validation failed");
		});
	});
});
