/**
 * Unit tests for OpenTUI StateManager
 */

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { MarketInfo } from "../../src/api";
import { DataError } from "../../src/opentui/errors";
import { stateManager } from "../../src/opentui/state/state-manager";

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
		// New fields for v2 API
		spread: 0.05,
		oneDayPriceChange: 0.02,
		negRisk: false,
	};
}

describe("StateManager", () => {
	beforeEach(() => {
		stateManager.reset();
	});

	afterEach(() => {
		stateManager.removeAllListeners();
	});

	describe("initial state", () => {
		it("has correct default values", () => {
			const state = stateManager.get();

			expect(state.radar).toEqual([]);
			expect(state.focusIndex).toBe(0);
			expect(state.outcomeIndex).toBe(0);
			expect(state.orderbook).toBe(null);
			expect(state.wsStatus).toBe("off");
			expect(state.showDetail).toBe(false);
			expect(state.showHelp).toBe(false);
			expect(state.isLoading).toBe(false);
			expect(state.error).toBe(null);
		});
	});

	describe("radar management", () => {
		it("setRadar updates markets list", () => {
			const markets = [
				createMockMarket("1", "Market 1"),
				createMockMarket("2", "Market 2"),
			];

			stateManager.setRadar(markets);

			expect(stateManager.get().radar).toHaveLength(2);
			expect(stateManager.get().radar[0].question).toBe("Market 1");
		});

		it("setRadar throws on invalid input", () => {
			expect(() =>
				stateManager.setRadar(null as unknown as MarketInfo[]),
			).toThrow(DataError);
			expect(() =>
				stateManager.setRadar("invalid" as unknown as MarketInfo[]),
			).toThrow(DataError);
		});

		it("emits change event on setRadar", () => {
			const changeHandler = mock(() => {});
			stateManager.on("change", changeHandler);

			const markets = [createMockMarket("1", "Market 1")];
			stateManager.setRadar(markets);

			expect(changeHandler).toHaveBeenCalled();
			const event = changeHandler.mock.calls[0][0] as { type: string };
			expect(event.type).toBe("radar");
		});
	});

	describe("focus management", () => {
		beforeEach(() => {
			const markets = [
				createMockMarket("1", "Market 1"),
				createMockMarket("2", "Market 2"),
				createMockMarket("3", "Market 3"),
			];
			stateManager.setRadar(markets);
		});

		it("setFocusIndex updates index", () => {
			stateManager.setFocusIndex(1);
			expect(stateManager.get().focusIndex).toBe(1);
		});

		it("setFocusIndex throws on negative index", () => {
			expect(() => stateManager.setFocusIndex(-1)).toThrow(DataError);
		});

		it("setFocusIndex throws on out of bounds index", () => {
			expect(() => stateManager.setFocusIndex(10)).toThrow(DataError);
		});

		it("nextMarket advances focus", () => {
			expect(stateManager.get().focusIndex).toBe(0);

			const moved = stateManager.nextMarket();
			expect(moved).toBe(true);
			expect(stateManager.get().focusIndex).toBe(1);
		});

		it("nextMarket returns false at end", () => {
			stateManager.setFocusIndex(2);

			const moved = stateManager.nextMarket();
			expect(moved).toBe(false);
			expect(stateManager.get().focusIndex).toBe(2);
		});

		it("previousMarket moves focus back", () => {
			stateManager.setFocusIndex(2);

			const moved = stateManager.previousMarket();
			expect(moved).toBe(true);
			expect(stateManager.get().focusIndex).toBe(1);
		});

		it("previousMarket returns false at start", () => {
			const moved = stateManager.previousMarket();
			expect(moved).toBe(false);
			expect(stateManager.get().focusIndex).toBe(0);
		});

		it("getFocusedMarket returns correct market", () => {
			stateManager.setFocusIndex(1);

			const market = stateManager.getFocusedMarket();
			expect(market?.question).toBe("Market 2");
		});

		it("getFocusedMarket returns null for empty radar", () => {
			stateManager.reset();
			expect(stateManager.getFocusedMarket()).toBe(null);
		});
	});

	describe("outcome management", () => {
		it("setOutcomeIndex updates outcome", () => {
			stateManager.setOutcomeIndex(1);
			expect(stateManager.get().outcomeIndex).toBe(1);
		});

		it("setOutcomeIndex throws on invalid index", () => {
			expect(() => stateManager.setOutcomeIndex(2)).toThrow(DataError);
			expect(() => stateManager.setOutcomeIndex(-1)).toThrow(DataError);
		});

		it("toggleOutcome switches between 0 and 1", () => {
			expect(stateManager.get().outcomeIndex).toBe(0);

			stateManager.toggleOutcome();
			expect(stateManager.get().outcomeIndex).toBe(1);

			stateManager.toggleOutcome();
			expect(stateManager.get().outcomeIndex).toBe(0);
		});
	});

	describe("modal state", () => {
		it("setShowDetail updates detail modal state", () => {
			stateManager.setShowDetail(true);
			expect(stateManager.get().showDetail).toBe(true);

			stateManager.setShowDetail(false);
			expect(stateManager.get().showDetail).toBe(false);
		});

		it("toggleDetail toggles detail modal", () => {
			expect(stateManager.get().showDetail).toBe(false);

			stateManager.toggleDetail();
			expect(stateManager.get().showDetail).toBe(true);

			stateManager.toggleDetail();
			expect(stateManager.get().showDetail).toBe(false);
		});

		it("setShowHelp updates help modal state", () => {
			stateManager.setShowHelp(true);
			expect(stateManager.get().showHelp).toBe(true);

			stateManager.setShowHelp(false);
			expect(stateManager.get().showHelp).toBe(false);
		});

		it("toggleHelp toggles help modal", () => {
			expect(stateManager.get().showHelp).toBe(false);

			stateManager.toggleHelp();
			expect(stateManager.get().showHelp).toBe(true);

			stateManager.toggleHelp();
			expect(stateManager.get().showHelp).toBe(false);
		});

		it("closeAllModals closes both modals", () => {
			stateManager.setShowDetail(true);
			stateManager.setShowHelp(true);

			stateManager.closeAllModals();

			expect(stateManager.get().showDetail).toBe(false);
			expect(stateManager.get().showHelp).toBe(false);
		});
	});

	describe("pricing state", () => {
		it("setBestBid updates bid", () => {
			stateManager.setBestBid(0.55);
			expect(stateManager.get().bestBid).toBe(0.55);
		});

		it("setBestAsk updates ask", () => {
			stateManager.setBestAsk(0.6);
			expect(stateManager.get().bestAsk).toBe(0.6);
		});

		it("setMidpoint updates midpoint", () => {
			stateManager.setMidpoint(0.575);
			expect(stateManager.get().midpoint).toBe(0.575);
		});

		it("setLastTrade updates last trade and previous", () => {
			stateManager.setLastTrade(0.52);
			expect(stateManager.get().lastTrade).toBe(0.52);
			expect(stateManager.get().lastTradePrev).toBeUndefined();

			stateManager.setLastTrade(0.53);
			expect(stateManager.get().lastTrade).toBe(0.53);
			expect(stateManager.get().lastTradePrev).toBe(0.52);
		});
	});

	describe("status management", () => {
		it("setWsStatus updates WebSocket status", () => {
			stateManager.setWsStatus("connecting");
			expect(stateManager.get().wsStatus).toBe("connecting");

			stateManager.setWsStatus("connected");
			expect(stateManager.get().wsStatus).toBe("connected");
		});

		it("setLoading updates loading state", () => {
			stateManager.setLoading(true);
			expect(stateManager.get().isLoading).toBe(true);

			stateManager.setLoading(false);
			expect(stateManager.get().isLoading).toBe(false);
		});

		it("setError updates error state", () => {
			stateManager.setError("Test error");
			expect(stateManager.get().error).toBe("Test error");

			stateManager.setError(null);
			expect(stateManager.get().error).toBe(null);
		});
	});

	describe("alert management", () => {
		it("setLastAlert updates alert message", () => {
			stateManager.setLastAlert("Price crossed threshold");
			expect(stateManager.get().lastAlert).toBe("Price crossed threshold");
		});

		it("setPriceAlertHigh sets high alert threshold", () => {
			stateManager.setPriceAlertHigh(0.75);
			expect(stateManager.get().priceAlertHigh).toBe(0.75);
		});

		it("setPriceAlertLow sets low alert threshold", () => {
			stateManager.setPriceAlertLow(0.25);
			expect(stateManager.get().priceAlertLow).toBe(0.25);
		});

		it("clearPriceAlerts clears both thresholds", () => {
			stateManager.setPriceAlertHigh(0.75);
			stateManager.setPriceAlertLow(0.25);

			stateManager.clearPriceAlerts();

			expect(stateManager.get().priceAlertHigh).toBe(null);
			expect(stateManager.get().priceAlertLow).toBe(null);
		});
	});

	describe("filter management", () => {
		it("setRadarFilter updates filter", () => {
			stateManager.setRadarFilter("bitcoin");
			expect(stateManager.get().radarFilter).toBe("bitcoin");
		});
	});

	describe("stats management", () => {
		it("incrementMsgCount increases count", () => {
			expect(stateManager.get().msgCount).toBe(0);

			stateManager.incrementMsgCount();
			expect(stateManager.get().msgCount).toBe(1);

			stateManager.incrementMsgCount();
			expect(stateManager.get().msgCount).toBe(2);
		});

		it("updateMsgRate calculates rate and resets count", () => {
			stateManager.incrementMsgCount();
			stateManager.incrementMsgCount();
			stateManager.incrementMsgCount();

			stateManager.updateMsgRate();

			expect(stateManager.get().msgRate).toBe(3);
			expect(stateManager.get().msgCount).toBe(0);
		});
	});

	describe("timing updates", () => {
		it("updateLastWsAt updates timestamp", () => {
			const before = Date.now();
			stateManager.updateLastWsAt();
			const after = Date.now();

			const timestamp = stateManager.get().lastWsAt;
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});

		it("updateLastRestAt updates timestamp", () => {
			const before = Date.now();
			stateManager.updateLastRestAt();
			const after = Date.now();

			const timestamp = stateManager.get().lastRestAt;
			expect(timestamp).toBeGreaterThanOrEqual(before);
			expect(timestamp).toBeLessThanOrEqual(after);
		});
	});

	describe("reset", () => {
		it("reset returns to initial state", () => {
			const markets = [createMockMarket("1", "Market 1")];
			stateManager.setRadar(markets);
			stateManager.setFocusIndex(0);
			stateManager.setShowDetail(true);
			stateManager.setError("Test error");

			stateManager.reset();

			const state = stateManager.get();
			expect(state.radar).toEqual([]);
			expect(state.showDetail).toBe(false);
			expect(state.error).toBe(null);
		});
	});

	describe("event emission", () => {
		it("emits change events for state changes", () => {
			const events: Array<{ type: string }> = [];
			stateManager.on("change", (e) => events.push(e as { type: string }));

			stateManager.setLoading(true);
			stateManager.setError("Test");
			stateManager.setWsStatus("connected");

			expect(events).toHaveLength(3);
			expect(events[0].type).toBe("isLoading");
			expect(events[1].type).toBe("error");
			expect(events[2].type).toBe("wsStatus");
		});
	});
});
