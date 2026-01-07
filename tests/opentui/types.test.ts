/**
 * Unit tests for OpenTUI Types
 */

import { describe, expect, it } from "bun:test";
import type { MarketInfo } from "../../src/api";
import {
  type DashboardState,
  createDefaultState,
  getCurrentTokenId,
  getFocusedMarket,
  validateDashboardOptions,
} from "../../src/opentui/types";

// Create mock market data
function createMockMarket(id: string, question: string): MarketInfo {
  return {
    id,
    question,
    slug: id,
    conditionId: `cond-${id}`,
    volume: "1000000",
    liquidity: "500000",
    volume24hr: 50000,
    bestBid: 0.5,
    bestAsk: 0.55,
    lastPrice: 0.52,
    liquidityClob: 500000,
    clobTokenIds: [`token-${id}-yes`, `token-${id}-no`],
    outcomes: ["Yes", "No"],
    outcomePrices: ["0.52", "0.48"],
    active: true,
    closed: false,
    acceptingOrders: true,
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    description: `Description for ${question}`,
    image: "",
    icon: "",
    tags: [],
    spread: 0.05,
    oneDayPriceChange: 0.02,
    negRisk: false,
  };
}

describe("createDefaultState", () => {
  it("creates valid initial state", () => {
    const state = createDefaultState();

    // Market data
    expect(state.radar).toEqual([]);
    expect(state.focusIndex).toBe(0);
    expect(state.outcomeIndex).toBe(0);
    expect(state.orderbook).toBe(null);
    expect(state.orderbookMap).toBeInstanceOf(Map);
    expect(state.historySeries).toEqual([]);

    // Pricing
    expect(state.bestBid).toBeUndefined();
    expect(state.bestAsk).toBeUndefined();
    expect(state.midpoint).toBeUndefined();
    expect(state.lastTrade).toBeUndefined();
    expect(state.lastTradePrev).toBeUndefined();

    // Status
    expect(state.wsStatus).toBe("off");
    expect(state.noOrderbook).toBe(false);
    expect(state.noOrderbookTokens).toBeInstanceOf(Set);
    expect(state.autoSkipNoOrderbook).toBe(false);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);

    // Timing
    expect(state.lastWsAt).toBe(0);
    expect(state.lastRestAt).toBe(0);
    expect(state.lastHistoryAt).toBe(0);
    expect(state.lastHoldersAt).toBe(0);
    expect(state.lastReconcileAt).toBe(0);
    expect(state.lastNoOrderbookAt).toBe(0);

    // Alerts
    expect(state.lastAlert).toBe("");
    expect(state.priceAlertHigh).toBe(null);
    expect(state.priceAlertLow).toBe(null);

    // Filter
    expect(state.radarFilter).toBe("");

    // Stats
    expect(state.msgCount).toBe(0);
    expect(state.msgRate).toBe(0);

    // UI state (CRITICAL for modals)
    expect(state.showDetail).toBe(false);
    expect(state.showHelp).toBe(false);
  });

  it("creates independent state objects", () => {
    const state1 = createDefaultState();
    const state2 = createDefaultState();

    expect(state1).not.toBe(state2);
    expect(state1.radar).not.toBe(state2.radar);
    expect(state1.orderbookMap).not.toBe(state2.orderbookMap);
    expect(state1.noOrderbookTokens).not.toBe(state2.noOrderbookTokens);
  });
});

describe("getFocusedMarket", () => {
  it("returns null for empty radar", () => {
    const state = createDefaultState();

    expect(getFocusedMarket(state)).toBe(null);
  });

  it("returns first market when focusIndex is 0", () => {
    const state = createDefaultState();
    state.radar = [
      createMockMarket("1", "Market 1"),
      createMockMarket("2", "Market 2"),
    ];
    state.focusIndex = 0;

    const market = getFocusedMarket(state);
    expect(market?.question).toBe("Market 1");
  });

  it("returns correct market for focusIndex", () => {
    const state = createDefaultState();
    state.radar = [
      createMockMarket("1", "Market 1"),
      createMockMarket("2", "Market 2"),
      createMockMarket("3", "Market 3"),
    ];
    state.focusIndex = 1;

    const market = getFocusedMarket(state);
    expect(market?.question).toBe("Market 2");
  });

  it("clamps focusIndex to valid range", () => {
    const state = createDefaultState();
    state.radar = [
      createMockMarket("1", "Market 1"),
      createMockMarket("2", "Market 2"),
    ];
    state.focusIndex = 10; // Out of bounds

    const market = getFocusedMarket(state);
    // Should return last valid market
    expect(market?.question).toBe("Market 2");
  });
});

describe("getCurrentTokenId", () => {
  it("returns null for empty radar", () => {
    const state = createDefaultState();

    expect(getCurrentTokenId(state)).toBe(null);
  });

  it("returns first outcome token by default", () => {
    const state = createDefaultState();
    state.radar = [createMockMarket("1", "Market 1")];
    state.focusIndex = 0;
    state.outcomeIndex = 0;

    const tokenId = getCurrentTokenId(state);
    expect(tokenId).toBe("token-1-yes");
  });

  it("returns second outcome token when outcomeIndex is 1", () => {
    const state = createDefaultState();
    state.radar = [createMockMarket("1", "Market 1")];
    state.focusIndex = 0;
    state.outcomeIndex = 1;

    const tokenId = getCurrentTokenId(state);
    expect(tokenId).toBe("token-1-no");
  });

  it("returns correct token for non-zero focusIndex", () => {
    const state = createDefaultState();
    state.radar = [
      createMockMarket("1", "Market 1"),
      createMockMarket("2", "Market 2"),
    ];
    state.focusIndex = 1;
    state.outcomeIndex = 0;

    const tokenId = getCurrentTokenId(state);
    expect(tokenId).toBe("token-2-yes");
  });

  it("falls back to first token if outcomeIndex is invalid", () => {
    const state = createDefaultState();
    const market = createMockMarket("1", "Market 1");
    state.radar = [market];
    state.focusIndex = 0;
    state.outcomeIndex = 5; // Invalid

    const tokenId = getCurrentTokenId(state);
    // Should fall back to first token
    expect(tokenId).toBe("token-1-yes");
  });
});

describe("validateDashboardOptions", () => {
  it("uses defaults for missing options", () => {
    const result = validateDashboardOptions({});

    expect(result.limit).toBe(50);
    expect(result.intervalMs).toBe(1000);
    expect(result.ws).toBe(true);
  });

  it("preserves provided values", () => {
    const result = validateDashboardOptions({
      limit: 100,
      slug: "test-slug",
      market: "test-market",
      intervalMs: 2000,
      ws: false,
    });

    expect(result.limit).toBe(100);
    expect(result.slug).toBe("test-slug");
    expect(result.market).toBe("test-market");
    expect(result.intervalMs).toBe(2000);
    expect(result.ws).toBe(false);
  });

  it("throws on invalid limit", () => {
    expect(() => validateDashboardOptions({ limit: 0 })).toThrow("Invalid limit");
    expect(() => validateDashboardOptions({ limit: -1 })).toThrow("Invalid limit");
    expect(() => validateDashboardOptions({ limit: 1001 })).toThrow("Invalid limit");
  });

  it("throws on invalid intervalMs", () => {
    expect(() => validateDashboardOptions({ intervalMs: 50 })).toThrow("Invalid intervalMs");
    expect(() => validateDashboardOptions({ intervalMs: 100000 })).toThrow("Invalid intervalMs");
  });

  it("accepts boundary values", () => {
    const minLimit = validateDashboardOptions({ limit: 1 });
    expect(minLimit.limit).toBe(1);

    const maxLimit = validateDashboardOptions({ limit: 1000 });
    expect(maxLimit.limit).toBe(1000);

    const minInterval = validateDashboardOptions({ intervalMs: 100 });
    expect(minInterval.intervalMs).toBe(100);

    const maxInterval = validateDashboardOptions({ intervalMs: 60000 });
    expect(maxInterval.intervalMs).toBe(60000);
  });
});
