# Changelog

## [Unreleased] - 2026-01-06

### Configuration Changes
- **Increase default radarLimit from 10 to 50** - Now fetches 50 markets by default instead of 10
- Add `--limit` CLI flag documentation for overriding market fetch count

### Documentation Improvements
- Add prominent [Polymarket](https://polymarket.com) link to README with note about real/live data
- Add Polymarket platform link to docs/learn/00-introducao.md, docs/learn/03-apis-polymarket.md, docs/learn/README.md
- Update code examples in docs to reflect new default limit of 50
- Add "Fetch More Markets" section to README with `--limit` usage examples

### Documentation Improvements (Major Update)

#### Completed Chapters 05-07
- **Chapter 05 (TUI)**: Added ✅ Checkpoints, ⚠️ Common Pitfalls, 🔧 Troubleshooting, 🎓 Design Decisions, 📚 External Resources
- **Chapter 06 (Erros & Rate Limiting)**: Added ✅ Checkpoints, ⚠️ Common Pitfalls, 🔧 Troubleshooting, 🎓 Design Decisions, 📚 External Resources
- **Chapter 07 (Testes)**: Added ✅ Checkpoints, ⚠️ Common Pitfalls, 🔧 Troubleshooting, 🎓 Design Decisions, 📚 External Resources

#### New Documentation Assets
- **SELF-CRITIQUE-2026-01-06.md**: Comprehensive self-critique against 2025/2026 best practices
- **EXEC-SPEC-2026-01-06.md**: Updated engineering execution specification with 4-phase plan

#### Code Documentation
- **src/http.ts**: Added comprehensive JSDoc comments for all functions
  - Documented exponential backoff with jitter algorithm
  - Documented retry strategy (429, 5xx retry; 4xx no retry)
  - Documented rate limiting rules per endpoint
  - Added examples for all major functions
- **src/rateLimiter.ts**: Added token bucket algorithm documentation
  - Algorithm explanation with timeline examples
  - Comparison with alternative rate limiting approaches
  - Jitter explanation for preventing synchronized storms

#### Documentation Enhancements
- 1000+ lines of comprehensive documentation added
- All checkpoints include 5 questions with detailed answers
- All pitfalls include bad vs good code examples
- All troubleshooting sections include symptoms, diagnosis, and solutions
- All design decisions include trade-off analysis tables
- External resources expanded to 12+ links per chapter

### Previous Features

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
- Add visual multi-line ASCII price chart with Unicode block characters in detail modal.

### Improvements
- Improve chart edge case handling: show clear messages for insufficient data (1-2 points) and flat line for stable prices.
- Clear stale chart data when navigating markets (n/p/filter) or swapping outcomes (o).
- Detail screen now updates dynamically when navigating markets (n/p) or swapping outcomes (o).
- Detail screen updates in real-time as async data loads (orderbook, history).
- Fix detail modal z-ordering to appear on top of other UI elements.
- Fix screen.render() call sequence ensuring modal displays correctly after navigation.
- Extract modal content generation to `tui-modals.ts` (162 lines) for better modularity.
- Truncate long token IDs in error messages for better readability.
- Improve Radar table spacing with separate columns and increased padding.
- Increase Event column truncation from 30 to 38 characters.
- Change no-orderbook indicator color from gray to yellow for visibility.
- Extract rendering utilities to `tui-render.ts` for better testability.
- Extract type definitions to `tui-types.ts` for cleaner imports.
- Add 65 tests for TUI and utility functions.
- Update tsconfig.json with stricter TypeScript settings.

### Previous
- Add structured HTTP errors with no-orderbook classification.
- Treat missing orderbooks as a normal UI state and reduce alert noise.
- Add midpoint fallback helper and tests for error classification/midpoint.
- Add a snapshot test path that simulates no-orderbook responses.
