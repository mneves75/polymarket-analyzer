# OpenTUI Full Implementation - Engineering Spec v3

**Date:** 2026-01-06
**Status:** ACTIVE DEVELOPMENT
**Priority:** HIGH

---

## Executive Summary

Complete rewrite of the OpenTUI backend to match blessed implementation feature parity while following DEV-GUIDELINES.md and achieving production-quality code.

### Critical Finding

OpenTUI is NOT production-ready per its developers. This implementation is for **experimentation only**.
Use Blessed for production: `bun run dev --tui`

---

## Root Cause Analysis

### Bug: Enter Key Not Working

**Location:** `src/opentui/tui.ts:548-619`
**Issue:** Missing `"return"` case in keyboard handler switch statement
**Fix:** Add Enter key handler that toggles detail modal

### Architectural Issues

| Issue | Severity | Root Cause |
|-------|----------|------------|
| No Enter key handler | CRITICAL | Switch statement missing case |
| No modals (detail/help) | CRITICAL | UI not implemented |
| No state management | HIGH | Global mutable state, no events |
| Tight coupling | HIGH | UI directly calls API |
| No error boundaries | HIGH | Try-catch missing in key paths |
| Missing features | MEDIUM | Blessed has 30+ features not ported |

---

## Target Architecture

```
src/opentui/
├── tui.ts                 # Entry point - runDashboard()
├── app.ts                 # OpenTUIApp orchestrator class
├── config.ts              # Layout and color configuration
├── types.ts               # OpenTUI-specific types
├── errors.ts              # TUI-specific error types
├── result.ts              # Result type for error handling
├── logger.ts              # Stderr logging (no console.log)
├── state/
│   └── state-manager.ts   # Event-driven state management
├── services/
│   └── market-service.ts  # API layer with caching
└── components/
    ├── component.ts       # Base component class
    ├── radar.ts           # Radar panel
    ├── market.ts          # Market info panel
    ├── pulse.ts           # Pulse/stats panel
    ├── orderbook.ts       # Orderbook panel
    ├── history.ts         # History panel
    ├── holders.ts         # Holders panel
    ├── alerts.ts          # Alerts panel
    ├── detail-modal.ts    # Detail modal (Enter key)
    └── help-modal.ts      # Help modal (h key)
```

---

## Phase 1: Foundation (HIGH PRIORITY)

### 1.1 Result Type

```typescript
// src/opentui/result.ts
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

export function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}
```

### 1.2 TUI-Specific Errors

```typescript
// src/opentui/errors.ts
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

export class RenderError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "RENDER_ERROR", false, context);
  }
}

export class DataError extends TUIError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "DATA_ERROR", true, context);
  }
}
```

### 1.3 Configuration

```typescript
// src/opentui/config.ts
export interface TUIConfig {
  layout: {
    headerHeight: number;
    footerHeight: number;
    leftColumnWidth: number;
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
    accent: string;
  };
  performance: {
    targetFps: number;
    debounceMs: number;
    maxRadarItems: number;
  };
}
```

### 1.4 Logger (No console.log)

```typescript
// src/opentui/logger.ts
class TUILogger {
  private logs: LogEntry[] = [];

  error(message: string, context?: Record<string, unknown>): void {
    this.logs.push({ level: "error", message, context, timestamp: Date.now() });
    process.stderr.write(`[ERROR] ${message}\n`);
  }

  // Never use console.log in TUI mode - it corrupts the screen
}
```

---

## Phase 2: State Management

### 2.1 State Manager

Event-driven state management with immutable updates:

```typescript
// src/opentui/state/state-manager.ts
import { EventEmitter } from "events";

interface DashboardState {
  radar: MarketInfo[];
  focusIndex: number;
  outcomeIndex: number;
  orderbook: OrderbookState | null;
  wsStatus: "off" | "connecting" | "connected" | "disconnected";
  bestBid: number | undefined;
  bestAsk: number | undefined;
  midpoint: number | undefined;
  lastTrade: number | undefined;
  isLoading: boolean;
  error: string | null;
  showDetail: boolean;  // CRITICAL: Modal state
  showHelp: boolean;    // CRITICAL: Modal state
}

class StateManager extends EventEmitter {
  private state: DashboardState;

  setShowDetail(show: boolean): void {
    this.state = { ...this.state, showDetail: show };
    this.emit("change", { type: "showDetail", value: show });
  }

  toggleDetail(): void {
    this.setShowDetail(!this.state.showDetail);
  }
}
```

---

## Phase 3: Service Layer

### 3.1 Market Service

```typescript
// src/opentui/services/market-service.ts
import { loadRadar } from "../../market.js";
import type { Result } from "../result.js";

export class MarketService {
  private cache: Map<string, { data: MarketInfo[]; timestamp: number }> = new Map();
  private cacheExpiry = 30_000;

  async getRadar(limit: number): Promise<Result<MarketInfo[]>> {
    // Check cache first
    // Validate response
    // Return Result type
  }
}
```

---

## Phase 4: UI Components

### 4.1 Base Component

```typescript
// src/opentui/components/component.ts
export abstract class Component {
  protected readonly renderer: CliRenderer;
  protected isDestroyed = false;

  abstract render(state: DashboardState): void;
  abstract destroy(): void;
}
```

### 4.2 Detail Modal (CRITICAL)

```typescript
// src/opentui/components/detail-modal.ts
export class DetailModal extends Component {
  private visible = false;
  private scrollBox: ScrollBoxRenderable;

  show(): void {
    this.visible = true;
    this.element.show();
    // Focus for keyboard events
  }

  hide(): void {
    this.visible = false;
    this.element.hide();
  }

  render(state: DashboardState): void {
    if (!state.showDetail) return;
    // Render market detail content
  }
}
```

---

## Phase 5: Keyboard Handler

### 5.1 Enter Key Handler (ROOT CAUSE FIX)

```typescript
// In keyboard handler switch statement
case "return":
case "enter": {
  const state = stateManager.get();
  if (state.showHelp) {
    stateManager.setShowHelp(false);
  } else {
    stateManager.toggleDetail();
  }
  break;
}

case "escape": {
  const state = stateManager.get();
  if (state.showDetail) {
    stateManager.setShowDetail(false);
  } else if (state.showHelp) {
    stateManager.setShowHelp(false);
  }
  break;
}
```

---

## Phase 6: Feature Parity Checklist

Features from Blessed implementation that must be ported:

| Feature | Blessed Location | Status |
|---------|------------------|--------|
| Enter key detail modal | tui.ts:1048-1065 | NOT IMPLEMENTED |
| Escape key close modal | tui.ts:1067-1080 | NOT IMPLEMENTED |
| Help modal (h key) | tui.ts:1082-1093 | NOT IMPLEMENTED |
| Next market (n key) | tui.ts:1095-1116 | PARTIAL |
| Previous market (p key) | tui.ts:1118-1139 | PARTIAL |
| Auto-skip toggle (a key) | tui.ts:1141-1147 | NOT IMPLEMENTED |
| Outcome swap (o key) | tui.ts:1149 | IMPLEMENTED |
| Refresh (r key) | tui.ts:1151-1156 | PARTIAL |
| Filter radar (f key) | tui.ts:1158-1180 | NOT IMPLEMENTED |
| Save snapshot (s key) | tui.ts:1182-1187 | NOT IMPLEMENTED |
| Price alert (t key) | tui.ts:1189-1226 | NOT IMPLEMENTED |
| Export history (e key) | tui.ts:1228-1234 | NOT IMPLEMENTED |
| Scroll j/k | tui.ts:1236-1248 | IMPLEMENTED |

---

## Implementation Order

1. **Create foundation files** (errors.ts, result.ts, config.ts, logger.ts)
2. **Create state manager** with modal state
3. **Create market service** with caching
4. **Create base component** class
5. **Implement DetailModal** and HelpModal components
6. **Update keyboard handler** with Enter/Escape support
7. **Rewrite tui.ts** as orchestrator
8. **Add remaining features** (filter, alerts, export)
9. **Add unit tests**
10. **Verify build**

---

## Acceptance Criteria

- [ ] Enter key opens/closes detail modal
- [ ] Escape key closes modals
- [ ] Help modal works (h key)
- [ ] All 30+ blessed features ported
- [ ] No console.log in TUI mode
- [ ] Type check passes
- [ ] Unit tests for state manager
- [ ] Module loads successfully

---

## Verification Commands

```bash
# Type check
bun tsc --noEmit

# Module load test
bun --eval 'import("./src/opentui/tui.js")'

# Run TUI
OPENTUI=1 bun run dev --tui

# Run tests
bun test src/opentui/
```

---

## Risks

| Risk | Mitigation |
|------|------------|
| OpenTUI not production-ready | Clear warnings, use Blessed for prod |
| Feature creep | Strict checklist adherence |
| Performance issues | Limit radar items, use debouncing |
| Terminal corruption | Signal handlers, cleanup on exit |

---

## Sources

- [OpenTUI GitHub](https://github.com/sst/opentui)
- DEV-GUIDELINES.md - Code quality standards
- PRAGMATIC-RULES.md - Daily defaults
- Blessed implementation: src/tui.ts
