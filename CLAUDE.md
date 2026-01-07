# CLAUDE.md

@docs/GUIDELINES-REF/claude.md

## Project-Specific Notes

### TUI Implementation

This project supports **two TUI backends** via environment variable switching:

- **Blessed (Default)**: Stable, mature library (v0.1.81, last release 2018)
- **OpenTUI (Experimental)**: Actively developed, Zig-based rendering

**WARNING:** OpenTUI is **NOT production-ready**. The developers explicitly state:
> *"It is currently in development and is not ready for production use."*
> Source: [OpenTUI GitHub](https://github.com/sst/opentui)

**Use Blessed for production.** OpenTUI is for experimentation only.

Switch backends with `OPENTUI=1`:
```bash
bun run dev --tui          # Uses Blessed (default, stable)
OPENTUI=1 bun run dev --tui  # Uses OpenTUI (experimental, not production-ready)
```

#### OpenTUI Lessons Learned

**API Differences from Blessed:**
- **Layout**: Yoga Flexbox (`flexGrow`, `flexBasis`) vs absolute positioning (`top`, `left`, `width`, `height`)
- **Tables**: No built-in table component - use manual formatting with monospaced text
- **Borders**: Manual Unicode box-drawing (`┌─┐│└─┘`) vs `border: "line"`
- **Styling**: Template literals (`t`${bold("text")}``) vs blessed tags (`{red-fg}text{/red-fg}`)
- **Scrolling**: `ScrollBoxRenderable.scrollTo({x, y})` vs `element.scroll(n)`

**Common Pitfalls:**
1. Forgetting `renderer.destroy()` before exit (terminal corruption)
2. Keyboard conflicts - always check modal state before handling scroll keys
3. `flexBasis` expects `number`, not `string` (use `40` not `"40%"`)
4. `scrollTo()` requires `{x, y}` object, not just `y` value
5. Event handler memory leaks - clean up listeners on shutdown

**Import Correctness:**
- Types must be imported from their actual source files, not re-exported from `tui-types.ts`
- Example: `import type { MarketInfo } from "../api.js"` not from `"../tui-types.js"`

**Critical Safety Requirements (OpenTUI):**
1. **Signal Handlers**: Must handle SIGINT, SIGTERM, SIGQUIT for graceful shutdown
2. **Error Handlers**: Must catch uncaughtException and unhandledRejection
3. **Cleanup**: Must call `renderer.destroy()` and remove event listeners on shutdown
4. **Validation**: Must validate all user input and API responses
5. **No console.log**: Use stderr for errors, never console.log in TUI mode

### TUI (blessed) Lessons Learned

**Scroll Key Conflicts:**
- When using `keys: true` + `vi: true` on blessed boxes, j/k keys are automatically handled for scrolling
- If you add screen-level `screen.key(["j", "k"], ...)` handlers, they fire ALONGSIDE the box's built-in handlers
- Always check modal state (`showDetail`, `showHelp`) before handling scroll keys at screen level

```typescript
// BAD - scrolls radar even when modal is open
screen.key(["j", "down"], () => {
  radarTable.scroll(1);
  screen.render();
});

// GOOD - respects modal state
screen.key(["j", "down"], () => {
  if (showDetail || showHelp) return;
  radarTable.scroll(1);
  screen.render();
});
```

**Scrollable Modals:**
- For scrollable modals, always include: `scrollable: true`, `alwaysScroll: true`, `keys: true`, `vi: true`, `mouse: true`
- Add scrollbar for visual feedback: `scrollbar: { ch: "|", track: { bg: "black" }, style: { bg: "cyan" } }`

**Graceful Shutdown:**
- Always call `screen.destroy()` before `process.exit()` to restore terminal state
- This prevents terminal corruption when the app exits

### Code Style Reminders

- **No emojis** in code, comments, alerts, or logs (per PRAGMATIC-RULES.md)
- Use text labels instead: `ALERT HIGH:` not `⚠ PRICE HIGH:`

### URLs

- Polymarket market URL pattern: `https://polymarket.com/event/{slug}`
- Display URLs in detail modals for user convenience
