# CLAUDE.md

@docs/GUIDELINES-REF/claude.md

## Project-Specific Notes

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
