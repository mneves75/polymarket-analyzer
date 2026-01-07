import { describe, expect, test } from "bun:test";
import {
	asciiChart,
	asciiSparkline,
	formatNumber,
	formatPct,
	formatPrice,
	formatTimeRemaining,
	getUserLocale,
	midpointFrom,
} from "./utils";

describe("formatPct", () => {
	test("formats percentage", () => {
		expect(formatPct(0.5)).toBe("50.0%");
		expect(formatPct(0.123)).toBe("12.3%");
	});

	test("returns dash for undefined", () => {
		expect(formatPct(undefined)).toBe("-");
	});
});

describe("formatPrice", () => {
	test("formats price to 4 decimals", () => {
		expect(formatPrice(0.5)).toBe("0.5000");
		expect(formatPrice(0.12345)).toBe("0.1235");
	});

	test("returns dash for undefined", () => {
		expect(formatPrice(undefined)).toBe("-");
	});
});

describe("formatNumber", () => {
	test("formats millions", () => {
		expect(formatNumber(1500000)).toBe("1.5m");
	});

	test("formats thousands", () => {
		expect(formatNumber(1500)).toBe("1.5k");
	});

	test("formats small numbers", () => {
		expect(formatNumber(99.5)).toBe("99.50");
	});

	test("returns dash for undefined", () => {
		expect(formatNumber(undefined)).toBe("-");
	});
});

describe("midpointFrom", () => {
	test("calculates midpoint", () => {
		expect(midpointFrom(0.4, 0.6)).toBe(0.5);
	});

	test("returns undefined if bid undefined", () => {
		expect(midpointFrom(undefined, 0.6)).toBeUndefined();
	});

	test("returns undefined if ask undefined", () => {
		expect(midpointFrom(0.4, undefined)).toBeUndefined();
	});
});

describe("asciiSparkline", () => {
	test("returns no data for empty series", () => {
		expect(asciiSparkline([])).toBe("(no data)");
	});

	test("generates sparkline characters", () => {
		const series = [0.1, 0.5, 0.9, 0.3, 0.7];
		const result = asciiSparkline(series, 10);
		expect(result.length).toBe(5);
		expect(result).toMatch(/^[.:\-=+*#%@]+$/);
	});

	test("handles constant values", () => {
		const series = [0.5, 0.5, 0.5];
		const result = asciiSparkline(series);
		expect(result).toBe("...");
	});
});

describe("asciiChart", () => {
	test("returns no data for empty series", () => {
		const result = asciiChart([]);
		expect(result).toEqual(["(no data)"]);
	});

	test("generates multi-line chart", () => {
		const series = [0.3, 0.5, 0.7, 0.4, 0.6];
		const result = asciiChart(series, 50, 4);
		expect(result.length).toBe(5); // 4 rows + axis
		expect(result[result.length - 1]).toContain("└"); // bottom axis
	});

	test("includes price labels", () => {
		const series = [0.3, 0.5, 0.7];
		const result = asciiChart(series, 50, 4);
		const topLine = result[0];
		const bottomLine = result[result.length - 2]; // before axis
		expect(topLine).toContain("0.7000"); // max value
		expect(bottomLine).toContain("0.3000"); // min value
	});

	test("uses block characters", () => {
		const series = [0.2, 0.8, 0.5];
		const result = asciiChart(series, 50, 4);
		const chartContent = result.join("");
		expect(chartContent).toMatch(/[▁▂▃▄▅▆▇█ ]/);
	});

	test("respects width parameter", () => {
		const series = Array(100)
			.fill(0)
			.map((_, i) => i / 100);
		const result = asciiChart(series, 20, 4);
		// Each line should have limited width based on sliced data
		const dataLine = result[0]?.split("│")[1];
		expect(dataLine?.length).toBeLessThanOrEqual(20);
	});

	test("shows message for insufficient data (1-2 points)", () => {
		const single = asciiChart([0.5], 50, 4);
		expect(single.length).toBe(1);
		expect(single[0]).toContain("insufficient for chart");
		expect(single[0]).toContain("0.5000");
		expect(single[0]).toContain("1 point");

		const double = asciiChart([0.4, 0.6], 50, 4);
		expect(double.length).toBe(1);
		expect(double[0]).toContain("2 points");
	});

	test("handles constant values with flat line", () => {
		const series = [0.5, 0.5, 0.5, 0.5, 0.5];
		const result = asciiChart(series, 50, 6);
		const chartContent = result.join("\n");
		// Should show flat horizontal line
		expect(chartContent).toContain("─────");
		// Should show price label
		expect(chartContent).toContain("0.5000");
		// Should indicate stable price
		expect(chartContent).toContain("stable price");
	});
});

describe("formatTimeRemaining", () => {
	test("returns null for past dates", () => {
		const pastDate = new Date(Date.now() - 1000);
		expect(formatTimeRemaining(pastDate)).toBeNull();
	});

	test("returns null for invalid date strings", () => {
		expect(formatTimeRemaining("invalid-date")).toBeNull();
	});

	test("formats days and hours for long durations", () => {
		const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000); // 2 days 5 hours
		const result = formatTimeRemaining(future);
		expect(result).toMatch(/^2d 5h left$/);
	});

	test("formats hours and minutes for medium durations", () => {
		const future = new Date(Date.now() + 3 * 60 * 60 * 1000 + 45 * 60 * 1000); // 3 hours 45 minutes
		const result = formatTimeRemaining(future);
		expect(result).toMatch(/^3h 4[45]m left$/); // Allow 44-45 due to timing
	});

	test("formats minutes and seconds for short durations", () => {
		const future = new Date(Date.now() + 5 * 60 * 1000 + 30 * 1000); // 5 minutes 30 seconds
		const result = formatTimeRemaining(future);
		expect(result).toMatch(/^5m \d+s left$/);
	});

	test("formats seconds for very short durations", () => {
		const future = new Date(Date.now() + 45 * 1000); // 45 seconds
		const result = formatTimeRemaining(future);
		expect(result).toMatch(/^\d+s left$/);
	});

	test("accepts ISO date strings", () => {
		const future = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
		const result = formatTimeRemaining(future.toISOString());
		expect(result).toMatch(/^(0h 59m|1h 0m) left$/);
	});
});

describe("getUserLocale", () => {
	const originalEnv = { ...process.env };

	test("returns undefined when no locale env vars set", () => {
		delete process.env.LC_ALL;
		delete process.env.LC_TIME;
		delete process.env.LANG;
		expect(getUserLocale()).toBeUndefined();
	});

	test("parses pt_BR.UTF-8 format", () => {
		process.env.LANG = "pt_BR.UTF-8";
		delete process.env.LC_ALL;
		delete process.env.LC_TIME;
		expect(getUserLocale()).toBe("pt-BR");
	});

	test("parses en-US format", () => {
		process.env.LANG = "en-US";
		delete process.env.LC_ALL;
		delete process.env.LC_TIME;
		expect(getUserLocale()).toBe("en-US");
	});

	test("LC_ALL takes precedence over LANG", () => {
		process.env.LANG = "en_US.UTF-8";
		process.env.LC_ALL = "pt_BR.UTF-8";
		delete process.env.LC_TIME;
		expect(getUserLocale()).toBe("pt-BR");
	});

	test("LC_TIME takes precedence over LANG but not LC_ALL", () => {
		process.env.LANG = "en_US.UTF-8";
		process.env.LC_TIME = "de_DE.UTF-8";
		delete process.env.LC_ALL;
		expect(getUserLocale()).toBe("de-DE");
	});

	test("returns simple locale for short format", () => {
		process.env.LANG = "pt";
		delete process.env.LC_ALL;
		delete process.env.LC_TIME;
		expect(getUserLocale()).toBe("pt");
	});

	// Restore original env after all tests
	test("cleanup", () => {
		Object.assign(process.env, originalEnv);
		expect(true).toBe(true);
	});
});
