# Changelog

## [Unreleased] - 2026-01-06

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

### Improvements
- Detail screen now updates dynamically when navigating markets (n/p) or swapping outcomes (o).
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
