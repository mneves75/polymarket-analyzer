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

	// Regression test: snake_case clob_token_ids field must be recognized
	// This tests the fix for the copy-paste bug where clobTokenIds was checked twice
	// instead of checking both clobTokenIds and clob_token_ids
	it("extracts token IDs from snake_case clob_token_ids field (regression)", () => {
		const marketWithSnakeCase = {
			conditionId: "COND3",
			clob_token_ids: ["TOKEN_A", "TOKEN_B"],
			question: "Snake case test?",
		};
		const normalized = normalizeMarket(marketWithSnakeCase, undefined);
		expect(normalized?.clobTokenIds).toEqual(["TOKEN_A", "TOKEN_B"]);
	});

	// Regression test: camelCase should take precedence when both exist
	it("prefers camelCase clobTokenIds over snake_case when both present", () => {
		const marketWithBoth = {
			conditionId: "COND4",
			clobTokenIds: ["CAMEL_A", "CAMEL_B"],
			clob_token_ids: ["SNAKE_A", "SNAKE_B"],
			question: "Precedence test?",
		};
		const normalized = normalizeMarket(marketWithBoth, undefined);
		// camelCase should win
		expect(normalized?.clobTokenIds).toEqual(["CAMEL_A", "CAMEL_B"]);
	});
});
