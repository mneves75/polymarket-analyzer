import { describe, expect, it } from "bun:test";
import { midpointFrom } from "../src/utils";

describe("utils", () => {
	it("calculates midpoint from bid/ask", () => {
		expect(midpointFrom(0.4, 0.6)).toBeCloseTo(0.5);
	});

	it("returns undefined when missing bid or ask", () => {
		expect(midpointFrom(undefined, 0.6)).toBeUndefined();
		expect(midpointFrom(0.4, undefined)).toBeUndefined();
	});
});
