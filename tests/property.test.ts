/**
 * Property-based tests using fast-check.
 *
 * These tests verify that functions maintain their properties
 * across a wide range of randomly generated inputs.
 */

import { describe, expect, it } from "bun:test";
import fc from "fast-check";
import {
  formatPct,
  formatPrice,
  formatNumber,
  asciiSparkline,
  midpointFrom
} from "../src/utils";
import {
  extractPrice,
  normalizeOrderbook,
  asNumber
} from "../src/parsers";
import {
  asTokenId,
  asConditionId,
  asMarketId,
  isTokenId,
  isConditionId,
  isMarketId
} from "../src/types";

describe("Property-based Tests", () => {
  describe("formatPct", () => {
    it("always returns a string ending with %", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
          const result = formatPct(value);
          return typeof result === "string" && result.endsWith("%");
        })
      );
    });

    it("returns - for undefined", () => {
      fc.assert(
        fc.property(fc.constant(undefined), (value) => {
          return formatPct(value) === "-";
        })
      );
    });

    it("is idempotent for same input", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
          const first = formatPct(value);
          const second = formatPct(value);
          return first === second;
        })
      );
    });
  });

  describe("formatPrice", () => {
    it("always returns a string with 4 decimal places", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1, noNaN: true }), (value) => {
          const result = formatPrice(value);
          const parts = result.split(".");
          return (
            typeof result === "string" &&
            (parts.length === 1 || parts[1]?.length === 4)
          );
        })
      );
    });

    it("returns - for undefined", () => {
      fc.assert(
        fc.property(fc.constant(undefined), (value) => {
          return formatPrice(value) === "-";
        })
      );
    });
  });

  describe("formatNumber", () => {
    it("returns non-empty string for valid numbers", () => {
      fc.assert(
        fc.property(fc.float({ min: 0, max: 1_000_000_000, noNaN: true }), (value) => {
          const result = formatNumber(value);
          return typeof result === "string" && result.length > 0;
        })
      );
    });

    it("returns - for undefined", () => {
      fc.assert(
        fc.property(fc.constant(undefined), (value) => {
          return formatNumber(value) === "-";
        })
      );
    });
  });

  describe("midpointFrom", () => {
    it("returns average of bid and ask", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          fc.float({ min: 0, max: 1, noNaN: true }),
          (bid, ask) => {
            const midpoint = midpointFrom(bid, ask);
            return midpoint !== undefined && midpoint === (bid + ask) / 2;
          }
        )
      );
    });

    it("returns undefined when either is undefined", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          (value) => {
            return midpointFrom(undefined, value) === undefined &&
                   midpointFrom(value, undefined) === undefined;
          }
        )
      );
    });
  });

  describe("asNumber", () => {
    it("returns number for numeric input", () => {
      fc.assert(
        fc.property(fc.float({ min: -1000, max: 1000, noNaN: true }), (value) => {
          const result = asNumber(value);
          return typeof result === "number" && !Number.isNaN(result);
        })
      );
    });

    it("converts string numbers", () => {
      fc.assert(
        fc.property(fc.float({ min: -1000, max: 1000, noNaN: true }).map(String), (value) => {
          const result = asNumber(value);
          return typeof result === "number" && !Number.isNaN(result);
        })
      );
    });

    it("returns undefined for non-numeric input", () => {
      fc.assert(
        fc.property(fc.string(), (value) => {
          // Only test non-numeric strings
          if (typeof value === "string" && !isNaN(Number(value))) {
            return true; // Skip numeric strings
          }
          return asNumber(value) === undefined;
        })
      );
    });
  });

  describe("extractPrice", () => {
    it("extracts price from valid response", () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1, noNaN: true }),
          (price) => {
            const response = { price };
            const result = extractPrice(response);
            return result === price;
          }
        )
      );
    });

    it("returns undefined when no price field", () => {
      fc.assert(
        fc.property(fc.object(), (obj) => {
          const response = { ...obj };
          // Ensure no price field
          delete (response as { price?: unknown }).price;
          delete (response as { best_price?: unknown }).best_price;
          delete (response as { value?: unknown }).value;
          return extractPrice(response) === undefined;
        })
      );
    });
  });

  describe("normalizeOrderbook", () => {
    it("returns orderbook with bids and asks arrays", () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(fc.float({ min: 0, max: 1 }), fc.float({ min: 0, max: 1000 }))),
          (levels) => {
            const response = { bids: levels, asks: [] };
            const result = normalizeOrderbook(response);
            return Array.isArray(result.bids) && Array.isArray(result.asks);
          }
        )
      );
    });
  });

  describe("asTokenId", () => {
    it("accepts valid token IDs", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 8, maxLength: 64 }).map((s) => "0x" + s),
          (id) => {
            const result = asTokenId(id);
            return result === id;
          }
        )
      );
    });

    it("rejects token IDs without 0x prefix", () => {
      fc.assert(
        fc.property(fc.hexString({ minLength: 10, maxLength: 66 }), (id) => {
          expect(() => asTokenId(id)).toThrow();
          return true;
        })
      );
    });

    it("rejects too short token IDs", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 1, maxLength: 7 }).map((s) => "0x" + s),
          (id) => {
            expect(() => asTokenId(id)).toThrow();
            return true;
          }
        )
      );
    });
  });

  describe("asConditionId", () => {
    it("accepts valid 66-character condition IDs", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 64, maxLength: 64 }).map((s) => "0x" + s),
          (id) => {
            const result = asConditionId(id);
            return result === id;
          }
        )
      );
    });

    it("rejects condition IDs that are not 66 characters", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 1, maxLength: 100 }).filter(s => s.length !== 64).map((s) => "0x" + s),
          (id) => {
            expect(() => asConditionId(id)).toThrow();
            return true;
          }
        )
      );
    });
  });

  describe("asMarketId", () => {
    it("accepts valid hex market IDs", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 8, maxLength: 64 }).map((s) => "0x" + s),
          (id) => {
            const result = asMarketId(id);
            return result === id;
          }
        )
      );
    });

    it("accepts valid slug market IDs", () => {
      fc.assert(
        fc.property(
          fc.matchWith(/[a-z0-9\-]+/),
          (slug) => {
            const result = asMarketId(slug);
            return result === slug;
          }
        )
      );
    });
  });

  describe("isTokenId type guard", () => {
    it("returns true only for valid token ID format", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 8, maxLength: 64 }).map((s) => "0x" + s),
          (id) => {
            return isTokenId(id) === true;
          }
        )
      );
    });

    it("returns false for invalid formats", () => {
      fc.assert(
        fc.property(
          fc.string().filter(s => !s.startsWith("0x") || s.length < 10 || s.length > 66),
          (id) => {
            return isTokenId(id) === false;
          }
        )
      );
    });
  });

  describe("isConditionId type guard", () => {
    it("returns true only for 66-character hex strings", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 64, maxLength: 64 }).map((s) => "0x" + s),
          (id) => {
            return isConditionId(id) === true;
          }
        )
      );
    });

    it("returns false for non-66-character strings", () => {
      fc.assert(
        fc.property(
          fc.hexString({ minLength: 1, maxLength: 100 }).filter(s => s.length !== 64).map((str) => "0x" + str),
          (id) => {
            return isConditionId(id) === false;
          }
        )
      );
    });
  });

  describe("isMarketId type guard", () => {
    it("returns true for valid hex or slug formats", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.hexString({ minLength: 8, maxLength: 64 }).map((s) => "0x" + s),
            fc.matchWith(/[a-z0-9\-]+/)
          ),
          (id) => {
            return isMarketId(id) === true;
          }
        )
      );
    });
  });
});
