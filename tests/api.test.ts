import { describe, expect, it } from "bun:test";
import { normalizeMarket } from "../src/api";

const market = {
	conditionId: "COND1",
	clobTokenIds: ["T1", "T2"],
	question: "Will it rain?",
};

describe("normalizeMarket", () => {
	it("defaults outcomes when missing", () => {
		const normalized = normalizeMarket(market, undefined);
		expect(normalized?.outcomes).toEqual(["YES", "NO"]);
	});

	it("parses outcomes and clobTokenIds from json strings", () => {
		const marketWithStrings = {
			conditionId: "COND2",
			clobTokenIds: '["A","B"]',
			outcomes: '["Yes","No"]',
		};
		const normalized = normalizeMarket(marketWithStrings, undefined);
		expect(normalized?.clobTokenIds).toEqual(["A", "B"]);
		expect(normalized?.outcomes).toEqual(["Yes", "No"]);
	});
});
