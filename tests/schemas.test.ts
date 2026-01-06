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
