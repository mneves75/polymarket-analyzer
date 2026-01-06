import { describe, expect, it } from "bun:test";
import { HttpError, isNoOrderbookError } from "../src/http";

describe("http errors", () => {
  it("detects no orderbook from HttpError body", () => {
    const err = new HttpError(404, "https://clob.polymarket.com/midpoint", { error: "No orderbook exists for the requested token id" }, "HTTP 404");
    expect(isNoOrderbookError(err)).toBe(true);
  });

  it("ignores non-404 HttpError", () => {
    const err = new HttpError(500, "https://clob.polymarket.com/midpoint", { error: "No orderbook exists" }, "HTTP 500");
    expect(isNoOrderbookError(err)).toBe(false);
  });

  it("detects no orderbook from Error message", () => {
    const err = new Error("No orderbook exists for the requested token id");
    expect(isNoOrderbookError(err)).toBe(true);
  });
});
