import { describe, expect, it } from "bun:test";
import { runSnapshot } from "../src/demo";

describe("runSnapshot", () => {
  it("does not throw when orderbook is missing", async () => {
    const originalFetch = globalThis.fetch;
    const logs: string[] = [];
    const originalLog = console.log;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const rawUrl =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl);

      if (url.host === "gamma-api.polymarket.com" && url.pathname === "/events") {
        return new Response(
          JSON.stringify({
            events: [
              {
                id: "E1",
                title: "Test Event",
                markets: [
                  {
                    conditionId: "COND1",
                    clobTokenIds: ["TOKEN1"],
                    question: "Test?",
                    outcomes: ["YES", "NO"]
                  }
                ]
              }
            ]
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.host === "clob.polymarket.com" && url.pathname === "/book") {
        return new Response(
          JSON.stringify({ error: "No orderbook exists for the requested token id" }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }

      if (url.host === "clob.polymarket.com" && url.pathname === "/price") {
        return new Response(
          JSON.stringify({ error: "No orderbook exists for the requested token id" }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }

      if (url.host === "clob.polymarket.com" && url.pathname === "/midpoint") {
        return new Response(
          JSON.stringify({ error: "No orderbook exists for the requested token id" }),
          { status: 404, headers: { "content-type": "application/json" } }
        );
      }

      if (url.host === "clob.polymarket.com" && url.pathname === "/prices-history") {
        return new Response(
          JSON.stringify({ history: [{ p: "0.1" }, { p: "0.2" }] }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      if (url.host === "data-api.polymarket.com" && url.pathname === "/holders") {
        return new Response(
          JSON.stringify([{ holders: [{ address: "0xabc", shares: "10" }] }]),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    console.log = (...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    };

    try {
      await runSnapshot({ intervalMs: 1000, limit: 1 });
      expect(logs.join("\n")).toContain("\"conditionId\": \"COND1\"");
    } finally {
      globalThis.fetch = originalFetch;
      console.log = originalLog;
    }
  });
});
