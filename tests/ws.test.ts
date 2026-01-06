import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { parseMarketMessage } from "../src/ws";

describe("ws", () => {
  describe("parseMarketMessage", () => {
    const originalDateNow = Date.now;
    beforeEach(() => {
      Date.now = () => 1_700_000_000_000;
    });

    afterEach(() => {
      Date.now = originalDateNow;
    });

    describe("price_change events", () => {
      it("parses price_change with price_changes array", () => {
        const msg = {
          event_type: "price_change",
          price_changes: [
            { asset_id: "A1", side: "BUY", price: "0.42", size: "50", timestamp: 123, hash: "h1" },
            { asset_id: "A1", side: "SELL", price: "0.43", size: "10", timestamp: 124, hash: "h2" }
          ]
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(2);
        expect(updates[0].assetId).toBe("A1");
        expect(updates[0].side).toBe("BUY");
        expect(updates[0].price).toBeCloseTo(0.42);
        expect(updates[1].side).toBe("SELL");
        expect(updates[0].hash).toBe("h1");
        expect(updates[0].timestamp).toBe(123);
      });

      it("parses price_change with changes array", () => {
        const msg = {
          event_type: "price_change",
          changes: [
            { asset_id: "A2", side: "BUY", price: "0.50", size: "100" }
          ]
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].assetId).toBe("A2");
        expect(updates[0].price).toBeCloseTo(0.50);
        expect(updates[0].size).toBe(100);
      });

      it("handles missing asset_id in changes (uses parent)", () => {
        const msg = {
          event_type: "price_change",
          asset_id: "A3",
          price_changes: [
            { side: "BUY", price: "0.60", size: "25" }
          ]
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].assetId).toBe("A3");
      });

      it("skips changes without price", () => {
        const msg = {
          event_type: "price_change",
          price_changes: [
            { asset_id: "A1", side: "BUY", size: "50" }, // Missing price
            { asset_id: "A2", side: "SELL", price: "0.40", size: "10" }
          ]
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].assetId).toBe("A2");
      });

      it("parses best_bid and best_ask from parent", () => {
        const msg = {
          event_type: "price_change",
          asset_id: "A4",
          best_bid: "0.30",
          best_ask: "0.35",
          price_changes: [
            { asset_id: "A4", side: "BUY", price: "0.32", size: "50" }
          ]
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates[0].bestBid).toBeCloseTo(0.30);
        expect(updates[0].bestAsk).toBeCloseTo(0.35);
      });
    });

    describe("best_bid_ask events", () => {
      it("parses best_bid_ask", () => {
        const msg = {
          event_type: "best_bid_ask",
          asset_id: "A2",
          best_bid: "0.3",
          best_ask: "0.32"
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].bestBid).toBeCloseTo(0.3);
        expect(updates[0].bestAsk).toBeCloseTo(0.32);
      });

      it("uses default timestamp when none provided", () => {
        const msg = {
          event_type: "best_bid_ask",
          asset_id: "A2",
          best_bid: "0.3",
          best_ask: "0.32"
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates[0].ts).toBe(1_700_000_000_000);
      });
    });

    describe("book snapshot events", () => {
      it("parses book snapshot", () => {
        const msg = {
          event_type: "book",
          asset_id: "A3",
          bids: [["0.4", "100"]],
          asks: [["0.5", "80"]]
        };

        const { books } = parseMarketMessage(msg);
        expect(books.length).toBe(1);
        expect(books[0].assetId).toBe("A3");
        expect(books[0].book).toEqual(msg);
      });

      it("handles book with token_id instead of asset_id", () => {
        const msg = {
          event_type: "book",
          token_id: "T1",
          bids: [["0.4", "100"]],
          asks: [["0.5", "80"]]
        };

        const { books } = parseMarketMessage(msg);
        expect(books.length).toBe(1);
        expect(books[0].assetId).toBe("T1");
      });
    });

    describe("last_trade_price events", () => {
      it("parses last_trade_price", () => {
        const msg = {
          event_type: "last_trade_price",
          asset_id: "A5",
          price: "0.45"
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].lastTrade).toBeCloseTo(0.45);
      });

      it("skips last_trade_price without price", () => {
        const msg = {
          event_type: "last_trade_price",
          asset_id: "A5"
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(0);
      });
    });

    describe("tick_size_change events", () => {
      it("parses tick_size_change", () => {
        const msg = {
          event_type: "tick_size_change",
          asset_id: "A6"
        };

        const { updates } = parseMarketMessage(msg);
        expect(updates.length).toBe(1);
        expect(updates[0].assetId).toBe("A6");
        expect(updates[0].eventType).toBe("tick_size_change");
      });
    });

    describe("unknown events", () => {
      it("returns empty updates and books for unknown event type", () => {
        const msg = {
          event_type: "unknown_event",
          data: "something"
        };

        const { updates, books } = parseMarketMessage(msg);
        expect(updates.length).toBe(0);
        expect(books.length).toBe(0);
      });
    });

    describe("missing event_type", () => {
      it("handles missing event_type", () => {
        const msg = {
          asset_id: "A1",
          price: "0.50"
        };

        const { updates, books } = parseMarketMessage(msg);
        expect(updates.length).toBe(0);
        expect(books.length).toBe(0);
      });
    });
  });
});
