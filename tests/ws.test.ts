import { describe, expect, it } from "bun:test";
import { parseMarketMessage } from "../src/ws";

const now = Date.now;
Date.now = () => 1_700_000_000_000;

describe("parseMarketMessage", () => {
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
  });
});

Date.now = now;
