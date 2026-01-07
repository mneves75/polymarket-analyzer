# OpenTUI Implementation - Comprehensive Fix Specification

**Date:** 2026-01-06
**Status:** CRITICAL ISSUES FOUND
**Severity:** PRODUCTION BLOCKER

---

## Executive Summary

### CRITICAL FINDING: OpenTUI is NOT Production-Ready

After extensive research, I discovered that **OpenTUI is explicitly marked as NOT production-ready** by its developers:

> *"It is currently in development and is not ready for production use."*
> - Source: [OpenTUI GitHub](https://github.com/sst/opentui)

**Recommendation:** Do NOT use OpenTUI for production applications in 2026. Use **Ink** (React for CLIs) or **Unblessed** instead.

---

## Self-Critique: What I Got Wrong

### 1. Strategic Errors

| Issue | Severity | Impact |
|-------|----------|--------|
| Used non-production library | CRITICAL | App will fail in production |
| Did not research library status | HIGH | Wasted development time |
| No alternative considered | HIGH | Locked into unstable dependency |
| Missing communication | MEDIUM | User not properly warned |

### 2. Code Quality Issues

#### Critical Errors (Must Fix)

1. **No Signal Handlers** - App will corrupt terminal on crash
   ```typescript
   // MISSING: SIGTERM, SIGQUIT, SIGINT handlers
   // MISSING: uncaughtException, unhandledRejection handlers
   ```

2. **Global Mutable State** - Anti-pattern causing bugs
   ```typescript
   // BAD: Global mutable state
   let state: DashboardState = { radar: [], ... };
   // Any function can mutate this unpredictably
   ```

3. **No Error Boundaries** - Any error crashes entire app
   ```typescript
   // MISSING: try-catch around all update functions
   // MISSING: Error recovery mechanisms
   ```

4. **Memory Leaks** - Event listeners never cleaned up
   ```typescript
   // BAD: No cleanup for keyboard handlers
   renderer.keyInput.on("keypress", ...); // Never removed
   ```

5. **Using `any` Type Casting** - Type safety violation
   ```typescript
   // BAD: Type assertion bypasses safety
   return (box as any).ctx as CliRenderer;
   ```

#### Design Issues

1. **Tight Coupling** - UI directly calls API
   ```typescript
   // BAD: UI code knows about API
   state.radar = await loadRadar(50); // Should be abstracted
   ```

2. **No Separation of Concerns** - Business logic in UI
   ```typescript
   // BAD: 450-line file doing everything
   // Should be: state management, API layer, UI layer separate
   ```

3. **Hard-Coded Values** - Magic numbers
   ```typescript
   // BAD: Magic numbers everywhere
   height: 7,
   flexBasis: 40,
   ```

4. **No Input Validation** - Bounds checking missing
   ```typescript
   // BAD: No validation
   state.focusIndex = Math.min(state.focusIndex + 1, state.radar.length - 1);
   // What if radar.length is 0? What if focusIndex is already at max?
   ```

5. **No Loading States** - Poor UX
   ```typescript
   // MISSING: No feedback during data fetch
   await fetchInitialData(renderer, panels); // User sees nothing
   ```

6. **No Error Recovery** - Errors are fatal
   ```typescript
   // BAD: Errors only logged, app continues in broken state
   catch (error) {
     console.error("Failed to fetch initial data:", error);
     // App continues with empty radar!
   }
   ```

7. **Console Logging in TUI** - Breaks terminal
   ```typescript
   // BAD: console.log interferes with TUI rendering
   console.log("OpenTUI TUI started...");
   ```

#### Performance Issues

1. **Inefficient Re-rendering** - Entire panel rebuilt on each update
   ```typescript
   // BAD: Removes and recreates all children
   for (const child of children) {
     radarBox.content.remove(child.id);
   }
   for (let i = 0; i < state.radar.length; i++) {
     // Creates new objects every time
   }
   ```

2. **No Virtual Scrolling** - Will crash with 100+ items
   ```typescript
   // BAD: Renders all markets at once
   for (let i = 0; i < state.radar.length; i++) {
     radarBox.content.add(row); // 50+ rows = memory issue
   }
   ```

3. **No Debouncing** - Excessive re-renders
   ```typescript
   // BAD: Immediate update on every keystroke
   case "n": updateRadarPanel(...); renderer.requestRender();
   ```

#### Maintainability Issues

1. **No Tests** - Can't verify correctness
2. **No Documentation** - Future maintainers will struggle
3. **No Logging** - Can't debug production issues
4. **No Type Guards** - Runtime type safety missing
5. **No Configuration** - Settings scattered throughout code

---

## Detailed Engineering Fix Specification

### Phase 1: Foundation (CRITICAL - Do First)

#### 1.1 Add Signal Handlers

```typescript
// src/opentui/signal-handler.ts
import { exit } from "process";

interface CleanupHandler {
  cleanup: () => void | Promise<void>;
  priority: number; // Lower = runs first
}

class SignalHandler {
  private cleanupFns: CleanupHandler[] = [];
  private isShuttingDown = false;

  register(fn: () => void | Promise<void>, priority = 10): void {
    this.cleanupFns.push({ cleanup: fn, priority });
    this.cleanupFns.sort((a, b) => a.priority - b.priority);
  }

  async shutdown(signal: string): Promise<never> {
    if (this.isShuttingDown) {
      console.error("Already shutting down, forcing exit");
      exit(1);
    }

    this.isShuttingDown = true;

    // Run cleanup in priority order
    for (const { cleanup } of this.cleanupFns) {
      try {
        await cleanup();
      } catch (error) {
        console.error("Cleanup error:", error);
      }
    }

    exit(128 + (signal === "SIGINT" ? 2 : signal === "SIGTERM" ? 15 : 3));
  }

  setup(): void {
    // Handle termination signals
    const signals = ["SIGINT", "SIGTERM", "SIGQUIT"] as const;
    for (const signal of signals) {
      process.on(signal, () => this.shutdown(signal));
    }

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      console.error("Uncaught exception:", error);
      this.shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      console.error("Unhandled rejection:", reason);
      this.shutdown("unhandledRejection");
    });
  }
}

export const signalHandler = new SignalHandler();
```

#### 1.2 Add Type-Safe Error Handling

```typescript
// src/opentui/errors.ts

/**
 * Base error class for TUI errors
 */
export class TUIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = true,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "TUIError";
  }
}

/**
 * Result type for error handling without exceptions
 */
export type Result<T, E = TUIError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Helper to create success result
 */
export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

/**
 * Helper to create error result
 */
export function err<E extends TUIError>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Specific error types
 */
export class NetworkError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", true, context);
    this.name = "NetworkError";
  }
}

export class DataError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATA_ERROR", true, context);
    this.name = "DataError";
  }
}

export class RenderError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "RENDER_ERROR", false, context);
    this.name = "RenderError";
  }
}
```

#### 1.3 Add Proper State Management

```typescript
// src/opentui/state-manager.ts

import { EventEmitter } from "events";
import type { MarketInfo } from "../api.js";
import type { OrderbookState } from "../parsers.js";

interface DashboardState {
  radar: MarketInfo[];
  focusIndex: number;
  outcomeIndex: number;
  orderbook: OrderbookState | null;
  wsStatus: "off" | "connecting" | "connected" | "disconnected";
  lastUpdate: number;
  bestBid: number | undefined;
  bestAsk: number | undefined;
  isLoading: boolean;
  error: string | null;
}

interface StateUpdate {
  type: string;
  payload: unknown;
}

/**
 * Immutable state manager with event emission
 */
class StateManager extends EventEmitter {
  private state: DashboardState = {
    radar: [],
    focusIndex: 0,
    outcomeIndex: 0,
    orderbook: null,
    wsStatus: "off",
    lastUpdate: 0,
    bestBid: undefined,
    bestAsk: undefined,
    isLoading: false,
    error: null,
  };

  get(): Readonly<DashboardState> {
    return this.state;
  }

  // Immutable updates
  setRadar(markets: MarketInfo[]): void {
    this.state = { ...this.state, radar: [...markets] };
    this.emit("change", { type: "radar", payload: markets });
  }

  setFocusIndex(index: number): void {
    if (index < 0 || index >= this.state.radar.length) {
      throw new DataError("Invalid focus index", { index, max: this.state.radar.length - 1 });
    }
    this.state = { ...this.state, focusIndex: index };
    this.emit("change", { type: "focusIndex", payload: index });
  }

  setOutcomeIndex(index: number): void {
    if (index !== 0 && index !== 1) {
      throw new DataError("Invalid outcome index", { index });
    }
    this.state = { ...this.state, outcomeIndex: index };
    this.emit("change", { type: "outcomeIndex", payload: index });
  }

  setLoading(loading: boolean): void {
    this.state = { ...this.state, isLoading: loading };
    this.emit("change", { type: "loading", payload: loading });
  }

  setError(error: string | null): void {
    this.state = { ...this.state, error };
    this.emit("change", { type: "error", payload: error });
  }

  reset(): void {
    this.state = {
      radar: [],
      focusIndex: 0,
      outcomeIndex: 0,
      orderbook: null,
      wsStatus: "off",
      lastUpdate: 0,
      bestBid: undefined,
      bestAsk: undefined,
      isLoading: false,
      error: null,
    };
    this.emit("reset");
  }
}

export const stateManager = new StateManager();
```

#### 1.4 Add Configuration Management

```typescript
// src/opentui/config.ts

export interface TUIConfig {
  layout: {
    headerHeight: number;
    footerHeight: number;
    leftColumnWidth: number; // percentage
    radarMinHeight: number;
    pulseHeight: number;
    historyHeight: number;
    marketHeight: number;
    orderbookHeight: number;
    alertsHeight: number;
  };
  colors: {
    background: string;
    header: string;
    selected: string;
    text: string;
    success: string;
    error: string;
    warning: string;
    muted: string;
  };
  performance: {
    targetFps: number;
    debounceMs: number;
    maxRadarItems: number;
    virtualScrollThreshold: number;
  };
}

export const DEFAULT_CONFIG: TUIConfig = {
  layout: {
    headerHeight: 1,
    footerHeight: 1,
    leftColumnWidth: 40,
    radarMinHeight: 10,
    pulseHeight: 7,
    historyHeight: 7,
    marketHeight: 10,
    orderbookHeight: 7,
    alertsHeight: 7,
  },
  colors: {
    background: "#000000",
    header: "#000033",
    selected: "#00FFFF",
    text: "#FFFFFF",
    success: "#00FF00",
    error: "#FF0000",
    warning: "#FFFF00",
    muted: "#666666",
  },
  performance: {
    targetFps: 30,
    debounceMs: 100,
    maxRadarItems: 50,
    virtualScrollThreshold: 100,
  },
};

export function getConfig(): TUIConfig {
  return DEFAULT_CONFIG;
}
```

### Phase 2: API Layer (Separation of Concerns)

#### 2.1 Create Service Layer

```typescript
// src/opentui/services/market-service.ts

import { loadRadar } from "../../market.js";
import type { MarketInfo } from "../../api.js";
import { Result, err, ok, NetworkError, DataError } from "../errors.js";

export class MarketService {
  private cache: Map<string, MarketInfo[]> = new Map();
  private cacheExpiry: number = 30_000; // 30 seconds
  private lastFetch: number = 0;

  async getRadar(limit: number): Promise<Result<MarketInfo[]>> {
    try {
      const now = Date.now();
      const cacheKey = `radar_${limit}`;

      // Check cache
      if (this.cache.has(cacheKey) && now - this.lastFetch < this.cacheExpiry) {
        return ok(this.cache.get(cacheKey)!);
      }

      // Fetch from API
      const markets = await loadRadar(limit);

      // Validate
      if (!Array.isArray(markets)) {
        return err(new DataError("Invalid API response", { type: typeof markets }));
      }

      // Cache
      this.cache.set(cacheKey, markets);
      this.lastFetch = now;

      return ok(markets);
    } catch (error) {
      return err(new NetworkError(
        `Failed to load radar: ${error instanceof Error ? error.message : String(error)}`,
        { limit }
      ));
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.lastFetch = 0;
  }
}

export const marketService = new MarketService();
```

#### 2.2 Create Logger (No console.log in TUI)

```typescript
// src/opentui/logger.ts

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: number;
  context?: Record<string, unknown>;
}

class TUILogger {
  private logs: LogEntry[] = [];
  private maxLogs: number = 100;

  log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: Date.now(),
      context,
    };

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // In TUI mode, don't use console.log
    // Logs are accessible via getLogs() for debugging
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, context);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear(): void {
    this.logs = [];
  }
}

export const logger = new TUILogger();
```

### Phase 3: UI Components (Proper Architecture)

#### 3.1 Base Component Class

```typescript
// src/opentui/components/component.ts

import { BoxRenderable, type CliRenderer } from "@opentui/core";
import { Result, RenderError } from "../errors.js";
import { logger } from "../logger.js";
import { signalHandler } from "../signal-handler.js";

export abstract class Component {
  protected readonly renderer: CliRenderer;
  protected readonly element: BoxRenderable;
  protected isDestroyed: boolean = false;

  constructor(renderer: CliRenderer, options: Record<string, unknown>) {
    this.renderer = renderer;
    this.element = new BoxRenderable(renderer, options);

    // Register cleanup
    signalHandler.register(() => this.destroy(), 100);
  }

  /**
   * Update component with new data
   * Returns Result for error handling
   */
  abstract update(data: unknown): Promise<Result<void>>;

  /**
   * Safe update with error handling
   */
  async safeUpdate(data: unknown): Promise<Result<void>> {
    if (this.isDestroyed) {
      return err(new RenderError("Component is destroyed"));
    }

    try {
      return await this.update(data);
    } catch (error) {
      logger.error("Update failed", { component: this.constructor.name, error });
      return err(new RenderError(
        `Update failed: ${error instanceof Error ? error.message : String(error)}`
      ));
    }
  }

  destroy(): void {
    if (!this.isDestroyed) {
      this.isDestroyed = true;
      // Cleanup child elements
      const children = this.element.getChildren();
      for (const child of children) {
        this.element.remove(child.id);
      }
    }
  }

  getElement(): BoxRenderable {
    return this.element;
  }
}
```

#### 3.2 Radar Component (Virtual Scrolling)

```typescript
// src/opentui/components/radar-component.ts

import { ScrollBoxRenderable, TextRenderable, BoxRenderable, t, bold, fg } from "@opentui/core";
import { Component } from "./component.js";
import { Result, ok } from "../errors.js";
import type { MarketInfo } from "../../api.js";
import { getConfig } from "../config.js";

interface RadarData {
  markets: MarketInfo[];
  focusIndex: number;
  outcomeIndex: number;
}

export class RadarComponent extends Component {
  private readonly scrollBox: ScrollBoxRenderable;
  private readonly config = getConfig();

  constructor(renderer: CliRenderer) {
    super(renderer, {
      id: "radar-container",
      flexGrow: 1,
    });

    this.scrollBox = new ScrollBoxRenderable(renderer, {
      id: "radar-scroll",
      scrollY: true,
      scrollX: false,
      flexGrow: 1,
      rootOptions: {
        borderStyle: "single",
        title: "Radar",
      },
    });

    this.element.add(this.scrollBox);
  }

  async update(data: unknown): Promise<Result<void>> {
    const radarData = data as RadarData;

    // Validate input
    if (!Array.isArray(radarData.markets)) {
      throw new Error("Invalid markets data");
    }

    if (radarData.focusIndex < 0 || radarData.focusIndex >= radarData.markets.length) {
      throw new Error("Invalid focus index");
    }

    // Clear efficiently
    await this.clear();

    // Add header
    this.addHeader();

    // Add rows (with virtual scrolling if needed)
    const displayMarkets = this.getDisplayMarkets(radarData.markets);
    for (const market of displayMarkets) {
      this.addMarketRow(market, radarData.focusIndex, radarData.outcomeIndex);
    }

    return ok(undefined);
  }

  private getDisplayMarkets(markets: MarketInfo[]): MarketInfo[] {
    // Virtual scrolling: only show visible items
    const threshold = this.config.performance.virtualScrollThreshold;
    if (markets.length <= threshold) {
      return markets;
    }

    // Show first N markets (in real implementation, calculate visible range)
    return markets.slice(0, threshold);
  }

  private addHeader(): void {
    const header = new BoxRenderable(this.renderer, {
      flexDirection: "row",
      width: "100%",
    });
    header.add(
      new TextRenderable(this.renderer, {
        content: t`${bold("#")} ${bold("Heat")} ${bold("Event")} ${bold("Outcome")}`,
      })
    );
    this.scrollBox.content.add(header);
  }

  private addMarketRow(market: MarketInfo, focusIndex: number, outcomeIndex: number): void {
    const index = this.scrollBox.content.getChildren().length - 1; // -1 for header
    const isSelected = index === focusIndex;

    const row = new BoxRenderable(this.renderer, {
      flexDirection: "row",
      width: "100%",
    });

    const question = market.question?.substring(0, 25) || "Unknown";
    const outcomeName = market.outcomes?.[outcomeIndex]?.substring(0, 12) || "-";

    const rowText = new TextRenderable(this.renderer, {
      content: t`${fg(isSelected ? this.config.colors.selected : this.config.colors.text)(`#${index}`)} ${question} ${fg("#00FFFF")(outcomeName)}`,
    });

    row.add(rowText);
    this.scrollBox.content.add(row);
  }

  private async clear(): Promise<void> {
    const children = this.scrollBox.content.getChildren();
    for (const child of children) {
      this.scrollBox.content.remove(child.id);
    }
  }

  scrollBy(delta: number): void {
    this.scrollBox.scrollBy(delta);
  }

  scrollToIndex(index: number): void {
    // Calculate position (simplified)
    this.scrollBox.scrollTo(index * 2); // Assuming 2 rows per item
  }
}
```

### Phase 4: Application Orchestrator

#### 4.1 Main Application Class

```typescript
// src/opentui/app.ts

import { createCliRenderer, CliRenderer, type KeyEvent } from "@opentui/core";
import { stateManager } from "./state-manager.js";
import { signalHandler } from "./signal-handler.js";
import { marketService } from "./services/market-service.js";
import { logger } from "./logger.js";
import { Result, TUIError } from "./errors.js";
import { RadarComponent } from "./components/radar-component.js";
// ... other components

export class OpenTUIApp {
  private renderer: CliRenderer;
  private components: Map<string, Component> = new Map();
  private isRunning: boolean = false;

  async initialize(): Promise<Result<void>> {
    try {
      // Setup signal handlers first
      signalHandler.setup();

      // Create renderer
      this.renderer = await createCliRenderer({
        exitOnCtrlC: false, // We handle it
        useAlternateScreen: true,
        targetFps: 30,
        backgroundColor: "#000000",
      });

      // Register cleanup
      signalHandler.register(() => this.shutdown(), 10);

      // Create components
      await this.createComponents();

      // Setup keyboard
      this.setupKeyboard();

      // Load initial data
      await this.loadInitialData();

      return ok(undefined);
    } catch (error) {
      return err(new TUIError(
        `Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
        "INIT_ERROR"
      ));
    }
  }

  private async createComponents(): Promise<void> {
    // Create all components
    const radar = new RadarComponent(this.renderer);
    this.components.set("radar", radar);

    // ... create other components

    // Add to renderer
    for (const component of this.components.values()) {
      this.renderer.root.add(component.getElement());
    }
  }

  private setupKeyboard(): void {
    const handler = this.renderer.keyInput;

    handler.on("keypress", async (key: KeyEvent) => {
      try {
        await this.handleKeyPress(key);
      } catch (error) {
        logger.error("Key handler error", { key: key.name, error });
      }
    });

    // Register cleanup
    signalHandler.register(() => {
      handler.removeAllListeners();
    }, 20);
  }

  private async handleKeyPress(key: KeyEvent): Promise<void> {
    switch (key.name) {
      case "q":
      case "c":
        if (key.name === "c" && !key.ctrl) break;
        await this.shutdown();
        signalHandler.shutdown("user");
        break;

      case "n":
        await this.nextMarket();
        break;

      case "p":
        await this.previousMarket();
        break;

      // ... other keys
    }
  }

  private async nextMarket(): Promise<Result<void>> {
    try {
      const state = stateManager.get();
      const newIndex = Math.min(state.focusIndex + 1, state.radar.length - 1);
      stateManager.setFocusIndex(newIndex);
      return ok(undefined);
    } catch (error) {
      return err(new TUIError("Failed to navigate", "NAV_ERROR"));
    }
  }

  private async previousMarket(): Promise<Result<void>> {
    try {
      const state = stateManager.get();
      const newIndex = Math.max(state.focusIndex - 1, 0);
      stateManager.setFocusIndex(newIndex);
      return ok(undefined);
    } catch (error) {
      return err(new TUIError("Failed to navigate", "NAV_ERROR"));
    }
  }

  private async loadInitialData(): Promise<Result<void>> {
    stateManager.setLoading(true);

    const result = await marketService.getRadar(50);

    if (!result.success) {
      stateManager.setError(result.error.message);
      stateManager.setLoading(false);
      return err(result.error);
    }

    stateManager.setRadar(result.data);
    stateManager.setLoading(false);

    // Update UI
    await this.updateUI();

    return ok(undefined);
  }

  private async updateUI(): Promise<void> {
    const state = stateManager.get();

    for (const [name, component] of this.components) {
      const result = await component.safeUpdate(state);
      if (!result.success) {
        logger.error(`Component ${name} update failed`, { error: result.error });
      }
    }

    this.renderer.requestRender();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    this.isRunning = true;
    this.renderer.start();

    // Listen for state changes
    stateManager.on("change", () => {
      if (this.isRunning) {
        this.updateUI().catch((error) => {
          logger.error("UI update failed", { error });
        });
      }
    });
  }

  async shutdown(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;

    // Destroy components
    for (const component of this.components.values()) {
      component.destroy();
    }

    // Destroy renderer
    this.renderer.destroy();

    // Clear state
    stateManager.reset();
  }
}
```

### Phase 5: Entry Point

#### 5.1 Main Export

```typescript
// src/opentui/tui.ts (FINAL VERSION)

import { OpenTUIApp } from "./app.js";
import { Result } from "./errors.js";
import { logger } from "./logger.js";
import type { DashboardOptions } from "../tui-types.js";

export async function runDashboard(options: DashboardOptions): Promise<never> {
  const app = new OpenTUIApp(options);

  // Initialize
  const result = await app.initialize();

  if (!result.success) {
    // Show error and exit
    process.stderr.write(`\nERROR: ${result.error.message}\n\n`);
    process.exit(1);
  }

  // Start
  await app.start();

  // Never returns (until signal)
  return new Promise<never>(() => {
    // Keep process alive
  });
}

// Export for testing
export { OpenTUIApp, stateManager, marketService, logger };
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/opentui/__tests__/market-service.test.ts

import { describe, it, expect, beforeEach } from "bun:test";
import { MarketService } from "../services/market-service.js";
import { loadRadar } from "../../market.js";

// Mock
const mockLoadRadar = loadRadar as unknown as ReturnType<typeof jest.fn>;

describe("MarketService", () => {
  let service: MarketService;

  beforeEach(() => {
    service = new MarketService();
    mockLoadRadar.mockReset();
  });

  it("should fetch radar data", async () => {
    const mockMarkets = [
      { question: "Test", outcomes: ["YES", "NO"], clobTokenIds: ["123"] },
    ];
    mockLoadRadar.mockResolvedValue(mockMarkets);

    const result = await service.getRadar(10);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(mockMarkets);
    }
  });

  it("should handle network errors", async () => {
    mockLoadRadar.mockRejectedValue(new Error("Network error"));

    const result = await service.getRadar(10);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("NETWORK_ERROR");
    }
  });

  it("should cache results", async () => {
    const mockMarkets = [{ question: "Test", outcomes: ["YES", "NO"], clobTokenIds: ["123"] }];
    mockLoadRadar.mockResolvedValue(mockMarkets);

    await service.getRadar(10);
    await service.getRadar(10);

    // Should only call once due to cache
    expect(mockLoadRadar).toHaveBeenCalledTimes(1);
  });
});
```

---

## Implementation Checklist

### Phase 1: Foundation (HIGH PRIORITY)
- [ ] Add signal handlers (SIGINT, SIGTERM, SIGQUIT)
- [ ] Add uncaughtException handler
- [ ] Add unhandledRejection handler
- [ ] Implement Result type
- [ ] Implement error classes
- [ ] Create StateManager
- [ ] Create configuration system
- [ ] Create logger (no console.log)
- [ ] Add cleanup handlers

### Phase 2: Architecture
- [ ] Create service layer
- [ ] Separate API calls from UI
- [ ] Add error boundaries
- [ ] Implement loading states
- [ ] Add input validation
- [ ] Add retry logic

### Phase 3: UI Components
- [ ] Create base Component class
- [ ] Implement RadarComponent with virtual scrolling
- [ ] Implement MarketComponent
- [ ] Implement OrderbookComponent
- [ ] Implement HistoryComponent
- [ ] Implement HoldersComponent
- [ ] Implement AlertsComponent

### Phase 4: Orchestration
- [ ] Create OpenTUIApp class
- [ ] Implement state-driven UI updates
- [ ] Add keyboard handling with error recovery
- [ ] Add debouncing
- [ ] Add performance monitoring

### Phase 5: Testing
- [ ] Unit tests for services
- [ ] Unit tests for components
- [ ] Integration tests for app
- [ ] Error scenario tests
- [ ] Performance tests

### Phase 6: Documentation
- [ ] Update CLAUDE.md with warnings
- [ ] Update README with OpenTUI status
- [ ] Add API documentation
- [ ] Add troubleshooting guide

---

## Final Recommendation

**DO NOT USE OpenTUI IN PRODUCTION**

Use **Ink** instead:
- Production-ready
- React-based (familiar)
- Excellent error handling
- Large community

**Migration Path:**
1. Keep blessed implementation
2. Experiment with Ink for new features
3. Monitor OpenTUI development
4. Reconsider in 2027

---

## Sources

- [OpenTUI GitHub](https://github.com/sst/opentui)
- [OpenTUI Getting Started](https://github.com/sst/opentui/blob/main/packages/core/docs/getting-started.md)
- [Ink - React for CLIs](https://npm.im/ink)
- [Unblessed - Modern Blessed Alternative](https://github.com/vdeantoni/unblessed)
- [TypeScript Best Practices 2025](https://dev.to/mitu_mariam/typescript-best-practices-in-2025-57hb)
- [Error Handling in TypeScript](https://medium.com/@arreyetta/error-handling-in-typescript-best-practices-80cdfe6d06db)
- [Node.js Process Exit Strategies](https://leapcell.org/blog/nodejs-process-exit-strategies)
