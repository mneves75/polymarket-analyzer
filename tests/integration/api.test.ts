/**
 * Integration tests for Polymarket API client.
 *
 * These tests make real HTTP calls to the Polymarket API.
 * They are meant to verify that the client works with the actual API.
 *
 * Note: These tests may be flaky if the API is down or rate limiting is applied.
 */

import { describe, expect, it } from "bun:test";
import {
	fetchMarketByConditionId,
	fetchMarkets,
	getOrderbook,
	getPrices,
} from "../../src/api";

describe("API Integration Tests", () => {
	describe("fetchMarkets", () => {
		it("fetches recent markets from the API", async () => {
			const markets = await fetchMarkets({ limit: 5 });

			expect(Array.isArray(markets)).toBe(true);
			expect(markets.length).toBeGreaterThan(0);
			expect(markets.length).toBeLessThanOrEqual(5);
		});

		it("includes required fields in market data", async () => {
			const markets = await fetchMarkets({ limit: 1 });

			expect(markets.length).toBeGreaterThanOrEqual(1);

			const market = markets[0];
			expect(market).toBeDefined();
			expect(market?.conditionId).toBeDefined();
			expect(market?.question).toBeDefined();
		});

		it("filters by market slug when provided", async () => {
			// First get a list of markets to find a valid slug
			const allMarkets = await fetchMarkets({ limit: 20 });
			const firstMarket = allMarkets[0];

			if (!firstMarket?.slug) {
				console.warn("No market with slug found, skipping slug filter test");
				return;
			}

			const filtered = await fetchMarkets({
				slug: firstMarket.slug,
				limit: 10,
			});

			expect(filtered.length).toBeGreaterThanOrEqual(1);
			expect(filtered[0]?.slug).toBe(firstMarket.slug);
		});
	});

	describe("fetchMarketByConditionId", () => {
		it("fetches a specific market by condition ID", async () => {
			// First get a list to find a valid condition ID
			const markets = await fetchMarkets({ limit: 1 });
			const firstMarket = markets[0];

			if (!firstMarket?.conditionId) {
				console.warn("No market with conditionId found, skipping test");
				return;
			}

			const market = await fetchMarketByConditionId(firstMarket.conditionId);

			expect(market).toBeDefined();
			expect(market?.conditionId).toBe(firstMarket.conditionId);
		});

		it("returns null for invalid condition ID", async () => {
			const market = await fetchMarketByConditionId(
				"0xinvalidconditionid1234567890123456789012345678901234567890123456789012345678",
			);

			expect(market).toBeNull();
		});
	});

	describe("getPrices", () => {
		it("fetches current prices for token IDs", async () => {
			// Get valid token IDs from markets
			const markets = await fetchMarkets({ limit: 5 });
			const marketWithToken = markets.find(
				(m) => m.clobTokenIds && m.clobTokenIds.length > 0,
			);

			if (!marketWithToken?.clobTokenIds?.[0]) {
				console.warn("No market with token ID found, skipping price test");
				return;
			}

			const prices = await getPrices([marketWithToken.clobTokenIds[0]]);

			// Prices should be returned
			expect(prices).toBeDefined();
		});

		it("handles multiple token IDs", async () => {
			const markets = await fetchMarkets({ limit: 10 });
			const tokens = markets
				.filter((m) => m.clobTokenIds && m.clobTokenIds.length > 0)
				.map((m) => m.clobTokenIds?.[0])
				.slice(0, 3);

			if (tokens.length === 0) {
				console.warn("No token IDs found, skipping test");
				return;
			}

			const prices = await getPrices(tokens);
			expect(prices).toBeDefined();
		});
	});

	describe("getOrderbook", () => {
		it("fetches orderbook for a token ID", async () => {
			// Get a valid token ID from markets
			const markets = await fetchMarkets({ limit: 10 });
			const marketWithToken = markets.find(
				(m) => m.clobTokenIds && m.clobTokenIds.length > 0,
			);

			if (!marketWithToken?.clobTokenIds?.[0]) {
				console.warn("No market with token ID found, skipping orderbook test");
				return;
			}

			const orderbook = await getOrderbook(marketWithToken.clobTokenIds[0]);

			expect(orderbook).toBeDefined();
		});

		it("handles invalid token ID gracefully", async () => {
			// Should not throw, just return empty or error response
			const orderbook = await getOrderbook(
				"0xinvalidtokenid1234567890123456789012345678901234567890123456789012345678",
			);

			expect(orderbook).toBeDefined();
		});
	});

	describe("rate limiting", () => {
		it("respects rate limits when making multiple requests", async () => {
			const requests = Array.from({ length: 5 }, () =>
				fetchMarkets({ limit: 1 }),
			);

			const results = await Promise.allSettled(requests);
			const successful = results.filter((r) => r.status === "fulfilled");

			// At least some requests should succeed even with rate limiting
			expect(successful.length).toBeGreaterThan(0);
		}, 10000); // 10 second timeout for rate limit test
	});
});
