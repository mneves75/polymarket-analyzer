import { describe, expect, it } from "bun:test";
import { extractHistory, normalizeOrderbook } from "../src/parsers";

const book = {
	bids: [
		["0.4", "100"],
		["0.39", "50"],
	],
	asks: [["0.41", "120"]],
	min_order_size: "1",
	tick_size: "0.01",
	neg_risk: false,
};

describe("parsers", () => {
	it("normalizes orderbook", () => {
		const ob = normalizeOrderbook(book);
		expect(ob.bids.length).toBe(2);
		expect(ob.asks.length).toBe(1);
		expect(ob.tickSize).toBeCloseTo(0.01);
	});

	it("extracts history points", () => {
		const history = { history: [{ p: "0.1" }, { p: "0.2" }] };
		const series = extractHistory(history);
		expect(series).toEqual([0.1, 0.2]);
	});
});
