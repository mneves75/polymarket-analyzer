import { describe, test, expect } from "bun:test";
import {
  colorText,
  escapeTags,
  stripTags,
  visibleLength,
  truncate,
  truncateAlert,
  cell,
  textCell,
  padCell,
  renderTable,
  statusColor,
  computeHeat,
  heatSymbol,
  computeHealthScore,
  filterRadar
} from "./tui-render";
import type { MarketInfo } from "./api";
import type { OrderbookState } from "./parsers";

describe("colorText", () => {
  test("wraps text with color tags", () => {
    expect(colorText("hello", "green")).toBe("{green-fg}hello{/}");
  });

  test("handles empty string", () => {
    expect(colorText("", "red")).toBe("{red-fg}{/}");
  });
});

describe("escapeTags", () => {
  test("escapes curly braces", () => {
    expect(escapeTags("{test}")).toBe("\\{test\\}");
  });

  test("handles string without braces", () => {
    expect(escapeTags("hello world")).toBe("hello world");
  });

  test("handles multiple braces", () => {
    expect(escapeTags("{a}{b}")).toBe("\\{a\\}\\{b\\}");
  });
});

describe("stripTags", () => {
  test("removes blessed color tags", () => {
    expect(stripTags("{green-fg}hello{/}")).toBe("hello");
  });

  test("handles plain text", () => {
    expect(stripTags("hello world")).toBe("hello world");
  });

  test("removes multiple tags", () => {
    expect(stripTags("{red-fg}a{/} {blue-fg}b{/}")).toBe("a b");
  });
});

describe("visibleLength", () => {
  test("returns length without color tags", () => {
    expect(visibleLength("{green-fg}hello{/}")).toBe(5);
  });

  test("returns plain string length", () => {
    expect(visibleLength("hello")).toBe(5);
  });

  test("handles empty string", () => {
    expect(visibleLength("")).toBe(0);
  });
});

describe("truncate", () => {
  test("truncates long strings with ellipsis", () => {
    expect(truncate("hello world test", 10)).toBe("hello w...");
  });

  test("returns original if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  test("handles exact length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  test("handles very short max", () => {
    expect(truncate("hello world", 5)).toBe("he...");
  });
});

describe("truncateAlert", () => {
  test("shortens long token IDs", () => {
    const msg = "Error: token_id=abcdefghijklmnopqrstuvwxyz123456789";
    const result = truncateAlert(msg);
    expect(result).toContain("abcdefgh...");
    expect(result).toContain("456789");
  });

  test("truncates very long messages", () => {
    const longMsg = "a".repeat(150);
    expect(truncateAlert(longMsg).length).toBe(100);
    expect(truncateAlert(longMsg).endsWith("...")).toBe(true);
  });

  test("returns short messages unchanged", () => {
    expect(truncateAlert("short message")).toBe("short message");
  });
});

describe("cell and textCell", () => {
  test("escapes content", () => {
    expect(cell("{test}")).toBe("\\{test\\}");
    expect(textCell("{test}")).toBe("\\{test\\}");
  });

  test("handles null/undefined as dash", () => {
    expect(textCell(null as unknown as string)).toBe("-");
    expect(textCell(undefined as unknown as string)).toBe("-");
  });
});

describe("padCell", () => {
  test("pads to specified width", () => {
    expect(padCell("hi", 5)).toBe("hi   ");
  });

  test("handles colored text correctly", () => {
    const colored = "{green-fg}hi{/}";
    const padded = padCell(colored, 5);
    expect(padded).toBe("{green-fg}hi{/}   ");
  });

  test("returns original if already at width", () => {
    expect(padCell("hello", 5)).toBe("hello");
  });
});

describe("renderTable", () => {
  test("renders simple table", () => {
    const rows = [["a", "b"], ["c", "d"]];
    const result = renderTable(rows);
    expect(result).toContain("a");
    expect(result).toContain("b");
  });

  test("handles empty rows", () => {
    expect(renderTable([])).toBe("");
  });

  test("aligns columns", () => {
    const rows = [["short", "x"], ["a", "longer"]];
    const result = renderTable(rows);
    const lines = result.split("\n");
    expect(lines.length).toBe(2);
  });

  test("respects custom padding", () => {
    const rows = [["a", "b"]];
    const result = renderTable(rows, 4);
    expect(result.length).toBeGreaterThan(renderTable(rows, 1).length);
  });
});

describe("statusColor", () => {
  test("returns warning for stale", () => {
    expect(statusColor("connected", true)).toBe("yellow");
  });

  test("returns success for connected", () => {
    expect(statusColor("connected", false)).toBe("green");
  });

  test("returns warning for connecting", () => {
    expect(statusColor("connecting", false)).toBe("yellow");
  });

  test("returns danger for closed", () => {
    expect(statusColor("closed", false)).toBe("red");
  });

  test("returns danger for error", () => {
    expect(statusColor("error", false)).toBe("red");
  });

  test("returns muted for unknown", () => {
    expect(statusColor("unknown", false)).toBe("gray");
  });
});

describe("computeHeat", () => {
  test("returns 0 for empty market", () => {
    const market: MarketInfo = {
      outcomes: [],
      clobTokenIds: []
    };
    expect(computeHeat(market)).toBeGreaterThanOrEqual(0);
    expect(computeHeat(market)).toBeLessThanOrEqual(1);
  });

  test("returns higher heat for high volume", () => {
    const lowVolume: MarketInfo = {
      outcomes: [],
      clobTokenIds: [],
      volume24hr: 10
    };
    const highVolume: MarketInfo = {
      outcomes: [],
      clobTokenIds: [],
      volume24hr: 1000000
    };
    expect(computeHeat(highVolume)).toBeGreaterThan(computeHeat(lowVolume));
  });

  test("returns higher heat for price changes", () => {
    const noChange: MarketInfo = {
      outcomes: [],
      clobTokenIds: [],
      priceChange24hr: 0
    };
    const bigChange: MarketInfo = {
      outcomes: [],
      clobTokenIds: [],
      priceChange24hr: 0.5
    };
    expect(computeHeat(bigChange)).toBeGreaterThan(computeHeat(noChange));
  });
});

describe("heatSymbol", () => {
  test("returns colored symbol", () => {
    const market: MarketInfo = {
      outcomes: [],
      clobTokenIds: [],
      volume24hr: 1000
    };
    const result = heatSymbol(market);
    expect(result).toContain("{");
    expect(result).toContain("-fg}");
  });
});

describe("computeHealthScore", () => {
  test("returns N/A for no orderbook", () => {
    const result = computeHealthScore({
      noOrderbook: true,
      bestBid: undefined,
      bestAsk: undefined,
      orderbook: null,
      volume24hr: undefined
    });
    expect(result.label).toBe("N/A");
    expect(result.score).toBe(0);
  });

  test("returns high score for tight spread and deep book", () => {
    const orderbook: OrderbookState = {
      bids: Array(10).fill({ price: 0.5, size: 2000 }),
      asks: Array(10).fill({ price: 0.51, size: 2000 })
    };
    const result = computeHealthScore({
      noOrderbook: false,
      bestBid: 0.50,
      bestAsk: 0.51,
      orderbook,
      volume24hr: 200000
    });
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.label).toBe("A");
  });

  test("returns low score for wide spread and shallow book", () => {
    const orderbook: OrderbookState = {
      bids: [{ price: 0.3, size: 10 }],
      asks: [{ price: 0.7, size: 10 }]
    };
    const result = computeHealthScore({
      noOrderbook: false,
      bestBid: 0.30,
      bestAsk: 0.70,
      orderbook,
      volume24hr: 10
    });
    expect(result.score).toBeLessThan(40);
    expect(["D", "F"]).toContain(result.label);
  });
});

describe("filterRadar", () => {
  const markets: MarketInfo[] = [
    { outcomes: ["YES"], clobTokenIds: ["1"], question: "Will Bitcoin hit 100k?" },
    { outcomes: ["YES"], clobTokenIds: ["2"], question: "Will ETH hit 10k?" },
    { outcomes: ["YES"], clobTokenIds: ["3"], eventTitle: "Presidential Election 2024" }
  ];

  test("returns all when no query", () => {
    expect(filterRadar(markets, "")).toEqual(markets);
  });

  test("filters by question", () => {
    const result = filterRadar(markets, "bitcoin");
    expect(result.length).toBe(1);
    expect(result[0].question).toContain("Bitcoin");
  });

  test("filters by event title", () => {
    const result = filterRadar(markets, "election");
    expect(result.length).toBe(1);
    expect(result[0].eventTitle).toContain("Election");
  });

  test("is case insensitive", () => {
    expect(filterRadar(markets, "BITCOIN").length).toBe(1);
    expect(filterRadar(markets, "BiTcOiN").length).toBe(1);
  });

  test("returns empty for no matches", () => {
    expect(filterRadar(markets, "dogecoin")).toEqual([]);
  });
});
