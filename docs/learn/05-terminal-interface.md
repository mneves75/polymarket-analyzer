# Chapter 05: Terminal Interface (TUI)

> **"The best interface is no interface. But when it has to be, be simple and efficient."**
> -- Principle of UI Design

---

## 1. Introduction to TUI

### 1.1 What is TUI?

**TUI** (*Terminal User Interface*) is a user interface that runs in the command terminal, using text and special characters to create visual elements like boxes, tables, and menus.

**TUI Examples:**

```
+--------------------------------------------------------------+
|  HTOP (process monitor)                                      |
+--------------------------------------------------------------+
|  PID  USER      PRI  SIZE  STATE  TIME  COMMAND              |
|  123  root      20   1.2G  Running 0:05  node                |
|  456  ubuntu    15   512M  Sleeping 1:23 bun                 |
|                                                              |
|  [================----] CPU: 75%                             |
|  [==========----------] MEM: 50%                             |
+--------------------------------------------------------------+
```

### 1.2 TUI vs GUI vs CLI

```
CLI (Command Line Interface)
------------------------------------------------------------
$ npm install
$ bun --bun run dev

Advantages:
- Simple to implement
- Light and fast

Disadvantages:
- Not visual
- Difficult for complex data

TUI (Terminal User Interface)
------------------------------------------------------------
+----------------------+
|  Dashboard           |
|  [====--] 75%        |
+----------------------+

Advantages:
- Visual in the terminal
- Interactive (keyboard)
- Light and fast
- Works via SSH

Disadvantages:
- Limited to text
- Difficult to make responsive

GUI (Graphical User Interface)
------------------------------------------------------------
+----------------------+
|  [Beautiful charts]  |
|  [Images]            |
|  [Animations]        |
+----------------------+

Advantages:
- Rich visuals
- Multimedia

Disadvantages:
- Heavy
- Requires graphics server
- Difficult via SSH
```

### 1.3 Why Use TUI in This Project?

1. **Real-time monitoring** - Perfect for constantly changing data
2. **Lightweight** - Consumes few resources
3. **SSH-friendly** - Works on remote servers
4. **Professional appearance** - Looks like a "hacker tool"
5. **Focus on data** - No visual distractions

---

## 2. Blessed Library

### 2.1 What is Blessed?

**Blessed** is a Node.js/Bun library for creating rich terminal interfaces.

**Features:**
- Creates boxes, tables, lists
- Handles colors and formatting
- Captures keyboard and mouse
- Responsive layout
- Animations

### 2.2 Installing Blessed

```bash
# Already installed in the project
bun install

# If you need to add to another project
bun add blessed
bun add -d @types/blessed
```

### 2.3 Hello World in Blessed

```typescript
import blessed from "blessed";

// Create the screen
const screen = blessed.screen({
  smartCSR: true,       // Rendering optimization
  title: "My TUI App"
});

// Create a box
const box = blessed.box({
  top: "center",
  left: "center",
  width: "50%",
  height: "50%",
  content: "Hello, World!",
  border: { type: "line" },
  style: {
    fg: "white",
    bg: "blue",
    border: { fg: "cyan" }
  }
});

// Add to screen
screen.append(box);

// Render
screen.render();

// Capture 'q' key to exit
screen.key(["q", "C-c"], () => process.exit(0));
```

---

## 3. Polymarket Interface Layout

### 3.1 Screen Map

```
+------------------------------------------------------------------+
| HEADER (line 0)                                                   |
| Polymarket Pulse                    [12:34:56] [WS: *] [15/s]     |
+------------------------------+------------------------------------+
| RADAR                        | MARKET                             |
| (lines 1-30%)                | (lines 1-30%)                      |
|                              |                                    |
| +------------------------+   | +-----------------------------+    |
| | # Heat Event Outcome   |   | | Event: USA Elections 2024   |    |
| |                        |   | | Question: Trump wins?       |    |
| | 1 [!] ... Yes          |   | | Condition: 0x123...         |    |
| | 2 [!] ... No           |   | |                             |    |
| +------------------------+   | +-----------------------------+    |
+------------------------------+------------------------------------+
| PULSE                        | ORDERBOOK                          |
| (lines 31-50%)               | (lines 31-50%)                     |
|                              |                                    |
| +------------------------+   | +-----------------------------+    |
| | Bid: 65c               |   | | bid    size  ask    size    |    |
| | Ask: 67c               |   | | 0.65   1k   0.67   500      |    |
| | Spread: 2c (3.0%)      |   | | 0.64   2k   0.68   750      |    |
| | Last: 66c              |   | | ...                         |    |
| +------------------------+   | +-----------------------------+    |
+------------------------------+------------------------------------+
| HISTORY                      | HOLDERS                            |
| (lines 51-70%)               | (lines 51-70%)                     |
|                              |                                    |
| +------------------------+   | +-----------------------------+    |
| | Last 30 days:          |   | | 1. 0xabc... 15k shares      |    |
| | :::::::::-.:::-::::::  |   | | 2. 0xdef... 12k shares      |    |
| +------------------------+   | +-----------------------------+    |
+------------------------------------------------------------------+
| ALERTS & STATUS (lines 71-90%)                                   |
| +------------------------------------------------------------+   |
| | Warning: WS stale - reconnecting...                        |   |
| | Info: REST: 5s ago | History: 30s ago                      |   |
| +------------------------------------------------------------+   |
+------------------------------------------------------------------+
| FOOTER (last line)                                               |
| [n]ext [p]rev [o]utcome [r]efresh [f]ilter [s]ave [q]uit         |
+------------------------------------------------------------------+
```

### 3.2 Layout Creation Code

See `src/tui.ts:46-170`:

```typescript
export async function runDashboard(opts: DashboardOptions) {
  // --- CREATE THE SCREEN ---
  const screen = blessed.screen({
    smartCSR: true,
    title: "Polymarket Pulse"
  });

  // --- DEFINE COLOR THEME ---
  const THEME = {
    headerBg: "blue",
    headerFg: "white",
    border: "cyan",
    label: "cyan",
    text: "white",
    muted: "gray",
    success: "green",
    warning: "yellow",
    danger: "red",
    accent: "magenta"
  };

  // --- CREATE COMPONENTS ---

  // Header (top)
  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,  // Allows tags like {bold}, {red}
    style: {
      fg: THEME.headerFg,
      bg: THEME.headerBg
    }
  });

  // Radar Table (left, top)
  const radarTable = blessed.box({
    top: 1,
    left: 0,
    width: "40%",      // 40% of width
    height: "30%",     // 30% of height
    border: "line",
    label: "Radar",
    tags: true,
    style: {
      fg: THEME.text,
      border: { fg: THEME.border },
      label: { fg: THEME.label }
    }
  });

  // Market Box (right, top)
  const marketBox = blessed.box({
    top: 1,
    left: "40%",       // Starts at 40% from left
    width: "60%",      // 60% of width
    height: "30%",
    border: "line",
    label: "Market",
    tags: true,
    style: { /* ... */ }
  });

  // Pulse Box (left, middle)
  const statsBox = blessed.box({
    top: "31%",        // Starts at 31% from top
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "Pulse",
    tags: true,
    style: { /* ... */ }
  });

  // Orderbook Table (right, middle)
  const orderbookTable = blessed.box({
    top: "31%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Orderbook",
    tags: true,
    style: { /* ... */ }
  });

  // History Box (left, bottom)
  const historyBox = blessed.box({
    top: "51%",
    left: 0,
    width: "40%",
    height: "20%",
    border: "line",
    label: "History",
    tags: true,
    style: { /* ... */ }
  });

  // Holders Table (right, bottom)
  const holdersTable = blessed.box({
    top: "51%",
    left: "40%",
    width: "60%",
    height: "20%",
    border: "line",
    label: "Holders",
    tags: true,
    style: { /* ... */ }
  });

  // Alerts Box (bottom)
  const alertsBox = blessed.box({
    top: "71%",
    left: 0,
    width: "100%",
    height: "20%",
    border: "line",
    label: "Alerts & Status",
    tags: true,
    style: { /* ... */ }
  });

  // Footer (last line)
  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 1,
    tags: true,
    style: { fg: THEME.text, bg: "black" }
  });

  // --- ADD COMPONENTS TO SCREEN ---
  screen.append(header);
  screen.append(radarTable);
  screen.append(marketBox);
  screen.append(statsBox);
  screen.append(orderbookTable);
  screen.append(historyBox);
  screen.append(holdersTable);
  screen.append(alertsBox);
  screen.append(footer);

  // --- INITIALIZE TABLE CONTENT ---
  radarTable.setContent(renderTable([[/* ... */]]));
  orderbookTable.setContent(renderTable([[/* ... */]]));
  holdersTable.setContent(renderTable([[/* ... */]]));
}
```

---

## 4. Data Rendering

### 4.1 Formatting Tags

Blessed supports HTML-like tags:

```typescript
// Available tags:
box.setContent(`
  {bold}Bold text{/bold}
  {underline}Underlined text{/underline}
  {red}Red text{/red}
  {green-fg}Green text (foreground){/green-fg}
  {blue-bg}Blue background{/blue-bg}
  {blink}Blinking text{/blink}
  {dim}Dimmed text{/dim}
`);
```

### 4.2 Rendering Tables

```typescript
// Helper function to render tables
function renderTable(rows: string[][]): string {
  return rows.map(row => row.join("  ")).join("\n");
}

// Usage
const rows = [
  ["#", "Heat", "Event", "Outcome"],
  ["1", "[!]", "Trump wins?", "Yes"],
  ["2", "[!]", "Trump wins?", "No"],
];

radarTable.setContent(renderTable(rows));
```

### 4.3 Rendering ASCII Sparklines

```typescript
// src/utils.ts:18-31
export function asciiSparkline(series: number[], width = 30) {
  if (series.length === 0) return "(no data)";

  // Visual levels (from lowest to highest)
  const levels = [".", ":", "-", "=", "+", "*", "#", "%", "@"];

  const sliced = series.slice(-width);  // Last N points
  const min = Math.min(...sliced);
  const max = Math.max(...sliced);
  const range = max - min || 1;

  return sliced
    .map((v) => {
      // Normalize value to array index
      const idx = Math.floor(
        ((v - min) / range) * (levels.length - 1)
      );
      return levels[Math.max(0, Math.min(levels.length - 1, idx))];
    })
    .join("");
}

// Usage
const prices = [0.60, 0.62, 0.65, 0.63, 0.66, 0.67, 0.65];
const sparkline = asciiSparkline(prices, 30);
// Result: ".:==-:+*%"
```

### 4.4 Updating the Header

```typescript
function updateHeader() {
  const clock = new Date().toLocaleTimeString();
  const wsIndicator = wsStatus === "connected" ? "*" : "o";
  const content = `Polymarket Pulse                    [${clock}] [WS: ${wsIndicator}] [${msgRate}/s]`;
  header.setContent(content);
  screen.render();
}
```

### 4.5 Updating the Radar Table

```typescript
function updateRadar() {
  const filteredRadar = radarFilter
    ? radar.filter(m =>
        m.question?.toLowerCase().includes(radarFilter.toLowerCase())
      )
    : radar;

  const rows = [
    ["#", "Heat", "Event", "Outcome"].map(cell),
    ...filteredRadar.map((m, idx) => [
      String(idx + 1),
      "[!]",
      m.eventTitle?.slice(0, 30) || "N/A",
      m.outcomes[outcomeIndex]?.slice(0, 15) || "N/A"
    ].map(cell))
  ];

  radarTable.setContent(renderTable(rows));
  screen.render();
}

function cell(text: string): string {
  return padRight(text || "-", 15);
}
```

### 4.6 Updating the Orderbook

```typescript
function updateOrderbook() {
  if (!orderbook || orderbook.bids.length === 0 || orderbook.asks.length === 0) {
    orderbookTable.setContent("{red-fg}No orderbook data{/red-fg}");
    return;
  }

  // Combine bids and asks side by side
  const rows = [
    ["bid", "size", "ask", "size"].map(cell),
    ...orderbook.bids.slice(0, 10).map((bid, i) => {
      const ask = orderbook.asks[i];
      return [
        formatPrice(bid.price),
        formatNumber(bid.size),
        ask ? formatPrice(ask.price) : "-",
        ask ? formatNumber(ask.size) : "-"
      ].map(cell);
    })
  ];

  orderbookTable.setContent(renderTable(rows));
  screen.render();
}
```

---

## 5. Keyboard Capture

### 5.1 Global Keys

```typescript
// Capture 'q' or Ctrl+C to exit
screen.key(["q", "C-c"], () => {
  // Cleanup
  wsConnection?.close();
  process.exit(0);
});

// Capture 'r' for manual refresh
screen.key("r", () => {
  refreshAllData();
});

// Capture 'f' or '/' for filter
screen.key(["f", "/"], () => {
  filterPrompt.show();
});
```

### 5.2 Navigation Between Markets

```typescript
// 'n' = next market
screen.key("n", () => {
  if (!focusMarket) return;
  const idx = radar.findIndex(m => m.conditionId === focusMarket?.conditionId);
  if (idx < radar.length - 1) {
    focusMarket = radar[idx + 1];
    outcomeIndex = 0;
    loadMarketData(focusMarket);
  }
});

// 'p' = previous market
screen.key("p", () => {
  if (!focusMarket) return;
  const idx = radar.findIndex(m => m.conditionId === focusMarket?.conditionId);
  if (idx > 0) {
    focusMarket = radar[idx - 1];
    outcomeIndex = 0;
    loadMarketData(focusMarket);
  }
});

// 'o' = switch outcome
screen.key("o", () => {
  if (!focusMarket) return;
  outcomeIndex = (outcomeIndex + 1) % focusMarket.outcomes.length;
  loadMarketData(focusMarket);
});
```

### 5.3 Radar Filter

```typescript
// Filter prompt
const filterPrompt = blessed.prompt({
  parent: screen,
  top: "center",
  left: "center",
  width: "60%",
  height: 7,
  border: "line",
  label: "Filter radar",
  hidden: true
});

// When user presses Enter
filterPrompt.on("submit", (text: string) => {
  radarFilter = text;
  updateRadar();  // Update radar with filter
});

// Show prompt when 'f' or '/' is pressed
screen.key(["f", "/"], () => {
  filterPrompt.show();
  filterPrompt.readInput((err, value) => {
    if (err) {
      filterPrompt.hide();
      return;
    }
    radarFilter = value || "";
    updateRadar();
    filterPrompt.hide();
  });
});
```

---

## 6. Update Loop

### 6.1 Refresh Timer

```typescript
// Refresh interval (config.config.ts:7)
const REFRESH_MS = CONFIG.refreshMs;  // 3000ms (3 seconds)

// Main timer
const refreshTimer = setInterval(() => {
  // 1. Update REST data
  refreshRESTData();

  // 2. Update interface
  updateAllComponents();

  // 3. Render screen
  screen.render();
}, REFRESH_MS);
```

### 6.2 Conditional Update

```typescript
// Don't update everything on each refresh
async function refreshRESTData() {
  const now = Date.now();

  // Update radar every 60 seconds
  if (now - lastRadarAt > CONFIG.radarMs) {
    radar = await loadRadar(CONFIG.radarLimit);
    lastRadarAt = now;
  }

  // Update holders every 60 seconds
  if (now - lastHoldersAt > CONFIG.holdersMs) {
    const holdersRaw = await getHolders(focusMarket!.conditionId!);
    holders = normalizeHolders(holdersRaw);
    lastHoldersAt = now;
  }

  // Update history every 30 seconds
  if (now - lastHistoryAt > CONFIG.historyMs) {
    const historyRaw = await getPriceHistory(tokenId);
    historySeries = extractHistory(historyRaw);
    lastHistoryAt = now;
  }

  // Update orderbook every 3 seconds (always)
  const orderbookRaw = await getOrderbook(tokenId);
  orderbook = normalizeOrderbook(orderbookRaw);
  lastRestAt = now;
}
```

---

## 7. TUI Best Practices

### 7.1 Use Consistent Colors

```typescript
// GOOD: Define a centralized theme
const THEME = {
  headerBg: "blue",
  success: "green",
  warning: "yellow",
  danger: "red"
};

// Use in all components
const box = blessed.box({
  style: {
    fg: THEME.text,
    bg: THEME.headerBg
  }
});
```

### 7.2 Render Only When Necessary

```typescript
// BAD - Renders on every WebSocket message
ws.addEventListener("message", (msg) => {
  updateInterface();
  screen.render();  // Too many renders per second
});

// GOOD - Rate limit renders
let renderScheduled = false;
ws.addEventListener("message", (msg) => {
  updateInterface();
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      screen.render();
      renderScheduled = false;
    });
  }
});
```

### 7.3 Use Tags Semantically

```typescript
// GOOD: Colors indicate meaning
if (priceChange > 0) {
  return `{green-fg}+${formatPct(priceChange)}{/green-fg}`;
} else if (priceChange < 0) {
  return `{red-fg}${formatPct(priceChange)}{/red-fg}`;
} else {
  return `{gray-fg}0.0%{/gray-fg}`;
}
```

### 7.4 Handle Resizing

```typescript
// Blessed handles relative layout automatically
// but you can detect changes:
screen.on("resize", () => {
  // Re-render if necessary
  updateLayout();
  screen.render();
});
```

---

## 8. Practical Exercises

### Exercise 1: Progress Bar Component

Create an ASCII progress bar:

```typescript
function renderProgressBar(
  value: number,
  max: number,
  width: number = 20
): string {
  // 1. Calculate percentage
  // 2. Calculate how many characters to fill
  // 3. Return string like "========-------- 75%"
}

// Test
console.log(renderProgressBar(75, 100, 20));
// Expected: "===============----- 75%"
```

### Exercise 2: Highlight Table

Highlight the selected row in a table:

```typescript
function renderTableWithHighlight(
  rows: string[][],
  selectedIndex: number
): string {
  // 1. Render each row
  // 2. Selected row has {inverse} (inverts colors)
  // 3. Other rows normal
}
```

### Exercise 3: Vertical Bar Chart

Create a vertical bar chart:

```typescript
function renderVerticalBars(
  values: number[],
  height: number
): string {
  // 1. Normalize values to height
  // 2. For each line (top to bottom):
  //    - If value >= line, draw =
  //    - Otherwise, draw space
  // 3. Return string with multiple lines
}

// Example:
// =  =
// =  =
// ====
// ====
```

---

## 9. Checkpoint

**Test your knowledge before continuing:**

1. **What is the main difference between CLI, TUI, and GUI?**
   - a) CLI uses mouse, TUI uses keyboard, GUI uses both
   - b) CLI is plain text, TUI has visual elements in terminal, GUI uses graphical windows
   - c) There is no difference, they are synonyms

   <details>
   <summary>Answer</summary>
   **b)** CLI = Command Line Interface (plain text), TUI = Terminal User Interface (visual elements in terminal), GUI = Graphical User Interface (graphical windows).
   </details>

2. **How do you create a basic component with Blessed?**
   ```typescript
   const box = blessed.box({
     top: "center",
     left: "center",
     width: "50%",
     height: "50%",
     content: "Hello, World!",
     border: { type: "line" },
     style: { fg: "white", bg: "blue" }
   });
   screen.append(box);
   screen.render();
   ```

3. **What is `smartCSR` and when should you use it?**
   - a) A rendering optimization technique that should always be used
   - b) An algorithm that updates only the parts of the screen that changed
   - c) A type of responsive layout

   <details>
   <summary>Answer</summary>
   **b)** `smartCSR` is "cursely-style screen refreshing" - an optimization that recalculates only the part of the screen that changed, improving performance. It should be used in virtually all TUI applications.
   </details>

4. **How do you capture keyboard input in Blessed?**
   ```typescript
   screen.key(["q", "C-c"], () => {
     process.exit(0);
   });
   ```

5. **What is the difference between tags like `{bold}` and `style.fg`?**
   - `{bold}` is used inside `setContent()` to format text
   - `style.fg` defines the default color of the component
   - Tags are for dynamic formatting, style is for static configuration

**Congratulations!** If you answered correctly, you are ready for the next chapter. If not, review the previous sections.

---

## 10. Common Pitfalls

### Pitfall 1: Forgetting `screen.render()`

**Problem:** You add components or update content but nothing appears on screen.

```typescript
// BAD
box.setContent("New content");
// Nothing happens!

// GOOD
box.setContent("New content");
screen.render();  // Always call render() after modifying
```

**Why it happens:** Blessed does not update the screen automatically on each change for performance reasons.

### Pitfall 2: Memory Leaks with Timers

**Problem:** `setInterval` is never cleaned up, causing memory leaks when users navigate between screens.

```typescript
// BAD
setInterval(() => {
  updateData();
}, 1000);
// Timer never stops, even after screen is destroyed

// GOOD
const timer = setInterval(() => {
  updateData();
}, 1000);

screen.on("destroy", () => {
  clearInterval(timer);  // Clean up timer when destroying screen
});
```

### Pitfall 3: Fixed vs Responsive Layout

**Problem:** Using fixed positions breaks on small terminals.

```typescript
// BAD - breaks on small terminals
const box = blessed.box({
  top: 10,
  left: 20,
  width: 80,
  height: 20
});

// GOOD - works on any size
const box = blessed.box({
  top: "10%",
  left: "20%",
  width: "60%",
  height: "40%"
});
```

### Pitfall 4: Too Many Renders

**Problem:** Calling `screen.render()` on every WebSocket message causes lag and high CPU usage.

```typescript
// BAD - renders on every message
ws.addEventListener("message", (msg) => {
  updateData(msg);
  screen.render();  // Too many renders per second!
});

// GOOD - rate limit renders
let renderScheduled = false;
ws.addEventListener("message", (msg) => {
  updateData(msg);
  if (!renderScheduled) {
    renderScheduled = true;
    requestAnimationFrame(() => {
      screen.render();
      renderScheduled = false;
    });
  }
});
```

### Pitfall 5: Ignoring Unicode/UTF-8

**Problem:** Special characters and emojis appear broken.

```typescript
// BAD - assumes ASCII
box.setContent("Price: R$ 1,000.50");  // May break

// GOOD - uses UTF-8 explicitly
process.stdout.write("\x1b]0;My App\x07");  // Configure terminal
box.setContent("Price: R$ 1,000.50");
```

### Pitfall 6: Exiting Without Cleanup

**Problem:** WebSocket stays open, timers keep running, resources are not released.

```typescript
// BAD
screen.key(["q"], () => {
  process.exit(0);  // Abrupt exit without cleanup
});

// GOOD
let wsConnection = null;
const timers = [];

screen.key(["q"], () => {
  // Cleanup
  wsConnection?.close();
  timers.forEach(t => clearInterval(t));

  // Graceful exit
  process.exit(0);
});
```

### Pitfall 7: Non-Portable Colors

**Problem:** Colors work in one terminal but not another.

```typescript
// BAD - may not work in all terminals
style: { fg: "#FF5733" }  // RGB hexadecimal color

// GOOD - uses portable basic colors
style: { fg: "red" }  // One of the 16 basic colors

// BETTER - uses palette with fallback
style: {
  fg: THEME.primaryColor || "blue"
}
```

---

## 11. Troubleshooting

### Issue: "Cannot find module 'blessed'"

**Symptoms:**
```
Error: Cannot find module 'blessed'
```

**Diagnosis:** Dependency not installed

**Solution:**
```bash
# Clean node_modules and reinstall
rm -rf node_modules
bun install

# Verify that blessed is installed
ls node_modules/blessed
```

**Prevention:** Always run `bun install` after cloning the project

---

### Issue: TUI appears distorted

**Symptoms:**
- Lines don't align
- Overlapping text
- Boxes with foreign characters

**Diagnosis:**
1. Terminal too small
2. Non-monospaced font
3. Incorrect character encoding

**Solutions:**

```bash
# 1. Increase terminal size
# Minimum recommended: 80 columns x 24 lines
# Ideal: 120 columns x 40 lines

# 2. Check terminal font
# Use monospaced font (Courier, Consolas, Monaco, etc.)
# DO NOT use proportional fonts (Arial, Helvetica, etc.)

# 3. Configure encoding (Linux/Mac)
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# On Windows, configure terminal for UTF-8
# Settings > Time & Language > Administrative > Change system locale
# Check "Beta: Use Unicode UTF-8"
```

---

### Issue: Keys don't work

**Symptoms:** Pressing keys does nothing

**Diagnosis:**
1. Focus on wrong component
2. Incorrect key binding
3. Terminal not sending events

**Solutions:**

```typescript
// 1. Verify correct key binding
// WRONG
screen.key("ctrl-c", () => {});  // Doesn't work

// CORRECT
screen.key("C-c", () => {});  // "C-c" not "ctrl-c"

// 2. Check focus
box.focus();  // If component needs focus

// 3. Test if key is being detected
screen.key(["*"], (ch, key) => {
  console.log("Key pressed:", ch, key);
});
```

---

### Issue: Slow performance

**Symptoms:**
- TUI freezes when updating
- High CPU usage
- Lag between input and response

**Diagnosis:**
1. Too many renders per second
2. Heavy processing on main thread
3. Too many components being rendered

**Solutions:**

```typescript
// 1. Implement render throttling
let lastRender = 0;
const RENDER_THROTTLE = 100;  // Maximum 10 renders/second

function smartRender() {
  const now = Date.now();
  if (now - lastRender < RENDER_THROTTLE) {
    return;  // Skip render
  }
  lastRender = now;
  screen.render();
}

// 2. Move processing to worker threads
// For heavy operations (JSON parsing, calculations)
import { Worker } from "worker_threads";

const worker = new Worker("./heavy-processor.ts");
worker.postMessage(largeData);
worker.on("message", (result) => {
  updateUI(result);
  smartRender();
});

// 3. Use virtual scrolling for large lists
// Instead of rendering 1000 items, render only visible ones
```

---

### Issue: WebSocket reconnects infinitely

**Symptoms:** "reconnecting..." message appears constantly

**Diagnosis:**
1. Incorrect URL
2. Server down
3. Authentication failing
4. WebSocket protocol not supported

**Solutions:**

```typescript
// 1. Verify URL
console.log("WebSocket URL:", CONFIG.clobWsBase);
// Should start with wss:// (not https://)

// 2. Test connection manually
// Use wscat or similar tool
bunx wscat -c wss://ws-subscriptions-clob.polymarket.com/ws/

// 3. Check authentication (if needed)
const ws = new WebSocket(url, {
  headers: {
    "Authorization": `Bearer ${token}`
  }
});

// 4. Add timeout and max retries
const MAX_RETRIES = 10;
const RETRY_TIMEOUT = 60000;  // Give up after 1 minute
```

---

### Issue: Data doesn't update

**Symptoms:** Values stay static even with WebSocket connected

**Diagnosis:**
1. Event handler not registered
2. Incorrect assetId
3. Filter blocking updates
4. Message parsing failing silently

**Solutions:**

```typescript
// 1. Verify onUpdate is registered
wsConnection = connectMarketWs(tokenIds, {
  onUpdate: (update) => {
    console.log("Update received:", update);  // Debug
    // Update UI
  }
});

// 2. Confirm assetId
console.log("Expected token:", tokenId);
console.log("Received asset:", update.assetId);
if (update.assetId !== tokenId) {
  console.log("AssetId mismatch!");
}

// 3. Add logging for debug
wsConnection = connectMarketWs(tokenIds, {
  onUpdate: (update) => {
    logger.info("WebSocket update", {
      assetId: update.assetId,
      eventType: update.eventType,
      price: update.price
    });
  }
});

// 4. Check for silent parse errors
ws.addEventListener("message", (event) => {
  try {
    const data = JSON.parse(event.data);
    // Process data
  } catch (err) {
    logger.error("Parse error", err, { raw: event.data });
  }
});
```

---

### Issue: Error "content is not a function"

**Symptoms:**
```
TypeError: box.content is not a function
```

**Diagnosis:** Using incorrect method to set content

**Solution:**
```typescript
// WRONG
box.content("New content");  // content does not exist

// CORRECT
box.setContent("New content");  // setContent is the correct method

// WRONG
const content = box.getContent();  // getContent does not exist

// CORRECT
const content = box.content;  // Access property directly
```

---

## 12. Design Decisions

### Decision 1: Why TUI (Terminal UI) instead of GUI?

**Alternatives Considered:**

| Option | Advantages | Disadvantages |
|--------|------------|---------------|
| **Web App** (React/Next.js) | Modern visual interface, accessible | Requires server/browsing, difficult via SSH |
| **Desktop App** (Electron) | Native, rich graphics | Heavy (~100MB), complex distribution |
| **Simple CLI** | Light, easy to implement | Not visual, difficult for complex data |
| **TUI (Blessed)** | Visual in terminal, light, SSH-friendly | Limited to text | CHOSEN |

**Trade-offs Analysis:**

| Criterion | Web App | Electron | CLI | **TUI** | Winner |
|-----------|---------|----------|-----|---------|--------|
| SSH Ease | [X] Difficult | [X] Impossible | [GOOD] Easy | [GOOD] Easy | TUI/CLI |
| Performance | [~] Browser overhead | [X] Heavy | [GOOD] Light | [GOOD] Light | TUI/CLI |
| Distribution | [~] Server required | [~] Large binary | [GOOD] Single binary | [GOOD] Single binary | TUI/CLI |
| Rich visuals | [GOOD] HTML/CSS | [GOOD] HTML/CSS | [X] No visuals | [~] Limited | Web |
| Appearance | [X] Corporate | [X] Common app | [~] Simple | [GOOD] "Hacker" | TUI |
| Resources | [~] Limited | [GOOD] Full access | [GOOD] Full access | [GOOD] Full access | TUI |

**Why TUI was chosen:**

1. [GOOD] **Server focus:** Heavy use in remote environments via SSH
2. [GOOD] **Lightweight:** No browser/Electron overhead
3. [GOOD] **Distribution:** Single binary, easy to install and share
4. [GOOD] **Aesthetics:** "Professional hacker" appearance that appeals to target audience
5. [GOOD] **Performance:** Instant rendering without browser latency

**Scenarios where other options would be better:**
- **Web App:** For non-technical users who prefer a friendly visual interface
- **Electron:** If advanced graphical resources were needed (3D charts, complex animations)
- **CLI:** For automation and scripts without need for visual interface

---

### Decision 2: Why Blessed instead of alternatives?

**Alternatives:**

1. **Blessed** - ncurses library for Node.js [CHOSEN]
2. **Ink** - React for CLIs
3. **Terminal-kit** - Alternative library
4. **Raw ANSI codes** - No library

**Why Blessed:**

| Criterion | Blessed | Ink | Terminal-kit | ANSI Raw |
|-----------|---------|-----|--------------|----------|
| Maturity | [GOOD] Stable (years) | [GOOD] Stable | [~] Less popular | [GOOD] Universal |
| Simplicity | [GOOD] Direct API | [X] Requires React | [~] Complex API | [X] Very manual |
| Completeness | [GOOD] Layouts, mouse, forms | [~] React focused | [GOOD] Complete | [X] Manual |
| Community | [GOOD] Large | [GOOD] React devs | [~] Small | N/A |
| Compatibility | [GOOD] Node.js + Bun | [GOOD] Node.js | [GOOD] Node.js | [GOOD] All |
| Learning curve | [GOOD] Simple | [X] Needs React | [~] Moderate | [~] ANSI codes |

**Why NOT Ink:**
- Requires React knowledge (overhead for simple project)
- Unnecessary abstraction for simple TUI
- Larger bundle size

**Why NOT Terminal-kit:**
- Less popular -> fewer resources/community
- More complex API than necessary
- Fewer examples and tutorials

**Why NOT ANSI Raw:**
- Too much manual work (positioning, colors, input)
- Difficult to maintain
- Reinventing the wheel

---

### Decision 3: 8-panel layout or simple layout?

**Approaches:**

1. **Single panel** - Shows only one thing at a time
2. **Two panels** - Radar + market detail
3. **Eight panels** - Radar, Market, Pulse, Orderbook, History, Holders, Alerts, Footer [CHOSEN]

**Why 8 panels:**

- [GOOD] **Complete visibility:** Everything important visible at once
- [GOOD] **Efficiency:** No need to navigate between screens
- [GOOD] **Monitoring:** View multiple markets simultaneously
- [GOOD] **Professional:** Looks like a real trading tool

**Trade-offs:**

| Aspect | Advantage | Disadvantage |
|--------|-----------|--------------|
| **Complexity** | - | [X] More code to manage |
| **Space** | - | [X] Requires larger terminal (minimum 80x24, ideal 120x40) |
| **Learning** | [GOOD] Everything visible | [~] More information to process |

**If terminal is small:**
```typescript
// Implement panel toggling
const compactMode = process.stdout.columns < 100;

if (compactMode) {
  // Show only Radar + Market, hide others
  orderbookTable.hide();
  historyBox.hide();
  holdersTable.hide();
}
```

---

### Decision 4: Continuous update or on-demand?

**Approaches:**

1. **Continuous polling** - Updates every X seconds automatically [CHOSEN]
2. **On-demand** - Only updates when user presses 'r'
3. **Hybrid** - Some things continuous, others on-demand

**Why Continuous Polling:**

- [GOOD] **Real-time:** Data always fresh
- [GOOD] **Convenience:** User doesn't need to do anything
- [GOOD] **WebSocket:** We already receive real-time updates, so why not show them?

**Implemented update strategy:**

| Data | Interval | Reason |
|------|----------|--------|
| **Radar** | 60 seconds | Changes little, market list is relatively static |
| **Orderbook** | 3 seconds (or immediate WebSocket) | Changes a lot, needs to stay current |
| **History** | 30 seconds | Historical data doesn't change quickly |
| **Holders** | 60 seconds | Holder positions change slowly |
| **WebSocket** | Immediate | Real-time push when trades occur |

**Code example:**
```typescript
// src/tui.ts
function startPolling() {
  setInterval(refreshRadar, CONFIG.radarMs);      // 60s
  setInterval(refreshFocus, opts.intervalMs);     // 3s
  setInterval(refreshHistory, CONFIG.historyMs);  // 30s
  setInterval(refreshHolders, CONFIG.holdersMs);  // 60s
}
```

**If it were on-demand:**
```typescript
// User would have to press 'r' always
screen.key("r", () => {
  refreshAllData();
});
// Less convenient, but saves requests
```

---

## 13. Further Reading

### Official Documentation

- **Blessed Documentation**: https://github.com/chjj/blessed
- **Blessed Wiki**: https://github.com/chjj/blessed/wiki
- **ncurses** (original inspiration): https://www.gnu.org/software/ncurses/
- **Terminal Escape Codes**: https://gist.github.com/fnky/458734343aabd01cfb17a3a4f729679d

### Tutorials and Articles

- **Building Terminal UIs with Node.js**: https://blog.npmjs.org/post/164854783755/building-terminal-tools-with-node-and-babel
- **An Introduction to ncurses**: https://www.vt100.net/docs/vt100-ug/chapter3.html
- **Terminal UI Design Patterns**: Blog post series on TUI design

### Example Projects

- **htop** (process monitor): https://htop.dev/
- **btop** (modern htop successor): https://github.com/aristocratos/btop
- **lazydocker** (Docker TUI manager): https://github.com/jesseduffield/lazydocker
- **lazygit** (Git TUI manager): https://github.com/jesseduffield/lazygit

### Videos

- **Terminal UI Design**: Search for "terminal ui design" on YouTube
- **ncurses Programming**: ncurses programming tutorials in C/C++

### Community

- **Reddit**: r/terminal, r/commandline
- **Discord**: Node.js/Bun servers

---

## 14. Chapter Summary

- **TUI** = User interface in the terminal
- **Blessed** = Library for creating TUIs
- **Layout** = Relative positioning (top, left, width, height)
- **Tags** = HTML-like formatting ({bold}, {red}, etc.)
- **Loop** = Refresh timer + rendering
- **Input** = Keyboard capture for interaction
- **Semantics** = Colors and symbols with meaning

---

**Next Chapter:** Error Handling and Rate Limiting

[Continue to Chapter 6](./06-errors-rate-limiting.md)

---

**Version:** 1.0.0
**Last Updated:** January 2026
