# Changelog

## Unreleased

### New Features
- Add visual indicator (○) in Radar for markets without orderbooks.
- Add auto-skip navigation (`a` key) to skip markets without orderbooks when using n/p.
- Add market health score (A-F grade) in Pulse panel based on spread, depth, and volume.
- Add configurable price alerts (`t` key) with threshold syntax like `>0.6` or `<0.4`.
- Add CSV export (`e` key) for history data to `exports/` directory.
- Display current price alert thresholds in Alerts panel.
- Add detail screen (`Enter` key) showing expanded market info with full orderbook and history.
- Add help modal (`h` or `?` key) displaying all keyboard shortcuts.
- Add ESC key to close modals (detail and help screens).

### Improvements
- Truncate long token IDs in error messages for better readability.
- Improve Radar table spacing with separate columns and increased padding.
- Increase Event column truncation from 30 to 38 characters.
- Change no-orderbook indicator color from gray to yellow for visibility.
- Extract rendering utilities to `tui-render.ts` for better testability.
- Extract type definitions to `tui-types.ts` for cleaner imports.
- Add 45 tests for TUI rendering functions (59 total tests).

### Previous
- Add structured HTTP errors with no-orderbook classification.
- Treat missing orderbooks as a normal UI state and reduce alert noise.
- Add midpoint fallback helper and tests for error classification/midpoint.
- Add a snapshot test path that simulates no-orderbook responses.
