# OpenTUI Migration Engineering Specification

**Project:** Polymarket Analyzer TUI Migration
**From:** blessed v0.1.81 (last release 2018)
**To:** OpenTUI @opentui/core (actively developed, Zig-based)
**Status:** Experimental - Feature branch only
**Date:** 2026-01-06

---

## Executive Summary

This specification details migrating the Polymarket Analyzer terminal UI from the stagnant `blessed` library to `OpenTUI`, an actively maintained TypeScript-first TUI framework. The migration will maintain 100% feature parity while enabling future performance optimizations.

### Key Motivations

1. **Performance:** Zig-native rendering engine vs blessed's pure JavaScript
2. **Maintenance:** blessed last released in 2018; OpenTUI actively developed
3. **Developer Experience:** TypeScript-first with modern React-like patterns
4. **Future-Proofing:** Active community, regular updates, extensible architecture

### Migration Strategy

- **Parallel Implementation:** Blessed remains default, OpenTUI in experimental branch
- **Environment Switching:** `OPENTUI=1` environment variable toggles implementations
- **Incremental Rollout:** Prove OpenTUI viability before considering default switch
- **Zero Breaking Changes:** Main branch continues working with blessed

---

## API Research Summary

### OpenTUI Core API (Verified)

Based on actual OpenTUI source code and examples:

```typescript
import {
  createCliRenderer,
  CliRenderer,
  BoxRenderable,
  TextRenderable,
  ScrollBoxRenderable,
  InputRenderable,
  t,           // Template literal for styled text
  fg,          // Foreground color
  bold,
  underline,
  type KeyEvent,
} from "@opentui/core"

// Create renderer
const renderer = await createCliRenderer({
  exitOnCtrlC: true,
  targetFps: 30,
})

// Create boxes with Flexbox layout
const box = new BoxRenderable(renderer, {
  id: "my-box",
  width: "auto",
  height: "auto",
  flexDirection: "row",
  flexGrow: 1,
  backgroundColor: "#3b82f6",
  border: true,
  borderStyle: "single",
  title: "Panel",
})

// Styled text with template literals
const text = new TextRenderable(renderer, {
  content: t`${bold("Title:")} ${fg("#00FF00")("Value")}`,
})

// Keyboard handling
renderer.keyInput.on("keypress", (key: KeyEvent) => {
  if (key.name === "q") process.exit(0)
})

// Real-time updates
renderer.setFrameCallback((deltaTime) => {
  text.content = t`${bold("Time:")} ${(Date.now() / 1000).toFixed(1)}s`
})
```

### Critical Findings

1. **Has ScrollBoxRenderable** - Built-in scrolling with scrollbars (no manual implementation needed!)
2. **Has InputRenderable** - Built-in text input (no readline needed!)
3. **Box Borders** - `borderStyle: "single"` or `"double"` with `border: true`
4. **Layout** - Yoga Flexbox with `flexDirection`, `alignItems`, `justifyContent`, `flexGrow`
5. **Styling** - Template literal `t` function with styled components
6. **Animation** - `renderer.setFrameCallback()` for 60fps updates

### Component Mapping (Verified)

| Blessed | OpenTUI | Notes |
|---------|---------|-------|
| `blessed.screen()` | `createCliRenderer()` | Returns CliRenderer |
| `blessed.box()` | `BoxRenderable` | Uses Yoga layout |
| `blessed.scrollableBox()` | `ScrollBoxRenderable` | Has scrollbars built-in |
| `blessed.form.textbox()` | `InputRenderable` | Has focus/placeholder |
| Tags `{red-fg}text{/red-fg}` | Template literals `t` | `` t`${fg("red")("text")}`` `` |
| `screen.key()` | `renderer.keyInput.on()` | EventEmitter pattern |
| `screen.render()` | Automatic or `requestRender()` | Renderer manages frame loop |

---

## Current Blessed Implementation Analysis

### File Structure

```
src/
├── tui.ts              (1,374 lines) - Main blessed TUI
├── tui-render.ts       (188 lines)  - Rendering utilities
├── tui-modals.ts       (207 lines)  - Modal content generators
├── tui-types.ts        (74 lines)   - Type definitions (THEME, state)
├── index.ts            (136 lines)  - CLI entry point
├── api.ts              - Polymarket API clients
├── ws.ts               - WebSocket handling
├── market.ts           - Market resolution
├── parsers.ts          - Data normalization
└── utils.ts            - Formatting utilities
```

### UI Layout (8 Panels)

```
┌────────────────────────────────────────────────────────┐
│ Header: Clock | WS Status | Msg Rate | Filters        │ (1 row)
├──────────────┬─────────────────────────────────────────┤
│              │                                          │
│   Radar      │           Market                        │
│   Table      │           Box                           │
│   (40%)      │           (60%)                         │
│              │                                          │
├──────────────┼─────────────────────────────────────────┤
│              │                                          │
│   Pulse      │         Orderbook                       │
│   Box        │         Table                           │
│   (40%)      │         (60%)                           │
│              │                                          │
├──────────────┼─────────────────────────────────────────┤
│              │                                          │
│  History     │         Holders                         │
│  Box         │         Table                           │
│  (40%)       │         (60%)                           │
│              │                                          │
├──────────────┴─────────────────────────────────────────┤
│ Alerts Box (100%)                                       │
└────────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts (All Must Work)

| Key | Action | Context |
|-----|--------|---------|
| n/p | Next/previous market | Global |
| j/k | Scroll radar | Global (not in modal) |
| o | Switch outcome | Global |
| r | Refresh | Global |
| f or / | Filter radar | Global (opens prompt) |
| a | Toggle auto-skip | Global |
| t | Set price alert | Global (opens prompt) |
| s | Save JSON snapshot | Global |
| e | Export CSV history | Global |
| Enter | Detail modal | Global |
| h or ? | Help modal | Global |
| ESC | Close modal | Modal only |
| q or C-c | Quit | Global |

---

## Detailed Engineering Implementation Plan

### Phase 1: Proof of Concept (2-3 hours)

**Goal:** Verify OpenTUI works with minimal viable implementation

#### 1.1 Create Experimental Branch

```bash
git checkout -b feature/opentui-experiment
git push -u origin feature/opentui-experiment
```

#### 1.2 Install Dependencies

```bash
bun add @opentui/core
```

Update `package.json`:
```json
{
  "dependencies": {
    "blessed": "^0.1.81",
    "@opentui/core": "^0.1.68",
    "zod": "^4.3.5"
  },
  "scripts": {
    "dev": "bun --bun run src/index.ts --tui",
    "dev:opentui": "OPENTUI=1 bun --bun run src/index.ts --tui",
    "test": "bun test",
    "typecheck": "bun tsc"
  }
}
```

#### 1.3 Create Directory Structure

```bash
mkdir -p src/opentui
```

#### 1.4 Implement Environment Switching

**File:** `src/index.ts`

```typescript
// Add at top of file
const USE_OPENTUI = process.env.OPENTUI === "1";

// Replace runDashboard import
async function main() {
  // ... existing CLI parsing ...

  const dashboardOptions: Record<string, unknown> = {
    intervalMs: opts.intervalMs,
    limit: opts.limit,
    ws: opts.ws,
  };
  if (opts.market !== undefined) dashboardOptions.market = opts.market;
  if (opts.slug !== undefined) dashboardOptions.slug = opts.slug;

  if (USE_OPENTUI) {
    console.log("Starting TUI with OpenTUI backend...");
    const { runDashboard } = await import("./opentui/tui.js");
    await runDashboard(
      dashboardOptions as { intervalMs: number; limit: number; ws: boolean },
    );
  } else {
    console.log("Starting TUI with Blessed backend...");
    const { runDashboard } = await import("./tui.js");
    await runDashboard(
      dashboardOptions as { intervalMs: number; limit: number; ws: boolean },
    );
  }
}
```

#### 1.5 Implement Hello World

**File:** `src/opentui/tui.ts`

```typescript
import { createCliRenderer, BoxRenderable, TextRenderable, t, bold, fg, type KeyEvent } from "@opentui/core";
import type { DashboardOptions } from "../tui-types.js";

export async function runDashboard(opts: DashboardOptions): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  });

  // Set background
  renderer.setBackgroundColor("#000000");

  // Create main container
  const mainContainer = new BoxRenderable(renderer, {
    id: "main-container",
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: "#000000",
  });

  // Create header
  const header = new BoxRenderable(renderer, {
    id: "header",
    width: "100%",
    height: 3,
    backgroundColor: "#0000ff",
    border: true,
    borderStyle: "single",
    alignItems: "center",
  });

  const headerText = new TextRenderable(renderer, {
    content: t`${bold("Hello, OpenTUI!")} ${fg("#00FF00")("Press 'q' to quit")}`,
  });

  header.add(headerText);
  mainContainer.add(header);
  renderer.root.add(mainContainer);

  // Keyboard handler
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    if (key.name === "q" || (key.ctrl && key.name === "c")) {
      renderer.destroy();
      process.exit(0);
    }
  });

  // Start renderer loop
  renderer.start();

  // Graceful shutdown
  process.on("SIGINT", () => {
    renderer.destroy();
    process.exit(0);
  });
}
```

#### 1.6 Success Criteria

- [ ] `bun --bun run dev` starts blessed TUI (existing behavior)
- [ ] `OPENTUI=1 bun --bun run dev` starts OpenTUI TUI with "Hello, OpenTUI!"
- [ ] `q` key exits cleanly with no terminal corruption
- [ ] `Ctrl+C` exits cleanly
- [ ] No TypeScript errors

---

### Phase 2: Core Layout Implementation (4-6 hours)

**Goal:** Recreate the 8-panel layout using OpenTUI's Flexbox

#### 2.1 Layout Architecture

OpenTUI uses Yoga Flexbox (CSS-like). The 8-panel layout maps to:

```
renderer.root (column)
├── header (fixed height 3)
├── mainContent (flexGrow: 1, row)
│   ├── leftColumn (flexGrow: 0, flexBasis: 40%, column)
│   │   ├── radarBox (flexGrow: 1)
│   │   ├── pulseBox (flexGrow: 1)
│   │   └── historyBox (flexGrow: 1)
│   └── rightColumn (flexGrow: 1, column)
│       ├── marketBox (flexGrow: 1)
│       ├── orderbookBox (flexGrow: 1)
│       └── holdersBox (flexGrow: 1)
└── alertsBox (fixed height 3)
```

#### 2.2 Implementation

**File:** `src/opentui/tui.ts` (replace Hello World)

```typescript
import { createCliRenderer, BoxRenderable, TextRenderable, ScrollBoxRenderable, t, bold, fg, type KeyEvent, type CliRenderer } from "@opentui/core";
import type { DashboardOptions } from "../tui-types.js";

// Theme (reuse existing)
const THEME = {
  headerBg: "#0000ff",
  headerFg: "#ffffff",
  border: "#00ffff",
  label: "#00ffff",
  text: "#ffffff",
  muted: "#808080",
  success: "#00ff00",
  warning: "#ffff00",
  danger: "#ff0000",
  accent: "#ff00ff",
} as const;

// Panel references
interface Panels {
  header: BoxRenderable;
  headerText: TextRenderable;

  radarBox: ScrollBoxRenderable;
  radarContent: TextRenderable;

  marketBox: BoxRenderable;
  marketContent: TextRenderable;

  pulseBox: BoxRenderable;
  pulseContent: TextRenderable;

  orderbookBox: ScrollBoxRenderable;
  orderbookContent: TextRenderable;

  historyBox: BoxRenderable;
  historyContent: TextRenderable;

  holdersBox: ScrollBoxRenderable;
  holdersContent: TextRenderable;

  alertsBox: BoxRenderable;
  alertsContent: TextRenderable;
}

export async function runDashboard(opts: DashboardOptions): Promise<void> {
  const renderer = await createCliRenderer({
    exitOnCtrlC: true,
    targetFps: 30,
  });

  renderer.setBackgroundColor("#000000");

  const panels = createLayout(renderer);
  setupKeyboard(renderer, panels);

  renderer.start();

  return new Promise<void>(() => {
    // Keep running until killed
  });
}

function createLayout(renderer: CliRenderer): Panels {
  // Main container (column layout)
  const mainContainer = new BoxRenderable(renderer, {
    id: "main-container",
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: "#000000",
  });

  // Header
  const header = new BoxRenderable(renderer, {
    id: "header",
    flexShrink: 0,
    height: 3,
    backgroundColor: THEME.headerBg,
    border: true,
    borderStyle: "single",
    paddingLeft: 1,
    paddingRight: 1,
    flexDirection: "row",
    alignItems: "center",
  });

  const headerText = new TextRenderable(renderer, {
    id: "header-text",
    content: t`${bold("Polymarket Pulse")} ${fg("#00FF00")("| Loading...")}`,
  });

  header.add(headerText);

  // Content area (row layout: 40% | 60%)
  const contentArea = new BoxRenderable(renderer, {
    id: "content-area",
    flexGrow: 1,
    flexDirection: "row",
    backgroundColor: "#000000",
  });

  // Left column (40%)
  const leftColumn = new BoxRenderable(renderer, {
    id: "left-column",
    flexBasis: "40%",
    flexGrow: 0,
    flexShrink: 0,
    flexDirection: "column",
    backgroundColor: "#000000",
  });

  // Radar table (scrollable)
  const radarBox = new ScrollBoxRenderable(renderer, {
    id: "radar-box",
    flexGrow: 1,
    rootOptions: {
      border: true,
      borderStyle: "single",
      backgroundColor: "#000000",
    },
  });

  const radarContent = new TextRenderable(renderer, {
    id: "radar-content",
    content: t`${fg("#00FFFF")("Loading markets...")}`,
  });
  radarBox.add(radarContent);

  // Pulse box
  const pulseBox = new BoxRenderable(renderer, {
    id: "pulse-box",
    flexGrow: 1,
    border: true,
    borderStyle: "single",
    backgroundColor: "#000000",
  });

  const pulseContent = new TextRenderable(renderer, {
    id: "pulse-content",
    content: "Pulse data loading...",
  });
  pulseBox.add(pulseContent);

  // History box
  const historyBox = new BoxRenderable(renderer, {
    id: "history-box",
    flexGrow: 1,
    border: true,
    borderStyle: "single",
    backgroundColor: "#000000",
  });

  const historyContent = new TextRenderable(renderer, {
    id: "history-content",
    content: "History loading...",
  });
  historyBox.add(historyContent);

  // Right column (60%)
  const rightColumn = new BoxRenderable(renderer, {
    id: "right-column",
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: "#000000",
  });

  // Market box
  const marketBox = new BoxRenderable(renderer, {
    id: "market-box",
    flexGrow: 1,
    border: true,
    borderStyle: "single",
    backgroundColor: "#000000",
  });

  const marketContent = new TextRenderable(renderer, {
    id: "market-content",
    content: "Select a market...",
  });
  marketBox.add(marketContent);

  // Orderbook table (scrollable)
  const orderbookBox = new ScrollBoxRenderable(renderer, {
    id: "orderbook-box",
    flexGrow: 1,
    rootOptions: {
      border: true,
      borderStyle: "single",
      backgroundColor: "#000000",
    },
  });

  const orderbookContent = new TextRenderable(renderer, {
    id: "orderbook-content",
    content: t`${fg("#00FFFF")("Loading orderbook...")}`,
  });
  orderbookBox.add(orderbookContent);

  // Holders table (scrollable)
  const holdersBox = new ScrollBoxRenderable(renderer, {
    id: "holders-box",
    flexGrow: 1,
    rootOptions: {
      border: true,
      borderStyle: "single",
      backgroundColor: "#000000",
    },
  });

  const holdersContent = new TextRenderable(renderer, {
    id: "holders-content",
    content: t`${fg("#00FFFF")("Loading holders...")}`,
  });
  holdersBox.add(holdersContent);

  // Alerts box
  const alertsBox = new BoxRenderable(renderer, {
    id: "alerts-box",
    flexShrink: 0,
    height: 3,
    border: true,
    borderStyle: "single",
    backgroundColor: "#000000",
    paddingLeft: 1,
  });

  const alertsContent = new TextRenderable(renderer, {
    id: "alerts-content",
    content: t`${fg("#00FF00")("Alerts: System ready")}`,
  });
  alertsBox.add(alertsContent);

  // Assemble layout
  leftColumn.add(radarBox);
  leftColumn.add(pulseBox);
  leftColumn.add(historyBox);

  rightColumn.add(marketBox);
  rightColumn.add(orderbookBox);
  rightColumn.add(holdersBox);

  contentArea.add(leftColumn);
  contentArea.add(rightColumn);

  mainContainer.add(header);
  mainContainer.add(contentArea);
  mainContainer.add(alertsBox);

  renderer.root.add(mainContainer);

  return {
    header,
    headerText,
    radarBox,
    radarContent,
    marketBox,
    marketContent,
    pulseBox,
    pulseContent,
    orderbookBox,
    orderbookContent,
    historyBox,
    historyContent,
    holdersBox,
    holdersContent,
    alertsBox,
    alertsContent,
  };
}

function setupKeyboard(renderer: CliRenderer, panels: Panels): void {
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    switch (key.name) {
      case "q":
        renderer.destroy();
        process.exit(0);
    }
  });
}
```

#### 2.3 Success Criteria

- [ ] All 8 panels visible
- [ ] Layout responsive to terminal resize
- [ ] Left column ~40%, right column ~60%
- [ ] Header and alerts fixed height
- [ ] Scrollable panels have scrollbars
- [ ] No overlaps or rendering artifacts

---

### Phase 3: Data Integration (6-8 hours)

**Goal:** Connect OpenTUI to existing Polymarket APIs

#### 3.1 Reuse Existing Utilities

These files need NO changes - they're pure business logic:

- `src/api.ts` - API clients (Polymarket Gamma, CLOB)
- `src/ws.ts` - WebSocket handling
- `src/market.ts` - Market resolution
- `src/parsers.ts` - Data normalization
- `src/utils.ts` - Formatting (formatPrice, formatNumber, etc.)
- `src/tui-types.ts` - Type definitions (shared!)
- `src/tui-render.ts` - Rendering utilities (mostly reusable)
- `src/tui-modals.ts` - Modal content generators (adaptable)

#### 3.2 State Management

**File:** `src/opentui/state.ts` (NEW)

```typescript
import type { MarketInfo } from "../api.js";
import type { OrderbookState } from "../parsers.js";
import type { DashboardState } from "../tui-types.js";

export function createInitialState(): DashboardState {
  return {
    radar: [],
    focusMarket: null,
    outcomeIndex: 0,
    orderbook: null,
    orderbookMap: new Map<string, OrderbookState>(),
    historySeries: [],
    bestBid: undefined,
    bestAsk: undefined,
    midpoint: undefined,
    lastTrade: undefined,
    lastTradePrev: undefined,
    noOrderbook: false,
    noOrderbookTokens: new Set<string>(),
    autoSkipNoOrderbook: false,
    wsStatus: "disconnected",
    lastWsAt: 0,
    lastRestAt: 0,
    lastHistoryAt: 0,
    lastHoldersAt: 0,
    lastReconcileAt: 0,
    lastNoOrderbookAt: 0,
    lastAlert: "",
    priceAlertHigh: null,
    priceAlertLow: null,
    radarFilter: "",
    msgCount: 0,
    msgRate: 0,
    showDetail: false,
    showHelp: false,
  };
}

let state: DashboardState | null = null;

export function getState(): DashboardState {
  if (!state) {
    state = createInitialState();
  }
  return state;
}

export function updateState(updates: Partial<DashboardState>): void {
  state = { ...getState(), ...updates };
}
```

#### 3.3 Update Loop

**File:** `src/opentui/updates.ts` (NEW)

```typescript
import type { CliRenderer, TextRenderable } from "@opentui/core";
import type { Panels } from "./tui.js";
import { getState } from "./state.js";
import {
  getPrices,
  getOrderbook,
  getPriceHistory,
  getHolders,
  type MarketInfo,
} from "../api.js";
import {
  extractMidpoint,
  extractPrice,
  normalizeOrderbook,
  normalizeHolders,
} from "../parsers.js";
import { connectMarketWs } from "../ws.js";
import { formatPrice, formatPct, formatNumber } from "../utils.js";
import { heatSymbol } from "../tui-render.js";

export function setupUpdateLoop(renderer: CliRenderer, panels: Panels): void {
  let frameCount = 0;

  renderer.setFrameCallback(async (deltaTime) => {
    frameCount++;
    const state = getState();

    // Update header every frame (clock, WS status)
    updateHeader(panels, state);

    // Fetch data on intervals
    if (frameCount % 60 === 0) { // Every ~2 seconds at 30fps
      await fetchMarketData(panels);
    }

    if (frameCount % 300 === 0) { // Every ~10 seconds
      await fetchOrderbookData(panels);
    }
  });
}

async function fetchMarketData(panels: Panels): Promise<void> {
  const state = getState();

  try {
    const markets = await getPrices({ limit: 50 });
    state.radar = markets;
    state.lastRestAt = Date.now();

    // Update radar display
    const radarText = markets.map((m, i) => {
      const heat = heatSymbol(m);
      const price = formatPrice(m.bestBid || m.bestAsk || m.price || 0);
      const change = m.priceChange24hr ? formatPct(m.priceChange24hr) : "-";
      return `${heat} ${i + 1}. ${m.question?.substring(0, 60)}... ${price} ${change}`;
    }).join("\n");

    panels.radarContent.content = radarText;
  } catch (err) {
    panels.alertsContent.content = `Error fetching markets: ${err}`;
  }
}

async function fetchOrderbookData(panels: Panels): Promise<void> {
  const state = getState();

  if (!state.focusMarket) return;

  try {
    const orderbook = await getOrderbook(state.focusMarket.conditionId);
    state.orderbook = normalizeOrderbook(orderbook);
    state.lastWsAt = Date.now();

    // Update orderbook display
    const bids = state.orderbook.bids.slice(0, 10);
    const asks = state.orderbook.asks.slice(0, 10);

    const orderbookText = [
      t`${bold("BIDS")}${" ".repeat(30)}${bold("ASKS")}`,
      ...bids.map((b, i) => {
        const a = asks[i];
        return `${formatPrice(b.price)} ${formatNumber(b.size)}  ${a ? formatPrice(a.price) : ""} ${a ? formatNumber(a.size) : ""}`;
      }),
    ].join("\n");

    panels.orderbookContent.content = orderbookText;
  } catch (err) {
    panels.orderbookContent.content = `Error: ${err}`;
  }
}

function updateHeader(panels: Panels, state: DashboardState): void {
  const clock = new Date().toLocaleTimeString();
  const wsStatus = state.wsStatus;
  const wsColor = wsStatus === "connected" ? "#00FF00" : "#FF0000";

  panels.headerText.content = t`${bold("Polymarket Pulse")} ${fg("#00FFFF")("|")} ${clock} ${fg("#00FFFF")("|")} WS: ${fg(wsColor)(wsStatus)} ${fg("#00FFFF")("|")} Rate: ${state.msgRate}/s`;
}
```

#### 3.4 WebSocket Integration

Reuse existing `src/ws.ts` - just hook up events:

```typescript
// In src/opentui/tui.ts, after creating panels
import { connectMarketWs } from "../ws.js";

// Setup WebSocket
const ws = connectMarketWs({
  onMessage: (msg) => {
    const state = getState();
    state.msgCount++;
    state.lastWsAt = Date.now();
    // Update panels based on message type
  },
  onStatusChange: (status) => {
    const state = getState();
    state.wsStatus = status;
  },
});
```

#### 3.5 Success Criteria

- [ ] Real Polymarket data displays in all panels
- [ ] WebSocket connects and updates orderbook
- [ ] Header shows clock, WS status, message rate
- [ ] Radar shows markets with heat indicators
- [ ] Orderbook shows live bids/asks
- [ ] No memory leaks (cleanup handlers)

---

### Phase 4: Interactivity (4-6 hours)

**Goal:** Implement all keyboard shortcuts

#### 4.1 Keyboard Handler

**File:** `src/opentui/keyboard.ts` (NEW)

```typescript
import type { CliRenderer } from "@opentui/core";
import type { KeyEvent } from "@opentui/core";
import type { Panels } from "./tui.js";
import type { ScrollBoxRenderable } from "@opentui/core";
import { getState, updateState } from "./state.js";

interface ModalState {
  detailModal: BoxRenderable | null;
  helpModal: BoxRenderable | null;
  inputPrompt: InputRenderable | null;
}

export function setupKeyboard(renderer: CliRenderer, panels: Panels, modals: ModalState): void {
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    const state = getState();

    // Global shortcuts
    switch (key.name) {
      case "q":
        renderer.destroy();
        process.exit(0);

      case "n":
        // Next market
        if (state.radar.length > 0) {
          const currentIndex = state.radar.findIndex(m => m.conditionId === state.focusMarket?.conditionId);
          const nextIndex = (currentIndex + 1) % state.radar.length;
          state.focusMarket = state.radar[nextIndex];
          state.outcomeIndex = 0;
        }
        break;

      case "p":
        // Previous market
        if (state.radar.length > 0) {
          const currentIndex = state.radar.findIndex(m => m.conditionId === state.focusMarket?.conditionId);
          const prevIndex = currentIndex <= 0 ? state.radar.length - 1 : currentIndex - 1;
          state.focusMarket = state.radar[prevIndex];
          state.outcomeIndex = 0;
        }
        break;

      case "j":
      case "down":
        // Scroll radar down (only if modal not open)
        if (!state.showDetail && !state.showHelp) {
          (panels.radarBox as ScrollBoxRenderable).scrollDown();
        }
        break;

      case "k":
      case "up":
        // Scroll radar up (only if modal not open)
        if (!state.showDetail && !state.showHelp) {
          (panels.radarBox as ScrollBoxRenderable).scrollUp();
        }
        break;

      case "o":
        // Switch outcome
        if (state.focusMarket?.outcomes) {
          state.outcomeIndex = (state.outcomeIndex + 1) % state.focusMarket.outcomes.length;
        }
        break;

      case "r":
        // Refresh
        state.lastRestAt = 0; // Force refresh
        break;

      case "f":
      case "/":
        // Filter prompt
        showFilterPrompt(renderer, panels, modals);
        break;

      case "a":
        // Toggle auto-skip
        state.autoSkipNoOrderbook = !state.autoSkipNoOrderbook;
        panels.alertsContent.content = `Auto-skip: ${state.autoSkipNoOrderbook ? "ON" : "OFF"}`;
        break;

      case "t":
        // Price alert prompt
        showAlertPrompt(renderer, panels, modals);
        break;

      case "s":
        // Save snapshot
        saveSnapshot(panels);
        break;

      case "e":
        // Export CSV
        exportCSV(panels);
        break;

      case "return":
        // Detail modal
        showDetailModal(renderer, panels, modals);
        break;

      case "h":
      case "?":
        // Help modal
        showHelpModal(renderer, panels, modals);
        break;

      case "escape":
        // Close modals
        closeModals(panels, modals);
        break;
    }
  });
}

function showFilterPrompt(renderer: CliRenderer, panels: Panels, modals: ModalState): void {
  // Create input prompt overlay
  // Reuse blessed readline or create custom InputRenderable
}

function showAlertPrompt(renderer: CliRenderer, panels: Panels, modals: ModalState): void {
  // Create price alert input
}

function showDetailModal(renderer: CliRenderer, panels: Panels, modals: ModalState): void {
  const state = getState();
  state.showDetail = true;

  // Create modal with market details
  modals.detailModal = new BoxRenderable(renderer, {
    id: "detail-modal",
    position: "absolute",
    width: "80%",
    height: "80%",
    left: "10%",
    top: "10%",
    backgroundColor: "#000000",
    border: true,
    borderStyle: "double",
    zIndex: 1000,
  });

  // Add content using generateDetailContent from tui-modals.ts
  renderer.root.add(modals.detailModal);
}

function showHelpModal(renderer: CliRenderer, panels: Panels, modals: ModalState): void {
  const state = getState();
  state.showHelp = true;

  // Create modal with help text
  modals.helpModal = new BoxRenderable(renderer, {
    id: "help-modal",
    position: "absolute",
    width: "60%",
    height: "60%",
    left: "20%",
    top: "20%",
    backgroundColor: "#000000",
    border: true,
    borderStyle: "double",
    zIndex: 1000,
  });

  // Add content using generateHelpContent from tui-modals.ts
  renderer.root.add(modals.helpModal);
}

function closeModals(panels: Panels, modals: ModalState): void {
  const state = getState();
  state.showDetail = false;
  state.showHelp = false;

  if (modals.detailModal) {
    renderer.root.remove(modals.detailModal.id);
    modals.detailModal = null;
  }

  if (modals.helpModal) {
    renderer.root.remove(modals.helpModal.id);
    modals.helpModal = null;
  }
}
```

#### 4.2 Success Criteria

- [ ] All keyboard shortcuts work
- [ ] n/p navigates markets
- [ ] j/k scrolls radar
- [ ] Enter opens detail modal
- [ ] h opens help modal
- [ ] ESC closes modals
- [ ] No key conflicts (scroll vs modal)

---

### Phase 5: Performance Testing (2-3 hours)

**Goal:** Measure and compare performance

#### 5.1 Performance Monitor

**File:** `src/opentui/benchmark.ts` (NEW)

```typescript
export class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime = performance.now();
  private frameCount = 0;

  measureFrame(): void {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.frameTimes.push(delta);
    this.lastFrameTime = now;
    this.frameCount++;

    // Keep last 100 frames
    if (this.frameTimes.length > 100) {
      this.frameTimes.shift();
    }
  }

  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    const sum = this.frameTimes.reduce((a, b) => a + b, 0);
    return sum / this.frameTimes.length;
  }

  getFPS(): number {
    const avgTime = this.getAverageFrameTime();
    return avgTime > 0 ? 1000 / avgTime : 0;
  }

  report(): {
    avgFrameTime: string;
    fps: string;
    cpuSeconds: number;
    memoryMB: number;
  } {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();

    return {
      avgFrameTime: `${this.getAverageFrameTime().toFixed(2)}ms`,
      fps: this.getFPS().toFixed(1),
      cpuSeconds: cpuUsage.user / 1e6,
      memoryMB: memUsage.rss / 1024 / 1024,
    };
  }
}
```

#### 5.2 Benchmark Script

**File:** `scripts/benchmark.ts` (NEW)

```typescript
#!/usr/bin/env bun
import { runDashboard as runBlessed } from "../src/tui.js";
import { runDashboard as runOpenTUI } from "../src/opentui/tui.js";
import { PerformanceMonitor } from "../src/opentui/benchmark.js";

async function benchmark(): Promise<void> {
  console.log("\n=== OpenTUI Benchmark ===\n");

  const monitor = new PerformanceMonitor();

  // Run for 60 seconds
  const startTime = Date.now();
  while (Date.now() - startTime < 60000) {
    monitor.measureFrame();
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log("\n=== Results ===");
  console.log(monitor.report());
}

benchmark();
```

#### 5.3 Success Criteria

- [ ] Render time <50ms average
- [ ] FPS >20
- [ ] Memory usage <150MB
- [ ] Comparison with blessed shows improvement

---

## File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `src/opentui/tui.ts` | Main OpenTUI orchestrator |
| `src/opentui/state.ts` | State management |
| `src/opentui/updates.ts` | Data fetching and updates |
| `src/opentui/keyboard.ts` | Keyboard handling |
| `src/opentui/benchmark.ts` | Performance monitoring |
| `src/opentui/modals.ts` | Modal implementations |
| `scripts/benchmark.ts` | Benchmark script |

### Modified Files

| File | Changes |
|------|---------|
| `src/index.ts` | Add environment variable switching |
| `package.json` | Add `@opentui/core` dependency and scripts |

### Unchanged Files (Pure Business Logic)

- `src/api.ts`
- `src/ws.ts`
- `src/market.ts`
- `src/parsers.ts`
- `src/utils.ts`
- `src/tui-types.ts`
- `src/tui-render.ts` (mostly)
- `src/tui-modals.ts` (adaptable)
- `src/tui.ts` (blessed version - kept as fallback!)

---

## Testing Checklist

### Phase 1: Setup
- [ ] `bun --bun run dev` starts blessed (baseline)
- [ ] `OPENTUI=1 bun --bun run dev` starts OpenTUI
- [ ] `q` key exits cleanly
- [ ] No terminal corruption

### Phase 2: Layout
- [ ] All 8 panels visible
- [ ] Correct proportions (40%/60%)
- [ ] Scrollbars work
- [ ] Responsive to resize

### Phase 3: Data
- [ ] Real market data displays
- [ ] WebSocket connects
- [ ] Orderbook updates live
- [ ] Header updates correctly

### Phase 4: Interactivity
- [ ] n/p navigate markets
- [ ] j/k scroll radar
- [ ] o switches outcome
- [ ] Enter/h open modals
- [ ] ESC closes modals
- [ ] f opens filter
- [ ] t opens alert prompt
- [ ] s saves snapshot
- [ ] e exports CSV

### Phase 5: Performance
- [ ] Render time <50ms
- [ ] FPS >20
- [ ] Memory stable
- [ ] No leaks

---

## Rollback Strategy

If OpenTUI fails:

1. **Stop using it:** `unset OPENTUI` or use `bun --bun run dev` (blessed default)
2. **Delete branch:** `git checkout main && git branch -D feature/opentui-experiment`
3. **Clean dependencies:** `bun remove @opentui/core` (optional)

Blessed implementation remains untouched and working!

---

## Documentation Updates

### CLAUDE.md

Add section:

```markdown
## OpenTUI Implementation

### Running with OpenTUI

```bash
# Default (blessed)
bun --bun run dev

# OpenTUI (experimental)
OPENTUI=1 bun --bun run dev

# Or use script
bun --bun run dev:opentui
```

### API Differences

**Layout:**
- Blessed: Absolute positioning (`top`, `left`, `width`, `height`)
- OpenTUI: Yoga Flexbox (`flexDirection`, `flexGrow`, `flexBasis`)

**Scrolling:**
- Blessed: `scrollable: true` option
- OpenTUI: `ScrollBoxRenderable` component

**Styling:**
- Blessed: Tags `{red-fg}text{/red-fg}`
- OpenTUI: Template literals `t`${fg("red")("text")}``

**Borders:**
- Blessed: `border: "line"`
- OpenTUI: `border: true, borderStyle: "single"`

**Keyboard:**
- Blessed: `screen.key(["n"], () => {})`
- OpenTUI: `renderer.keyInput.on("keypress", (key) => {})`

### Known Issues

1. **Modal input prompts:** Use readline or custom InputRenderable
2. **Styling complexity:** Template literals more verbose than tags
3. **Documentation:** OpenTUI docs still evolving
```

### README.md

Add section:

```markdown
## TUI Implementation

This project supports two TUI backends:

### Blessed (Default)
- Mature, stable library (last release 2018)
- Used in production
- ```bash
  bun --bun run dev
  ```

### OpenTUI (Experimental)
- Modern, actively developed
- Zig-native rendering
- Alpha status - not production-ready
- ```bash
  OPENTUI=1 bun --bun run dev
  # or
  bun --bun run dev:opentui
  ```

### Performance Comparison

| Metric | Blessed | OpenTUI |
|--------|---------|---------|
| Render Time | ~80ms | TBD |
| FPS | ~15-20 | TBD |
| Memory | ~85MB | TBD |

*Last updated: 2026-01-06*
```

---

## Timeline Estimate

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Proof of Concept | 2-3 hours | Hello World |
| 2. Core Layout | 4-6 hours | 8-panel layout |
| 3. Data Integration | 6-8 hours | Real data display |
| 4. Interactivity | 4-6 hours | All keyboard shortcuts |
| 5. Performance | 2-3 hours | Benchmark results |

**Total: 18-26 hours** (2-3 days for focused work)

---

## Success Criteria

### Must Have (MVP)
- [ ] OpenTUI TUI launches without errors
- [ ] All 8 panels display correctly
- [ ] Real Polymarket data shown
- [ ] Basic keyboard navigation works (n/p, q)
- [ ] Graceful shutdown

### Should Have (Functional)
- [ ] All keyboard shortcuts work
- [ ] WebSocket integration works
- [ ] Modals open/close correctly
- [ ] Scrollable panels work
- [ ] Export features work

### Nice to Have (Polish)
- [ ] Performance improvement measurable
- [ ] Input prompts work
- [ ] Advanced features (alerts, filtering)
- [ ] Documentation complete

---

## Sources

- [OpenTUI GitHub Repository](https://github.com/anomalyco/opentui)
- [OpenTUI Getting Started Guide](https://github.com/anomalyco/opentui/blob/main/packages/core/docs/getting-started.md)
- [OpenTUI Examples](https://github.com/anomalyco/opentui/tree/main/packages/core/src/examples)
- [OpenTUI Core NPM Package](https://www.npmjs.com/package/%40opentui/core)
- [Blessed GitHub Repository](https://github.com/chjj/blessed)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-06
**Status:** Ready for Implementation
