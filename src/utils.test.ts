import { describe, test, expect } from "bun:test";
import { asciiChart, asciiSparkline, formatPct, formatPrice, formatNumber, midpointFrom } from "./utils";

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
    const series = Array(100).fill(0).map((_, i) => i / 100);
    const result = asciiChart(series, 20, 4);
    // Each line should have limited width based on sliced data
    const dataLine = result[0].split("│")[1];
    expect(dataLine?.length).toBeLessThanOrEqual(20);
  });

  test("handles single value", () => {
    const result = asciiChart([0.5], 50, 4);
    expect(result.length).toBeGreaterThan(1);
  });
});
