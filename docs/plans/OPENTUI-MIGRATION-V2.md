# OpenTUI Migration Plan v2 - CORRECTED

## Executive Summary

**Self-Critique**: Previous implementation was **completely wrong**. After thorough research of actual OpenTUI source code and type definitions, multiple fundamental errors were identified.

**Root Cause**: Insufficient research of actual API. Made assumptions based on incomplete documentation instead of reading source code and type definitions.

**New Approach**: 100% API-accurate implementation based on actual type definitions and verified imports.

---

## Critical Errors Found

### Error 1: Wrong/Non-existent Keyboard API
```typescript
// WRONG - renderer.onKey() does not exist
renderer.onKey(["n"], () => nextMarket());

// CORRECT - use renderer.keyInput EventEmitter
renderer.keyInput.on("keypress", (key: KeyEvent) => {
  if (key.name === "n") nextMarket();
});
```

### Error 2: Incorrect ScrollBox API Usage
```typescript
// WRONG - rootOptions structure, border styling
const radarBox = new ScrollBoxRenderable(renderer, {
  id: "radar-box",
  flexGrow: 1,
  rootOptions: {
    border: true,  // WRONG
    borderStyle: "single",  // WRONG
    backgroundColor: "#000000",  // WRONG
  },
});

// CORRECT - ScrollBox creates nested BoxRenderables automatically
const radarBox = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  scrollX: false,
  rootOptions: {
    borderStyle: "single",  // Goes on Box, not rootOptions
  }
});
```

### Error 3: Wrong Positioning/Layout Mix
```typescript
// WRONG - mixing absolute and flex incorrectly
const leftColumn = new BoxRenderable(renderer, {
  flexBasis: 40,  // This is actually correct! flexBasis can be number
  flexGrow: 0,
  flexShrink: 0,
  flexDirection: "column",
});

// CORRECT - but need to understand that WITHOUT position: "absolute",
// Yoga Flexbox is used. WITH position: "absolute", absolute positioning is used.
```

### Error 4: Not Using Template Literal Styling
```typescript
// WRONG - plain string content
const text = new TextRenderable(renderer, {
  content: "Market Price",
});

// CORRECT - use t`` template literal for styled text
import { t, bold, fg } from "@opentui/core";
const text = new TextRenderable(renderer, {
  content: t`${bold("Market Price")} ${fg("#00FF00")("$0.65")}`,
});
```

### Error 5: Missing Construct/Component System
OpenTUI has TWO ways to build UI:
1. **Raw Renderables**: `new BoxRenderable(renderer, options)`
2. **Constructs/Components**: `Box({ width: 20 }, Text({ content: "hi" }))`

My implementation only used raw renderables and missed the cleaner component approach.

### Error 6: Color Handling
```typescript
// WRONG - hex strings directly (might work but not recommended)
backgroundColor: "#000000",

// BETTER - use parseColor or RGBA class
import { parseColor, RGBA } from "@opentui/core";
backgroundColor: parseColor("#000000"),
// or
backgroundColor: new RGBA.fromHex("#000000"),
```

---

## Verified OpenTUI API

### Imports (ALL from "@opentui/core")

```typescript
import {
  // Core
  createCliRenderer,
  CliRenderer,
  type KeyEvent,
  type CliRendererConfig,

  // Renderables (classes)
  BoxRenderable,
  TextRenderable,
  InputRenderable,
  ScrollBoxRenderable,

  // Constructs (functions that create VNodes)
  Box,
  Text,
  Input,

  // Styling (template literal functions)
  t,
  bold,
  underline,
  italic,
  fg,
  bg,

  // Colors
  RGBA,
  parseColor,

  // Events
  type MouseEvent,
  type KeyEvent,

  // Types
  type Renderable,
  RootRenderable,
} from "@opentui/core";
```

### Create Renderer

```typescript
const renderer = await createCliRenderer({
  exitOnCtrlC: false,  // Let us handle exit manually
  useAlternateScreen: true,
  targetFps: 30,
  backgroundColor: "#000000",
});

// Get keyboard handler
const keyHandler = renderer.keyInput;
keyHandler.on("keypress", (key: KeyEvent) => {
  console.log("Key:", key.name, "Ctrl:", key.ctrl);
});

// Start render loop
renderer.start();

// Cleanup
renderer.destroy();
```

### BoxRenderable API

```typescript
interface BoxOptions {
  // Identity
  id?: string;

  // Layout (Yoga Flexbox)
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | "auto";
  flexDirection?: "row" | "column";
  flexWrap?: "wrap" | "nowrap";
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  alignSelf?: string;
  position?: "relative" | "absolute";

  // Dimensions
  width?: number | "auto" | `${number}%`;
  height?: number | "auto" | `${number}%`;
  minWidth?: number | "auto" | `${number}%`;
  minHeight?: number | "auto" | `${number}%`;
  maxWidth?: number | "auto" | `${number}%`;
  maxHeight?: number | "auto" | `${number}%`;

  // Position (for absolute positioning)
  top?: number | "auto" | `${number}%`;
  left?: number | "auto" | `${number}%`;
  right?: number | "auto" | `${number}%`;
  bottom?: number | "auto" | `${number}%`;

  // Margins/Padding
  margin?: number | "auto" | `${number}%`;
  marginTop?: number | "auto" | `${number}%`;
  marginBottom?: number | "auto" | `${number}%`;
  marginLeft?: number | "auto" | `${number}%`;
  marginRight?: number | "auto" | `${number}%`;
  padding?: number | `${number}%`;
  paddingTop?: number | `${number}%`;
  paddingBottom?: number | `${number}%`;
  paddingLeft?: number | `${number}%`;
  paddingRight?: number | `${number}%`;

  // Appearance
  backgroundColor?: string | RGBA;
  border?: boolean | BorderSides[];
  borderStyle?: "single" | "double" | "rounded" | "dashed" | "solid";
  borderColor?: string | RGBA;
  title?: string;
  titleAlignment?: "left" | "center" | "right";
  focusedBorderColor?: string | RGBA;
  shouldFill?: boolean;

  // Gap (Yoga gap)
  gap?: number | `${number}%`;
  rowGap?: number | `${number}%`;
  columnGap?: number | `${number}%`;

  // Visibility
  visible?: boolean;
  opacity?: number;

  // Events
  onMouseDown?: (event: MouseEvent) => void;
  onMouseUp?: (event: MouseEvent) => void;
  onMouseMove?: (event: MouseEvent) => void;
  onKeyDown?: (key: KeyEvent) => void;
}

// Usage
const panel = new BoxRenderable(renderer, {
  id: "panel",
  width: 30,
  height: 10,
  backgroundColor: "#000044",
  borderStyle: "single",
  title: "Markets",
  titleAlignment: "center",
});

// Add to parent
renderer.root.add(panel);
// or
parentRenderable.add(panel);
```

### TextRenderable API

```typescript
interface TextOptions {
  id?: string;
  content?: string | StyledText;  // StyledText from t`` template

  // Colors
  fg?: string | RGBA;
  bg?: string | RGBA;

  // Text attributes (bitwise OR)
  attributes?: number;  // TextAttributes.BOLD | TextAttributes.UNDERLINE

  // Layout (same as Box)
  width?: number | "auto" | `${number}%`;
  height?: number | "auto" | `${number}%`;
  // ... all layout options from BoxOptions

  // Events
  onSelect?: (selection: Selection) => void;
}

import { TextAttributes, t, bold, fg, underline } from "@opentui/core";

// Plain text
const text1 = new TextRenderable(renderer, {
  content: "Hello, World!",
});

// Styled text with attributes
const text2 = new TextRenderable(renderer, {
  content: "Important!",
  attributes: TextAttributes.BOLD | TextAttributes.UNDERLINE,
  fg: "#FFFF00",
});

// Template literal styled text
const text3 = new TextRenderable(renderer, {
  content: t`${bold("Price:")} ${fg("#00FF00")("$0.65")} ${underline("+5%")}`,
});
```

### ScrollBoxRenderable API

```typescript
interface ScrollBoxOptions extends BoxOptions {
  // Scroll options
  scrollX?: boolean;
  scrollY?: boolean;
  stickyScroll?: boolean;
  viewportCulling?: boolean;

  // Nested options for internal structure
  rootOptions?: BoxOptions;      // Outer container
  wrapperOptions?: BoxOptions;   // Wraps viewport
  viewportOptions?: BoxOptions;  // Clipping viewport
  contentOptions?: BoxOptions;   // Actual content container
  scrollbarOptions?: Omit<ScrollBarOptions, "orientation">;
  verticalScrollbarOptions?: Omit<ScrollBarOptions, "orientation">;
  horizontalScrollbarOptions?: Omit<ScrollBarOptions, "orientation">;
}

// Usage - basic
const scrollBox = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  scrollX: false,
  width: 40,
  height: 20,
  borderStyle: "single",
});

// Add content to the internal content container
scrollBox.content.add(new TextRenderable(renderer, { content: "Line 1" }));
scrollBox.content.add(new TextRenderable(renderer, { content: "Line 2" }));

// Scroll methods
scrollBox.scrollTo(10);  // Scroll to Y position 10
scrollBox.scrollTo({ x: 0, y: 10 });  // Scroll to X,Y
scrollBox.scrollBy(5);  // Scroll down 5 lines
scrollBox.scrollBy({ x: 0, y: -5 });  // Scroll up 5 lines

// Properties
scrollBox.scrollTop = 10;  // Direct property access
scrollBox.scrollLeft = 0;
console.log(scrollBox.scrollHeight);  // Total scrollable height
```

### InputRenderable API

```typescript
interface InputRenderableOptions {
  id?: string;
  value?: string;
  placeholder?: string;
  maxLength?: number;

  // Colors
  backgroundColor?: string | RGBA;
  textColor?: string | RGBA;
  focusedBackgroundColor?: string | RGBA;
  focusedTextColor?: string | RGBA;
  placeholderColor?: string | RGBA;
  cursorColor?: string | RGBA;

  // Dimensions
  width?: number | "auto" | `${number}%`;
  height?: number | "auto" | `${number}%`;

  // Events
  onKeyDown?: (key: KeyEvent) => boolean | void;
}

import { InputRenderable, InputRenderableEvents } from "@opentui/core";

const input = new InputRenderable(renderer, {
  width: 30,
  placeholder: "Enter market slug...",
  placeholderColor: "#666666",
  focusedBackgroundColor: "#000033",
});

// Events
input.on(InputRenderableEvents.INPUT, (value: string) => {
  console.log("Input:", value);
});

input.on(InputRenderableEvents.CHANGE, (value: string) => {
  console.log("Changed:", value);
});

input.on(InputRenderableEvents.ENTER, (value: string) => {
  console.log("Submitted:", value);
});

// Focus
input.focus();
```

### Keyboard Input Handling

```typescript
import { type KeyEvent } from "@opentui/core";

const keyHandler = renderer.keyInput;

keyHandler.on("keypress", (key: KeyEvent) => {
  // Key properties
  console.log(key.name);      // "a", "escape", "enter", "c"
  console.log(key.sequence);  // raw character sequence
  console.log(key.ctrl);      // true if Ctrl held
  console.log(key.shift);     // true if Shift held
  console.log(key.meta);      // true if Alt/Option held
  console.log(key.option);    // true if Option held (macOS)

  // Common patterns
  if (key.name === "q" || (key.name === "c" && key.ctrl)) {
    renderer.destroy();
    process.exit(0);
  }

  if (key.name === "n") {
    // Next market
  }

  if (key.name === "up" || key.name === "k") {
    // Scroll up
  }
});

keyHandler.on("paste", (pasteEvent) => {
  console.log("Pasted:", pasteEvent.value);
});
```

### Construct/Component System

```typescript
import { Box, Text, t, bold } from "@opentui/core";

// Instead of:
// const box = new BoxRenderable(renderer, { width: 20 });
// const text = new TextRenderable(renderer, { content: "Hi" });
// box.add(text);

// You can write:
const vnode = Box(
  { width: 20, borderStyle: "single" },
  Text({ content: t`${bold("Hi")}` })
);

// Add to renderer
renderer.root.add(vnode);
```

---

## Implementation Plan

### Phase 1: Delete and Start Fresh (1 hour)

**Steps:**
1. Delete `src/opentui/tui.ts` - completely wrong
2. Keep environment switching in `src/index.ts` (that part was correct)
3. Read blessed TUI implementation (`src/tui.ts`) to understand requirements
4. Create minimal working test

**Success Criteria:** Clean slate, ready for correct implementation

---

### Phase 2: Minimal Viable TUI (4 hours)

**Goal:** Create the simplest possible OpenTUI that displays something

**File:** `src/opentui/tui.ts`

```typescript
import {
  createCliRenderer,
  BoxRenderable,
  TextRenderable,
  t, bold, fg,
  type KeyEvent,
} from "@opentui/core";

export async function runDashboard(options: DashboardOptions): Promise<void> {
  // Create renderer
  const renderer = await createCliRenderer({
    exitOnCtrlC: false,
    useAlternateScreen: true,
    targetFps: 30,
    backgroundColor: "#000000",
  });

  // Create main container
  const mainBox = new BoxRenderable(renderer, {
    id: "main",
    flexGrow: 1,
    flexDirection: "column",
    backgroundColor: "#000000",
  });

  // Header
  const header = new BoxRenderable(renderer, {
    id: "header",
    height: 3,
    borderStyle: "single",
    backgroundColor: "#000033",
  });
  header.add(new TextRenderable(renderer, {
    content: t`${bold("Polymarket Analyzer - OpenTUI")}`,
  }));
  mainBox.add(header);

  // Content area
  const content = new BoxRenderable(renderer, {
    id: "content",
    flexGrow: 1,
    flexDirection: "row",
  });

  // Left panel (40%)
  const leftPanel = new BoxRenderable(renderer, {
    id: "left",
    flexBasis: 40,  // 40% of parent
    flexGrow: 0,
    borderStyle: "single",
  });
  leftPanel.add(new TextRenderable(renderer, {
    content: t`${bold("Radar")}`,
  }));
  content.add(leftPanel);

  // Right panel (60%)
  const rightPanel = new BoxRenderable(renderer, {
    id: "right",
    flexGrow: 1,  // Takes remaining space
    borderStyle: "single",
  });
  rightPanel.add(new TextRenderable(renderer, {
    content: t`${bold("Market Details")}`,
  }));
  content.add(rightPanel);

  mainBox.add(content);
  renderer.root.add(mainBox);

  // Keyboard handler
  renderer.keyInput.on("keypress", (key: KeyEvent) => {
    if (key.name === "q" || (key.name === "c" && key.ctrl)) {
      renderer.destroy();
      process.exit(0);
    }
  });

  // Start render loop
  renderer.start();

  console.log("OpenTUI started. Press 'q' to quit.");
}
```

**Success Criteria:** Runs without errors, displays layout, 'q' quits

---

### Phase 3: Implement All 8 Panels (8 hours)

**Goal:** Recreate exact layout from blessed implementation

**Layout Structure:**
```
┌─────────────────────────────────────────────────────┐
│ Header (3 rows)                                      │
├──────────────────┬──────────────────────────────────┤
│ Radar            │ Market Info                      │
│ (40%, scrollable)│ - Question                       │
│                  │ - Outcome prices                 │
│                  │ - Orderbook                      │
│                  │                                  │
├──────────────────┼──────────────────────────────────┤
│ Pulse            │ Price History                    │
│                  │ (mini chart)                     │
├──────────────────┼──────────────────────────────────┤
│ Holders          │ WS Status                        │
│                  │ - Connection                     │
│                  │ - Alerts                         │
└──────────────────┴──────────────────────────────────┘
```

**Implementation:**

```typescript
// Left column (40%)
const leftColumn = new BoxRenderable(renderer, {
  flexBasis: 40,
  flexGrow: 0,
  flexDirection: "column",
});

// Radar (scrollable)
const radarBox = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  flexBasis: 20,  // 20 rows
  borderStyle: "single",
});
// Add market rows to radarBox.content

// Pulse (4 rows)
const pulseBox = new BoxRenderable(renderer, {
  height: 4,
  borderStyle: "single",
});

// Holders (rest of space)
const holdersBox = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  flexGrow: 1,
  borderStyle: "single",
});

// Right column (60%)
const rightColumn = new BoxRenderable(renderer, {
  flexGrow: 1,
  flexDirection: "column",
});

// Market Info
const marketBox = new BoxRenderable(renderer, {
  height: 10,
  borderStyle: "single",
});

// Price History
const historyBox = new BoxRenderable(renderer, {
  height: 8,
  borderStyle: "single",
});

// WS Status
const statusBox = new BoxRenderable(renderer, {
  flexGrow: 1,
  borderStyle: "single",
});
```

**Success Criteria:** All 8 panels visible with borders and labels

---

### Phase 4: Data Integration (6 hours)

**Goal:** Display real Polymarket data

**Strategy:**
1. Reuse existing API functions (`loadRadar`, `getOrderbook`, etc.)
2. Create helper to convert blessed-style tags to OpenTUI styled text
3. Update panels with data

**Helper Function:**

```typescript
// src/opentui/utils.ts
import { t, fg, bold, italic } from "@opentui/core";
import { heatSymbol, formatPrice, formatPct } from "../tui-render.js";

type BlessedTag = {
  text: string;
  color?: string;  // "red", "green", "yellow", "cyan", "blue", "magenta", "white", "black"
  bold?: boolean;
  underline?: boolean;
};

export function renderStyledText(chunks: BlessedTag[]): StyledText {
  const parts = chunks.map(chunk => {
    let content = chunk.text;

    // Apply color
    if (chunk.color) {
      const colorMap: Record<string, string> = {
        red: "#FF0000",
        green: "#00FF00",
        yellow: "#FFFF00",
        cyan: "#00FFFF",
        blue: "#0000FF",
        magenta: "#FF00FF",
        white: "#FFFFFF",
        black: "#000000",
      };
      const hex = colorMap[chunk.color] || chunk.color;
      content = fg(hex)(content);
    }

    // Apply bold
    if (chunk.bold) {
      content = bold(content);
    }

    // Apply underline
    if (chunk.underline) {
      content = underline(content);
    }

    return content;
  });

  return t`${...parts}`;
}

// Convert existing renderTable output to styled text
export function tableToStyledText(table: string): StyledText {
  // Parse the table string (which contains blessed tags)
  // and convert to OpenTUI styled text
  // This is complex - for now, just return plain text
  return t`${table}`;
}
```

**Update Radar:**

```typescript
async function updateRadar(radarBox: ScrollBoxRenderable, markets: MarketInfo[]) {
  // Clear existing
  radarBox.content.clear();

  // Add each market
  for (const market of markets.slice(0, 50)) {
    const row = new BoxRenderable(renderer, {
      width: "100%",
      height: 1,
      flexDirection: "row",
    });

    const price = formatPrice(market.price);
    const pct = formatPct(market.priceChange24h);
    const heat = heatSymbol(market.volume24h);

    row.add(new TextRenderable(renderer, {
      content: t`${heat} ${fg("#FFFF00")(market.question.substring(0, 30))} ${fg("#00FF00")(price)} ${fg("#00FFFF")(pct)}`,
    }));

    radarBox.content.add(row);
  }
}
```

**Success Criteria:** Real market data displayed in all panels

---

### Phase 5: Keyboard Navigation (4 hours)

**Goal:** Implement all keyboard shortcuts from blessed version

**Mapping:**
| Key | Action |
|-----|--------|
| n/p | Next/Previous market |
| j/k | Scroll radar |
| o | Toggle outcome |
| Enter | Detail modal |
| h | Help modal |
| ESC | Close modal |
| q/Ctrl-C | Quit |

**Implementation:**

```typescript
// State
let showDetail = false;
let showHelp = false;
let focusIndex = 0;

// Keyboard handler
renderer.keyInput.on("keypress", async (key: KeyEvent) => {
  // Always handle quit
  if (key.name === "q" || (key.name === "c" && key.ctrl)) {
    renderer.destroy();
    process.exit(0);
  }

  // Modal close
  if (key.name === "escape") {
    if (showDetail) {
      showDetail = false;
      detailModal.visible = false;
    }
    if (showHelp) {
      showHelp = false;
      helpModal.visible = false;
    }
    return;
  }

  // If modal open, don't handle other keys
  if (showDetail || showHelp) {
    return;
  }

  // Navigation
  switch (key.name) {
    case "n":
      focusIndex = Math.min(focusIndex + 1, markets.length - 1);
      await updateMarketDisplay(markets[focusIndex]);
      break;
    case "p":
      focusIndex = Math.max(focusIndex - 1, 0);
      await updateMarketDisplay(markets[focusIndex]);
      break;
    case "j":
    case "down":
      radarBox.scrollBy(1);
      break;
    case "k":
    case "up":
      radarBox.scrollBy(-1);
      break;
    case "o":
      outcomeIndex = outcomeIndex === 0 ? 1 : 0;
      await updateMarketDisplay(markets[focusIndex]);
      break;
    case "return":
    case "enter":
      showDetail = true;
      detailModal.visible = true;
      await updateDetailModal(markets[focusIndex]);
      break;
    case "h":
    case "?":
      showHelp = true;
      helpModal.visible = true;
      break;
  }
});
```

**Success Criteria:** All keyboard shortcuts work correctly

---

### Phase 6: WebSocket Integration (3 hours)

**Goal:** Real-time price updates via WebSocket

**Reuse existing `src/ws.ts`:**

```typescript
import { connectMarketWs, type WsHandlers } from "../ws.js";

function setupWebSocket(renderer: CliRenderer, state: DashboardState) {
  const currentState = getState();

  const handlers: WsHandlers = {
    onUpdate: (update) => {
      // Update orderbook state
      currentState.orderbook = update;

      // Trigger re-render
      updateOrderbookPanel(update);
      renderer.requestRender();
    },
    onBook: (assetId) => {
      console.log("Orderbook updated for", assetId);
    },
    onStatus: (status) => {
      // Update connection status display
      updateConnectionStatus(status);
    },
  };

  // Get token IDs for current markets
  const tokenIds = currentState.radar
    .map(m => m.clobTokenIds?.[0] || m.conditionId)
    .filter(Boolean) as string[];

  if (tokenIds.length > 0) {
    connectMarketWs(tokenIds, handlers);
  }
}
```

**Success Criteria:** Real-time updates visible in orderbook panel

---

### Phase 7: Modals (4 hours)

**Goal:** Detail and Help modals

**Modal Pattern:**

```typescript
// Create modal overlay (hidden by default)
const detailModal = new BoxRenderable(renderer, {
  id: "detail-modal",
  position: "absolute",
  width: "80%",
  height: "80%",
  left: 10,
  top: 10,
  backgroundColor: "#000000",
  borderStyle: "double",
  visible: false,  // Hidden initially
  zIndex: 1000,  // On top
});

// Modal content (scrollable)
const detailContent = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  flexGrow: 1,
});
detailModal.add(detailContent);

renderer.root.add(detailModal);

// Show modal
function showDetailModal(market: MarketInfo) {
  detailContent.content.clear();

  // Add content
  detailContent.content.add(new TextRenderable(renderer, {
    content: t`${bold("Question:")} ${market.question}`,
  }));

  // ... more content

  detailModal.visible = true;
  renderer.requestRender();
}

// Hide modal
function hideDetailModal() {
  detailModal.visible = false;
  renderer.requestRender();
}
```

**Success Criteria:** Modals display correctly, ESC closes them

---

### Phase 8: Export Features (2 hours)

**Goal:** CSV export, snapshot save

**Reuse existing functions from `src/tui.ts`:**

```typescript
// These functions already exist - just call them
import { saveSnapshot, exportHistoryCsv } from "../tui.js";

case "s":
  await saveSnapshot(currentState);
  showNotification("Snapshot saved!");
  break;
case "e":
  await exportHistoryCsv(currentState.focusMarket.conditionId);
  showNotification("CSV exported!");
  break;
```

**Success Criteria:** Export features work

---

### Phase 9: Testing & Polish (6 hours)

**Goal:** Feature parity with blessed version

**Checklist:**
- [ ] All 8 panels display correctly
- [ ] Radar scrolling works (j/k, arrows)
- [ ] Market navigation works (n/p)
- [ ] Outcome toggle works (o)
- [ ] Modals work (Enter for detail, h for help)
- [ ] Modals close on ESC
- [ ] WebSocket connects and updates
- [ ] Real-time prices visible
- [ ] Export features work
- [ ] No terminal corruption on exit
- [ ] Works over SSH
- [ ] Performance acceptable

**Performance Targets:**
- Render time: <50ms
- Frame rate: 20-30 FPS
- Memory: <150MB RSS

**Success Criteria:** 100% feature parity, no regressions

---

## Common Patterns Reference

### Pattern 1: Updating Text Content

```typescript
// Create text element
const statusText = new TextRenderable(renderer, {
  id: "status",
  content: "Disconnected",
  fg: "#FF0000",
});

// Update later
statusText.content = t`${fg("#00FF00")("Connected")}`;
renderer.requestRender();
```

### Pattern 2: Scrollable List

```typescript
const listBox = new ScrollBoxRenderable(renderer, {
  scrollY: true,
  height: 15,
  borderStyle: "single",
});

// Add items
const items = ["Item 1", "Item 2", "Item 3"];
for (const item of items) {
  listBox.content.add(new TextRenderable(renderer, {
    content: item,
  }));
}

// Scroll
listBox.scrollTo(5);
```

### Pattern 3: Modal with Overlay

```typescript
// Semi-transparent overlay
const overlay = new BoxRenderable(renderer, {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  backgroundColor: new RGBA(0, 0, 0, 0.7),  // 70% opacity
  zIndex: 999,
  visible: false,
});

// Modal
const modal = new BoxRenderable(renderer, {
  position: "absolute",
  width: 60,
  height: 20,
  top: "50%",
  left: "50%",
  backgroundColor: "#000000",
  borderStyle: "double",
  zIndex: 1000,
  visible: false,
});

// Show both
function showModal() {
  overlay.visible = true;
  modal.visible = true;
  renderer.requestRender();
}

// Hide both
function hideModal() {
  overlay.visible = false;
  modal.visible = false;
  renderer.requestRender();
}
```

### Pattern 4: Conditional Styling

```typescript
function renderPrice(price: number, previousPrice: number): StyledText {
  const change = price - previousPrice;

  if (change > 0) {
    return t`${fg("#00FF00")(bold(formatPrice(price)))}`;
  } else if (change < 0) {
    return t`${fg("#FF0000")(bold(formatPrice(price)))}`;
  } else {
    return t`${formatPrice(price)}`;
  }
}
```

---

## Testing Strategy

### Unit Tests (src/opentui/__tests__)

```typescript
// test-layout.ts
import { describe, it, expect } from "bun:test";
import { createCliRenderer, BoxRenderable } from "@opentui/core";

describe("OpenTUI Layout", async () => {
  const renderer = await createCliRenderer({ useAlternateScreen: false });

  it("creates left-right split", () => {
    const container = new BoxRenderable(renderer, {
      flexDirection: "row",
      width: 100,
    });

    const left = new BoxRenderable(renderer, { flexBasis: 40 });
    const right = new BoxRenderable(renderer, { flexGrow: 1 });

    container.add(left);
    container.add(right);

    // Verify layout
    renderer.requestRender();
    // ... assertions
  });

  renderer.destroy();
});
```

### Integration Tests

```bash
# Manual test
OPENTUI=1 bun --bun run src/index.ts --tui --no-ws

# Verify:
# 1. Layout displays correctly
# 2. Can scroll radar
# 3. Can navigate markets
# 4. Modals work
# 5. Quit works
```

---

## Sources

- [OpenTUI GitHub](https://github.com/sst/opentui)
- [OpenTUI Getting Started](https://github.com/sst/opentui/blob/main/packages/core/docs/getting-started.md)
- [OpenTUI NPM](https://www.npmjs.com/package/@opentui/core)
- [Yoga Layout](https://yogalayout.com/)
- [Awesome OpenTUI](https://github.com/msmps/awesome-opentui)

---

## Timeline

| Phase | Duration | Key Deliverable |
|-------|----------|-----------------|
| 1. Delete & Start Fresh | 1 hour | Clean slate |
| 2. Minimal Viable TUI | 4 hours | Hello World with layout |
| 3. 8-Panel Layout | 8 hours | All panels visible |
| 4. Data Integration | 6 hours | Real data displayed |
| 5. Keyboard Navigation | 4 hours | All keys work |
| 6. WebSocket | 3 hours | Real-time updates |
| 7. Modals | 4 hours | Detail/Help modals |
| 8. Export Features | 2 hours | CSV/snapshot work |
| 9. Testing & Polish | 6 hours | Feature parity |

**Total: 38 hours (~5 days)**

---

## Next Steps

1. Delete `src/opentui/tui.ts`
2. Implement Phase 2 (Minimal Viable TUI)
3. Test with `OPENTUI=1 bun --bun run dev --tui`
4. Iterate through remaining phases

---

**Version:** 1.0.0
**Last Updated:** January 2026

