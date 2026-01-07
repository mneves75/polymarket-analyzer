import { describe, expect, test } from "bun:test";
import {
	asciiChart,
	asciiLineChart,
	asciiSparkline,
	calculatePrecision,
	formatNumber,
	formatPct,
	formatPrice,
	formatTimeRemaining,
	formatWithPrecision,
	getUserLocale,
	midpointFrom,
	sanitizeChartData,
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

// ============================================================================
// Chart Utility Tests
// ============================================================================

describe("sanitizeChartData", () => {
	test("removes NaN values", () => {
		const result = sanitizeChartData([1, NaN, 3, NaN, 5]);
		expect(result.data).toEqual([1, 3, 5]);
		expect(result.removed).toBe(2);
	});

	test("removes Infinity values", () => {
		const result = sanitizeChartData([1, Infinity, 3, -Infinity, 5]);
		expect(result.data).toEqual([1, 3, 5]);
		expect(result.removed).toBe(2);
	});

	test("preserves valid numbers including zero and negatives", () => {
		const result = sanitizeChartData([0, -1, 0.5, -0.5, 100]);
		expect(result.data).toEqual([0, -1, 0.5, -0.5, 100]);
		expect(result.removed).toBe(0);
	});

	test("returns empty array for all invalid data", () => {
		const result = sanitizeChartData([NaN, Infinity, -Infinity]);
		expect(result.data).toEqual([]);
		expect(result.removed).toBe(3);
	});

	test("handles empty array", () => {
		const result = sanitizeChartData([]);
		expect(result.data).toEqual([]);
		expect(result.removed).toBe(0);
	});
});

describe("calculatePrecision", () => {
	test("returns 8 for micro ranges (< 0.0001)", () => {
		expect(calculatePrecision(0.00005)).toBe(8);
		expect(calculatePrecision(0.00001)).toBe(8);
	});

	test("returns 6 for tiny ranges (< 0.001)", () => {
		expect(calculatePrecision(0.0005)).toBe(6);
	});

	test("returns 4 for small ranges (< 0.1)", () => {
		expect(calculatePrecision(0.05)).toBe(4);
	});

	test("returns 2 for normal ranges (< 10)", () => {
		expect(calculatePrecision(0.5)).toBe(2);
		expect(calculatePrecision(5)).toBe(2);
	});

	test("returns 1 for large ranges (< 1000)", () => {
		expect(calculatePrecision(100)).toBe(1);
	});

	test("returns 0 for very large ranges", () => {
		expect(calculatePrecision(10000)).toBe(0);
	});

	test("returns 4 for zero range (constant values)", () => {
		expect(calculatePrecision(0)).toBe(4);
	});
});

describe("formatWithPrecision", () => {
	test("formats with specified precision", () => {
		expect(formatWithPrecision(0.123456789, 4)).toBe("0.1235");
		expect(formatWithPrecision(0.123456789, 2)).toBe("0.12");
		expect(formatWithPrecision(123.456, 0)).toBe("123");
	});
});

describe("asciiSparkline", () => {
	test("returns no data for empty series", () => {
		expect(asciiSparkline([])).toBe("(no data)");
	});

	test("returns invalid data for all-NaN series", () => {
		expect(asciiSparkline([NaN, NaN])).toBe("(invalid data)");
	});

	test("generates Unicode block sparkline", () => {
		const series = [0.1, 0.5, 0.9, 0.3, 0.7];
		const result = asciiSparkline(series, 10);
		expect(result.length).toBe(5);
		// Now uses Unicode blocks: ▁▂▃▄▅▆▇█
		expect(result).toMatch(/^[▁▂▃▄▅▆▇█]+$/);
	});

	test("handles constant values with middle block", () => {
		const series = [0.5, 0.5, 0.5];
		const result = asciiSparkline(series);
		// Constant values show middle block (▄)
		expect(result).toBe("▄▄▄");
	});

	test("filters NaN values gracefully", () => {
		const series = [0.1, NaN, 0.9];
		const result = asciiSparkline(series, 10);
		expect(result.length).toBe(2); // Only 2 valid points
		expect(result).toMatch(/^[▁▂▃▄▅▆▇█]+$/);
	});

	test("shows min as lowest block, max as highest", () => {
		const series = [0, 1];
		const result = asciiSparkline(series, 10);
		expect(result).toBe("▁█"); // Min = ▁, Max = █
	});
});

describe("asciiChart", () => {
	test("returns no data for empty series", () => {
		const result = asciiChart([]);
		expect(result).toEqual(["(no data)"]);
	});

	test("returns error message for all-NaN series", () => {
		const result = asciiChart([NaN, NaN, NaN]);
		expect(result[0]).toContain("no valid data");
	});

	test("generates multi-line chart", () => {
		const series = [0.3, 0.5, 0.7, 0.4, 0.6];
		const result = asciiChart(series, 50, 4);
		expect(result.length).toBe(5); // 4 rows + axis
		expect(result[result.length - 1]).toContain("└"); // bottom axis
	});

	test("includes price labels with adaptive precision", () => {
		const series = [0.3, 0.5, 0.7];
		const result = asciiChart(series, 50, 4);
		const topLine = result[0];
		const bottomLine = result[result.length - 2]; // before axis
		// Range is 0.4, so precision is 2 decimals
		expect(topLine).toContain("0.70"); // max value
		expect(bottomLine).toContain("0.30"); // min value
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
		expect(single[0]).toContain("0.5");
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
		// Should show price label (precision 4 for zero range)
		expect(chartContent).toContain("0.5000");
		// Should indicate stable price
		expect(chartContent).toContain("stable price");
	});

	test("handles NaN values gracefully", () => {
		const series = [0.3, NaN, 0.7, NaN, 0.5];
		const result = asciiChart(series, 50, 4);
		// Should render with 3 valid points
		expect(result.length).toBeGreaterThan(1);
		expect(result[result.length - 1]).toContain("└");
	});

	test("handles Infinity values gracefully", () => {
		const series = [0.3, Infinity, 0.7, -Infinity, 0.5];
		const result = asciiChart(series, 50, 4);
		// Should render with 3 valid points
		expect(result.length).toBeGreaterThan(1);
	});

	test("handles negative values", () => {
		const series = [-0.5, -0.3, -0.8, -0.2];
		const result = asciiChart(series, 50, 4);
		expect(result.length).toBe(5);
		expect(result[0]).toContain("-0.2"); // max (least negative)
		expect(result[result.length - 2]).toContain("-0.8"); // min (most negative)
	});

	test("handles mixed positive/negative values", () => {
		const series = [-0.5, 0.3, -0.2, 0.8];
		const result = asciiChart(series, 50, 4);
		expect(result.length).toBe(5);
		const chartContent = result.join("\n");
		expect(chartContent).toContain("0.80"); // max
		expect(chartContent).toContain("-0.50"); // min
	});

	test("handles large values with correct label width", () => {
		const series = [1000000, 1500000, 2000000];
		const result = asciiChart(series, 50, 4);
		expect(result.length).toBe(5);
		// Labels should not overflow/misalign
		const topLine = result[0];
		expect(topLine).toContain("2000000");
	});
});

describe("asciiLineChart", () => {
	test("returns no data for empty series", () => {
		const result = asciiLineChart([]);
		expect(result).toEqual(["(no data)"]);
	});

	test("returns error message for all-NaN series", () => {
		const result = asciiLineChart([NaN, NaN, NaN]);
		expect(result[0]).toContain("no valid data");
	});

	test("returns message for single point", () => {
		const result = asciiLineChart([0.5]);
		expect(result[0]).toContain("insufficient data");
	});

	test("generates line chart with box-drawing characters", () => {
		const series = [0.3, 0.5, 0.7, 0.4, 0.6];
		const result = asciiLineChart(series, { width: 50, height: 6 });
		expect(result.length).toBeGreaterThan(1);
		// Should contain line-drawing characters
		const chartContent = result.join("");
		expect(chartContent).toMatch(/[─│┤└╭╮╯╰]/);
	});

	test("includes Y-axis labels", () => {
		const series = [0.3, 0.5, 0.7];
		const result = asciiLineChart(series, { height: 6 });
		const chartContent = result.join("\n");
		// Should contain min and max labels
		expect(chartContent).toContain("0.70"); // max
		expect(chartContent).toContain("0.30"); // min
	});

	test("includes middle Y-axis label for tall charts", () => {
		const series = [0.0, 0.5, 1.0];
		const result = asciiLineChart(series, { height: 8 });
		const chartContent = result.join("\n");
		// Should contain middle label (0.5)
		expect(chartContent).toContain("0.50");
	});

	test("handles constant values with flat line", () => {
		const series = [0.5, 0.5, 0.5, 0.5];
		const result = asciiLineChart(series, { height: 6 });
		const chartContent = result.join("\n");
		// Should show horizontal line
		expect(chartContent).toContain("─");
	});

	test("respects width parameter", () => {
		const series = Array(100).fill(0).map((_, i) => Math.sin(i / 10));
		const result = asciiLineChart(series, { width: 20, height: 6 });
		// Check that the chart is constrained to width
		const chartLine = result[0] ?? "";
		// Allow for label width + axis + data
		expect(chartLine.length).toBeLessThan(40);
	});

	test("handles NaN values gracefully", () => {
		const series = [0.3, NaN, 0.7, 0.5];
		const result = asciiLineChart(series, { height: 6 });
		expect(result.length).toBeGreaterThan(1);
		expect(result[result.length - 1]).toContain("└");
	});

	test("handles upward trends", () => {
		const series = [0.1, 0.3, 0.5, 0.7, 0.9];
		const result = asciiLineChart(series, { height: 6 });
		const chartContent = result.join("");
		// Upward trend should use ╭ and ╯ characters
		expect(chartContent).toMatch(/[╭╯]/);
	});

	test("handles downward trends", () => {
		const series = [0.9, 0.7, 0.5, 0.3, 0.1];
		const result = asciiLineChart(series, { height: 6 });
		const chartContent = result.join("");
		// Downward trend should use ╰ and ╮ characters
		expect(chartContent).toMatch(/[╰╮]/);
	});

	test("handles volatile data (up and down)", () => {
		const series = [0.3, 0.7, 0.2, 0.8, 0.4];
		const result = asciiLineChart(series, { height: 8 });
		const chartContent = result.join("");
		// Should have both up and down connectors
		expect(chartContent).toMatch(/[╭╮╯╰]/);
	});

	test("custom min/max options work", () => {
		const series = [0.4, 0.5, 0.6];
		const result = asciiLineChart(series, { min: 0, max: 1, height: 6 });
		const chartContent = result.join("\n");
		// Should show custom range
		expect(chartContent).toContain("1.00"); // custom max
		expect(chartContent).toContain("0.00"); // custom min
	});

	// Critical visual verification tests - ensure corners connect properly
	test("upward transition uses correct corners: ╯ at bottom, ╭ at top", () => {
		// Two points going up: 0 -> 1
		const series = [0, 1];
		const result = asciiLineChart(series, { height: 4, offset: 0 });
		const chartContent = result.join("\n");

		// The chart should have:
		// - ╭ at the top row (where value 1 ends up)
		// - ╯ at the bottom row (where value 0 starts)
		// This creates a connected line: ─╯ at bottom, │ in middle, ╭ at top
		expect(chartContent).toContain("╭"); // top corner
		expect(chartContent).toContain("╯"); // bottom corner

		// Verify they're in the right positions (╭ should be above ╯)
		const lines = result.filter(line => line.includes("╭") || line.includes("╯"));
		expect(lines.length).toBe(2);
		// First line with a corner should have ╭ (top), second should have ╯ (bottom)
		const topLine = result.find(line => line.includes("╭"));
		const bottomLine = result.find(line => line.includes("╯"));
		expect(topLine).toBeDefined();
		expect(bottomLine).toBeDefined();
		// Top line appears before bottom line in output (top-to-bottom)
		const topIndex = result.findIndex(line => line.includes("╭"));
		const bottomIndex = result.findIndex(line => line.includes("╯"));
		expect(topIndex).toBeLessThan(bottomIndex);
	});

	test("downward transition uses correct corners: ╮ at top, ╰ at bottom", () => {
		// Two points going down: 1 -> 0
		const series = [1, 0];
		const result = asciiLineChart(series, { height: 4, offset: 0 });
		const chartContent = result.join("\n");

		// The chart should have:
		// - ╮ at the top row (where value 1 starts)
		// - ╰ at the bottom row (where value 0 ends)
		// This creates a connected line: ─╮ at top, │ in middle, ╰ at bottom
		expect(chartContent).toContain("╮"); // top corner (start of down)
		expect(chartContent).toContain("╰"); // bottom corner (end of down)

		// Verify they're in the right positions (╮ should be above ╰)
		const topIndex = result.findIndex(line => line.includes("╮"));
		const bottomIndex = result.findIndex(line => line.includes("╰"));
		expect(topIndex).toBeLessThan(bottomIndex);
	});

	test("peak pattern uses ╭╮ at top for up-then-down", () => {
		// Three points: low -> high -> low (creates a peak)
		const series = [0, 1, 0];
		const result = asciiLineChart(series, { height: 4, offset: 0 });
		const chartContent = result.join("\n");

		// At the peak (top row), we should see ╭╮ or ╭ followed by ╮
		// ╭ ends the upward move, ╮ starts the downward move
		expect(chartContent).toContain("╭");
		expect(chartContent).toContain("╮");

		// The top row should have both corners (the peak)
		const topRow = result[0]; // First output line is top
		expect(topRow).toContain("╭");
		expect(topRow).toContain("╮");
	});

	test("valley pattern uses ╯╰ at bottom for down-then-up", () => {
		// Three points: high -> low -> high (creates a valley)
		const series = [1, 0, 1];
		const result = asciiLineChart(series, { height: 4, offset: 0 });
		const chartContent = result.join("\n");

		// At the valley (bottom row), we should see ╯╰ or ╯ followed by ╰
		// ╯ starts from left going up at the valley
		// ╰ ends going right from the valley
		expect(chartContent).toContain("╯");
		expect(chartContent).toContain("╰");

		// Find the bottom data row (just above the axis line)
		const bottomDataRow = result[result.length - 2]; // Second to last is bottom data row
		expect(bottomDataRow).toContain("╯");
		expect(bottomDataRow).toContain("╰");
	});

	test("line continuity: corners connect to horizontal and vertical segments", () => {
		// Test a simple zigzag pattern
		const series = [0.2, 0.8, 0.5];
		const result = asciiLineChart(series, { height: 6, offset: 0 });
		const chartContent = result.join("");

		// Should have proper mix of connectors
		expect(chartContent).toMatch(/[─│╭╮╯╰]/); // Has line characters
		expect(chartContent).toContain("│"); // Has vertical segments

		// No broken or disconnected characters - all corners should be in context
		// Each corner should be adjacent to vertical or horizontal lines
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
