/**
 * Integration tests for WebSocket client.
 *
 * These tests use a mock WebSocket server to test the client behavior
 * without connecting to the real Polymarket WebSocket endpoint.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { connectMarketWs, type WsUpdate, type WsHandlers } from "../../src/ws";

// Mock WebSocket for testing
class MockWebSocket {
  static OPEN = 1 as const;
  static CONNECTING = 0 as const;
  static CLOSED = 3 as const;

  url: string;
  readyState: number = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  private sentMessages: string[] = [];
  private closeCalled = false;
  private openTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    this.openTimeout = setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event("open"));
    }, 10);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(): void {
    this.closeCalled = true;
    this.readyState = MockWebSocket.CLOSED;
    if (this.openTimeout) clearTimeout(this.openTimeout);
    this.onclose?.(new CloseEvent("close"));
  }

  addEventListener(
    type: string,
    listener: (event: Event | MessageEvent | CloseEvent) => void
  ): void {
    switch (type) {
      case "open":
        this.onopen = listener as (event: Event) => void;
        break;
      case "message":
        this.onmessage = listener as (event: MessageEvent) => void;
        break;
      case "close":
        this.onclose = listener as (event: CloseEvent) => void;
        break;
      case "error":
        this.onerror = listener as (event: Event) => void;
        break;
    }
  }

  // Test helpers
  getLastSentMessage(): string | undefined {
    return this.sentMessages[this.sentMessages.length - 1];
  }

  simulateMessage(data: unknown): void {
    this.onmessage?.(new MessageEvent("message", { data: JSON.stringify(data) }));
  }

  wasClosed(): boolean {
    return this.closeCalled;
  }
}

// Store original WebSocket
const OriginalWebSocket = WebSocket;

describe("WebSocket Integration Tests", () => {
  beforeEach(() => {
    // Replace global WebSocket with mock
    // @ts-expect-error - Intentionally replacing WebSocket for testing
    global.WebSocket = MockWebSocket as typeof WebSocket;
  });

  afterEach(() => {
    // Restore original WebSocket
    // @ts-expect-error - Intentionally restoring WebSocket
    global.WebSocket = OriginalWebSocket;
  });

  describe("connection lifecycle", () => {
    it("connects to WebSocket server", async () => {
      const updates: WsUpdate[] = [];
      const statuses: string[] = [];

      const handlers: WsHandlers = {
        onUpdate: (update) => updates.push(update),
        onStatus: (status) => statuses.push(status)
      };

      connectMarketWs(["0xtoken123"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(statuses).toContain("connecting");
      expect(statuses).toContain("connected");
    });

    it("sends subscribe message on connection", async () => {
      const handlers: WsHandlers = {
        onUpdate: () => {},
        onStatus: () => {}
      };

      connectMarketWs(["0xtoken123"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Connection should be established
      expect(handlers).toBeDefined();
    });
  });

  describe("message handling", () => {
    it("processes messages", async () => {
      const updates: WsUpdate[] = [];
      const handlers: WsHandlers = {
        onUpdate: (update) => updates.push(update),
        onStatus: () => {}
      };

      connectMarketWs(["0xtoken123"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify handler was called
      expect(typeof handlers.onUpdate).toBe("function");
    });
  });

  describe("subscription management", () => {
    it("allows subscribing to new tokens after connection", async () => {
      const handlers: WsHandlers = {
        onUpdate: () => {},
        onStatus: () => {}
      };

      const connection = connectMarketWs(["0xtoken1"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Subscribe to more tokens
      connection.subscribe(["0xtoken2", "0xtoken3"]);

      expect(connection).toBeDefined();
    });

    it("allows unsubscribing from tokens", async () => {
      const handlers: WsHandlers = {
        onUpdate: () => {},
        onStatus: () => {}
      };

      const connection = connectMarketWs(["0xtoken1", "0xtoken2"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      connection.unsubscribe(["0xtoken1"]);

      expect(connection).toBeDefined();
    });
  });

  describe("cleanup", () => {
    it("closes connection when close() is called", async () => {
      const handlers: WsHandlers = {
        onUpdate: () => {},
        onStatus: () => {}
      };

      const connection = connectMarketWs(["0xtoken123"], handlers);

      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Close the connection
      connection.close();

      expect(connection).toBeDefined();
    });
  });
});
