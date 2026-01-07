# Changelog

## [Unreleased] - 2026-01-07

### OpenTUI Implementation (Experimental)
- **Complete OpenTUI backend** - Full-featured TUI implementation using @opentui/core
  - 8-panel layout matching blessed implementation (radar, market, pulse, orderbook, history, holders, alerts, footer)
  - Detail modal with scrolling support (Enter key to open, j/k to scroll, ESC to close)
  - Help modal with keyboard shortcuts (h key to open)
  - Full keyboard navigation (n/p for markets, o for outcome toggle, r for refresh)
  - Signal handlers for graceful shutdown (SIGINT, SIGTERM, SIGQUIT)
  - Error boundaries and recovery for TUI operations
  - WARNING: OpenTUI is NOT production-ready - use Blessed for production

- **Event-driven state management** - Centralized state with EventEmitter
  - `StateManager` singleton with immutable state updates
  - State change events for reactive rendering
  - Input validation for all state mutations (focusIndex, outcomeIndex, etc.)
  - Debounced rendering to prevent CPU thrashing

- **Result type for error handling** - Functional error handling pattern
  - `Result<T, E>` type with `ok()` and `err()` constructors
  - Helper functions: `unwrap`, `unwrapOr`, `map`, `mapErr`, `flatMap`, `fromPromise`
  - Type guards: `isOk`, `isErr`

- **TUI-safe logging** - Logger that writes to stderr (not stdout)
  - Log levels: DEBUG, INFO, WARN, ERROR
  - In-memory log storage with rotation (max 100 entries)
  - Log filtering and counting utilities

- **Specialized error types** - Domain-specific errors for TUI operations
  - `TUIError` base class with code, context, timestamp, and `toJSON()`
  - Subclasses: `RenderError`, `DataError`, `NavigationError`, `NetworkError`, `InitError`
  - Type guards for all error types

- **Configuration system** - Centralized config with runtime updates
  - Layout config (panel dimensions, heights)
  - Color config (theme colors for bid/ask, borders, etc.)
  - Performance config (target FPS, debounce delays, cache expiry)
  - `getConfig()`, `updateConfig()`, `resetConfig()` functions

- **Market service with caching** - Cached API calls for radar data
  - Configurable cache expiry via performance config
  - Cache status monitoring

### TypeScript Strict Mode Enhancements
- **Enable `noUncheckedIndexedAccess`** - Array and object index access now returns `T | undefined`, catching potential undefined access bugs at compile time
- **Enable `noImplicitOverride`** - Method overrides must use `override` keyword, preventing accidental override shadowing
- **Enable `noImplicitReturns`** - All code paths in functions must explicitly return, catching missing return bugs
- **Fix array access safety** - Added optional chaining to test assertions for array index access (`src/tui-render.test.ts:317,323`, `src/utils.test.ts:119`)
- **Fix HttpError override** - Added `override` keyword to `isRateLimit()` method (`src/http.ts:78`)

### Code Quality: Signal Handler Best Practice
- **Use `process.once()` for OS signals** - Changed SIGINT/SIGTERM/SIGQUIT handlers from `process.on()` to `process.once()` in both blessed and OpenTUI implementations (`src/tui.ts:1059-1060`, `src/opentui/tui.ts:72`)
  - Handlers auto-remove after first call, preventing potential double-execution
  - Standard Node.js pattern for one-time shutdown signals
  - Note: `uncaughtException` and `unhandledRejection` handlers correctly remain as `process.on()` as they may fire multiple times before process exit

### Documentation: Bun Runtime Flag Standardization
- **Add `--bun` flag to all commands** - Ensures Bun runtime is used instead of Node.js fallback
  - Updated `package.json` scripts: `dev`, `dev:opentui`, `snapshot`, `tui`, `markets`, `typecheck`
  - Updated README.md with all `bun --bun run dev` command examples
  - Updated CLAUDE.md with consistent command syntax
- **Update all documentation files** - Consistent `--bun` flag across all docs
  - `docs/diagrams/ARQUITETURA-COMPLETA.md` - Mermaid diagrams
  - `docs/plans/*.md` - All plan and spec documents (12 files)
  - `docs/learn/*.md` - Tutorial documentation
  - `docs/engineering-*.md` - Engineering specs and todos
  - `docs/TROUBLESHOOTING.md` - Already had correct syntax
- **Why `--bun` matters for CLI tools**: Per [Bun docs](https://bun.sh/docs/cli/run), the flag forces Bun runtime for tools with Node.js shebangs (like `tsc`)

### Fresh Eyes Code Review Fixes (Phase 2)
- **CRITICAL: Fix HTTP retry logic** - HttpError from 4xx responses was being caught and incorrectly retried; now immediately rethrows non-retryable errors (`src/http.ts:228-243`)
- **HIGH: Fix duplicate field check** - Copy-paste bug in `extractTokenIds` checked `clobTokenIds` twice instead of checking both `clobTokenIds` and `clob_token_ids` (`src/api.ts:596-599`)
- **MEDIUM: Add Zod schema passthrough** - Added `.passthrough()` to `GammaMarketSchema` and nested token objects to allow extra API fields without validation failure (`src/schemas.ts:126-147`)
- **MEDIUM: Fix lastWsAt type safety** - Prevent potential `undefined` assignment to `lastWsAt` (type `number`) when WebSocket update lacks timestamp (`src/tui.ts:1264-1266`)
- **LOW: Add graceful shutdown handlers** - Added SIGTERM/SIGINT signal handlers for proper cleanup on `kill` or Docker stop (`src/tui.ts:1057-1059`)
- **LOW: Add shutdown guard** - Prevent double execution of cleanup from rapid signals using `isShuttingDown` flag (`src/tui.ts:1048-1051`)

### Fresh Eyes Code Review Fixes (Phase 1)
- **Fix test mock field name** - Changed `volume24h` to `volume24hr` to match `MarketInfo` type
- **Remove unused parameter** - Removed dead `renderer` parameter from `clearBox()` function
- **Fix hardcoded limit** - Refresh handler now uses validated options instead of hardcoded `50`
- **Fix config caching bug** - MarketService now gets fresh config on each call instead of caching at construction
- **Fix shallow copy issue** - Initial config now properly deep copies nested objects
- **Log cleanup errors** - Shutdown cleanup now logs errors instead of silently swallowing them

### Test Coverage
- **5 regression tests** for Phase 2 fixes:
  - HTTP retry: Verify 4xx errors are not retried (exact attempt count)
  - Zod passthrough: Verify extra API fields are preserved
  - Zod nested passthrough: Verify extra fields in nested tokens array
  - API snake_case: Verify `clob_token_ids` field is recognized
  - API precedence: Verify camelCase takes precedence when both exist
- **119 OpenTUI tests** covering:
  - State manager (modal state, navigation, pricing, alerts, filters, stats)
  - Result type (ok, err, unwrap, map, fromPromise)
  - Logger (levels, filtering, rotation, counts)
  - Config (defaults, updates, reset)
  - Error types (TUIError, subclasses, type guards)
  - Types (createDefaultState, getFocusedMarket, getCurrentTokenId, validateDashboardOptions)
  - Market service (cache status, clear cache)

## [Previous] - 2026-01-06

### New Features
- **Comprehensive Error Handling System** - Structured error types for better debugging and error handling
  - `AppError` base class with error codes, context metadata, timestamps, and `toJSON()` serialization
  - Specialized error types: `NetworkError`, `ValidationError`, `ApiError`, `ConfigError`, `WebSocketError`, `ParseError`, `RateLimitError`
  - Type guards: `isAppError`, `isNetworkError`, `isValidationError`, `isApiError`, `isRateLimitError`
  - Utility functions: `getErrorInfo`, `formatErrorForLogging`, `normalizeError`
  - `HttpError` now extends `NetworkError` for consistency with error hierarchy
  - 33 comprehensive tests for error handling
- **Zod Runtime Validation** - Schema validation at API boundaries
  - `TokenIdSchema`, `ConditionIdSchema`, `MarketIdSchema` for branded types
  - `GammaMarketSchema`, `OrderbookStateSchema` for API responses
  - `validateWithSchema()` helper with detailed error reporting
  - Configurable via `CONFIG.enableValidation` flag (disabled by default)
- **Scrollable Radar Panel** - Radar box now scrolls to show all markets (not limited by display height)
  - Added scrollbar with visual indicator
  - Vi-style navigation: `j`/`k` or arrow keys to scroll
  - Mouse wheel scrolling support
  - Market count displayed in label: `Radar (N)`
- **Error Notification Toast** - Errors now display as auto-dismissing toast notifications
  - Shows at top-right for 5 seconds
  - Color-coded by type (error=red, warning=yellow, info=blue)
  - Replaces inline footer error messages for better visibility
- Update help modal with scroll instructions (`j`, `k`, arrow keys)
- **Market URL in Detail Modal** - Show direct Polymarket link for each market

### Bug Fixes
- **Fix scroll interference** - j/k keys no longer scroll radar when detail modal is open
- **Fix graceful shutdown** - Call `screen.destroy()` on quit for proper terminal cleanup
- **Remove emojis from alerts** - Replace emoji warning symbols with text (per coding guidelines)

### Improvements
- **Detail modal scrolling** - Add mouse wheel support and scrollbar to detail modal

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
