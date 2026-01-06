# TUI Comprehensive Review and Enhancement

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

Maintained in accordance with `dev/GUIDELINES-REF/EXECPLANS-GUIDELINES.md`.

## Purpose / Big Picture

This plan delivers a comprehensive review and enhancement of the Polymarket Pulse TUI dashboard. After implementation, users will have:

1. An Enter key binding that opens a detail screen showing expanded market information
2. A help modal (h key) displaying all available commands
3. Improved keyboard navigation with arrow keys and number selection
4. Better code organization following the 300-line file guideline
5. Comprehensive test coverage for TUI logic
6. Type safety improvements removing any implicit `any` types

The result is a production-quality TUI that John Carmack would approve: clear, correct, simple, and tested.

## Progress

- [x] (2026-01-06 00:00Z) Read all source files for comprehensive code review
- [x] (2026-01-06 00:01Z) Read guidelines-ref docs (PRAGMATIC-RULES, DEV-GUIDELINES, TYPESCRIPT-GUIDELINES, EXECPLANS-GUIDELINES)
- [x] (2026-01-06 00:02Z) Create engineering exec spec in docs/plans/
- [x] (2026-01-06 00:03Z) Phase 1: Implement Enter key detail screen - added detailModal with scrollable market info
- [x] (2026-01-06 00:04Z) Phase 2: Add help modal (h key) - added helpModal with all keybindings
- [x] (2026-01-06 00:05Z) Phase 3: Extract tui-types.ts (63 lines) and tui-render.ts (151 lines)
- [x] (2026-01-06 00:06Z) Phase 4: Add 45 tests for tui-render module (59 total tests passing)
- [x] (2026-01-06 00:07Z) Phase 5: Final verification - TypeScript compiles, all tests pass
- [x] (2026-01-06 00:08Z) Phase 6: Detail modal updates on navigation (n/p/o keys)
- [x] (2026-01-06 00:09Z) Phase 7: Bugfix - screen.render() after renderDetailModal() in n/p/o handlers

## Surprises & Discoveries

- Observation: tui.ts is 1047 lines, significantly exceeding the 300-line guideline from DEV-GUIDELINES.md
  Evidence: Line count via `wc -l src/tui.ts`

- Observation: Blessed library uses tag-based formatting which requires escaping curly braces
  Evidence: `escapeTags()` function at line 1009-1011

- Bug Found: Detail modal not displaying when navigating with n/p keys
  Root Cause: `render()` calls `screen.render()` internally, but `renderDetailModal()` called afterward without a subsequent `screen.render()`
  Fix: Wrap `renderDetailModal()` in block with explicit `screen.render()` call

- Observation: WebSocket integration has sophisticated sequence/hash tracking for resync detection
  Evidence: Lines 846-864 in connectMarketWs callback

## Decision Log

- Decision: Add detail screen as modal overlay rather than full screen replacement
  Rationale: Modal preserves context and allows quick dismissal with ESC; follows blessed patterns
  Date/Author: 2026-01-06 / Agent

- Decision: Extract rendering functions into separate module (src/tui-render.ts)
  Rationale: Reduces main file size and improves testability; follows DEV-GUIDELINES.md file size limits
  Date/Author: 2026-01-06 / Agent

- Decision: Add help modal showing all keybindings dynamically
  Rationale: Improves discoverability; current footer only shows partial list
  Date/Author: 2026-01-06 / Agent

- Decision: Update detail modal on navigation (n/p/o keys)
  Rationale: Users expect modal to reflect current market when scrolling; improves UX without requiring modal close/reopen
  Date/Author: 2026-01-06 / Agent

## Outcomes & Retrospective

**Completed**: 2026-01-06

**Achievements**:
1. Enter key detail screen - Shows expanded market info with full orderbook, pricing, and history
2. Help modal (h key) - Displays all keybindings organized by category
3. Extracted tui-types.ts (63 lines) and tui-render.ts (151 lines) for better modularity
4. Added 45 tests for rendering utilities (59 total tests, 86 assertions)
5. All TypeScript compiles cleanly with strict mode
6. Detail modal updates dynamically when navigating markets (n/p) or swapping outcomes (o)
7. Fixed screen.render() call sequence ensuring modal displays after navigation

**Remaining**:
- Main tui.ts still at 1148 lines (added modals increased size)
- Further extraction possible: modal rendering, key binding setup

**Lessons Learned**:
- Blessed modal patterns require parent reference and show/hide methods
- ESC key handling must check modal state before closing
- Extracting utilities to separate modules greatly improves testability
- Health score calculation benefits from parameterized options pattern
- In blessed, `setContent()` changes are not visible until `screen.render()` is called - must call after updating any element

## Context and Orientation

The Polymarket Pulse TUI dashboard is a terminal-based interface for monitoring Polymarket prediction markets. It uses the `blessed` library for terminal rendering.

Key files and their purposes:
- `src/tui.ts` (1047 lines) - Main dashboard implementation with all UI components and keybindings
- `src/api.ts` (267 lines) - Polymarket API client for fetching market data
- `src/ws.ts` (121 lines) - WebSocket client for real-time updates
- `src/config.ts` (25 lines) - Configuration constants
- `src/parsers.ts` (105 lines) - Data normalization utilities
- `src/utils.ts` (77 lines) - General utilities (formatting, sparklines)
- `src/http.ts` (91 lines) - HTTP layer with rate limiting

Current TUI keybindings (from `bindKeys()` function):
- q, Ctrl-C: Quit application
- n: Navigate to next market
- p: Navigate to previous market
- o: Swap between outcome sides
- r: Refresh all data
- f, /: Open filter prompt
- s: Save snapshot to JSON
- a: Toggle auto-skip markets without orderbooks
- t: Set price alerts with threshold syntax
- e: Export history to CSV

Missing features identified:
- Enter key: Show detail screen (user requested)
- h: Help modal with all keybindings
- Arrow keys: Alternative navigation
- Number keys: Direct market selection (1-9)
- ESC: Close modals and return to main view

## Plan of Work

Phase 1 - Detail Screen (Enter key):
Create a modal overlay that displays expanded market information when Enter is pressed. The modal shows full market details, complete orderbook, and trade history. Dismiss with ESC or Enter again.

In `src/tui.ts`, add a new blessed box component `detailModal` after line 168 (after alertPrompt definition). Add `showDetailModal` state variable. In `bindKeys()`, add Enter key handler that toggles modal visibility. Create `renderDetailModal()` function to populate the modal content.

Phase 2 - Help Modal (h key):
Create a help modal that displays all keybindings in a clear format. This improves discoverability for new users.

Add `helpModal` blessed box after detailModal. Add h key binding. Create `renderHelpModal()` with formatted keybinding list.

Phase 3 - Code Refactoring:
Extract rendering functions to reduce tui.ts file size below 500 lines (aiming for 300).

Create `src/tui-render.ts` containing:
- renderTable()
- renderRadar()
- renderMarket()
- renderPulse()
- renderOrderbook()
- renderHistory()
- renderAlerts()
- renderHolders()
- color/formatting utilities

Create `src/tui-types.ts` containing:
- DashboardOptions
- DashboardState type
- Theme constants

Phase 4 - Testing:
Add tests for extracted rendering functions using bun:test.

Create `src/tui-render.test.ts` with tests for:
- renderTable formatting
- color escaping
- truncation
- heat calculation
- health score computation

Phase 5 - Final Review:
Run full test suite, verify type safety with `tsc --noEmit`, review against guidelines.

## Concrete Steps

Phase 1 - Detail Screen:

    cd /Users/mneves/dev/polymarket-analyzer

    # After implementation, test by:
    bun run dev
    # Press Enter on any market to see detail modal
    # Press ESC or Enter again to dismiss

Expected behavior: Modal appears with expanded market info, full orderbook depth, and dismisses cleanly.

Phase 2 - Help Modal:

    # After implementation, test by:
    bun run dev
    # Press h to see help modal
    # Press ESC or h to dismiss

Expected output: Modal showing all keybindings in organized format.

Phase 3 - Refactoring:

    # After refactoring, verify:
    wc -l src/tui.ts
    # Should be under 500 lines

    wc -l src/tui-render.ts
    # Should be under 300 lines

    bun run dev
    # Verify dashboard still works correctly

Phase 4 - Testing:

    bun test src/tui-render.test.ts
    # All tests should pass

Phase 5 - Final Verification:

    bun run tsc --noEmit
    # No type errors

    bun test
    # All tests pass

    bun run dev
    # Manual verification of all keybindings

## Validation and Acceptance

1. Enter key shows detail modal with:
   - Full event title and question (no truncation)
   - Complete condition ID and token ID
   - Full orderbook depth (all available levels)
   - 24hr volume and price change statistics
   - Top holders list

2. Help modal (h key) displays:
   - All keybindings organized by category
   - Brief description for each command
   - Current toggle states (auto-skip, filters)

3. Code organization:
   - src/tui.ts under 500 lines
   - src/tui-render.ts under 300 lines
   - No circular dependencies
   - Clean imports

4. Tests:
   - At least 10 test cases for rendering functions
   - Tests for edge cases (empty data, missing values)
   - All tests pass

5. Type safety:
   - `bun run tsc --noEmit` passes with no errors
   - No implicit `any` types
   - All function return types explicit

## Idempotence and Recovery

All changes are additive and can be reverted via git. The refactoring maintains backward compatibility - existing keybindings and behavior are preserved.

If a phase fails:
- Phase 1: Revert detail modal additions, dashboard remains functional
- Phase 2: Revert help modal, dashboard remains functional
- Phase 3: If refactoring breaks anything, revert to monolithic tui.ts
- Phase 4: Tests are additive, can be removed without affecting runtime
- Phase 5: Review findings documented for future iteration

## Artifacts and Notes

Current keybindings from tui.ts bindKeys():

    screen.key(["q", "C-c"], ...) // quit
    screen.key(["n"], ...)        // next market
    screen.key(["p"], ...)        // prev market
    screen.key(["a"], ...)        // auto-skip toggle
    screen.key(["o"], ...)        // swap outcome
    screen.key(["r"], ...)        // refresh
    screen.key(["f", "/"], ...)   // filter
    screen.key(["s"], ...)        // save snapshot
    screen.key(["t"], ...)        // set alert
    screen.key(["e"], ...)        // export CSV

Health score calculation (lines 464-495):

    Spread: 0-35 points
      <= 0.01: 35 pts
      <= 0.03: 25 pts
      <= 0.05: 15 pts
      <= 0.10: 5 pts

    Depth: 0-35 points
      > 10000: 35 pts
      > 5000: 25 pts
      > 1000: 15 pts
      > 100: 5 pts

    Volume: 0-30 points
      > 100000: 30 pts
      > 10000: 20 pts
      > 1000: 10 pts
      > 100: 5 pts

    Grade: A >= 80, B >= 60, C >= 40, D >= 20, F < 20

## Interfaces and Dependencies

New exports from src/tui-render.ts:

    export function renderTable(rows: string[][], padding?: number): string
    export function renderRadar(radar: MarketInfo[], focusMarket: MarketInfo | null, noOrderbookTokens: Set<string>, limit: number): string
    export function colorText(value: string, color: string): string
    export function escapeTags(value: string): string
    export function truncate(value: string, max: number): string
    export function computeHealthScore(opts: HealthScoreOptions): { score: number; label: string; color: string }
    export function computeHeat(market: MarketInfo): number
    export function heatSymbol(market: MarketInfo): string
    export const THEME: ThemeConfig

New type from src/tui-types.ts:

    export type DashboardState = {
      radar: MarketInfo[]
      focusMarket: MarketInfo | null
      outcomeIndex: number
      orderbook: OrderbookState | null
      historySeries: number[]
      bestBid: number | undefined
      bestAsk: number | undefined
      midpoint: number | undefined
      lastTrade: number | undefined
      noOrderbook: boolean
      wsStatus: string
      lastAlert: string
      priceAlertHigh: number | null
      priceAlertLow: number | null
      autoSkipNoOrderbook: boolean
      radarFilter: string
    }

---

Revision Notes:
- 2026-01-06: Initial creation of exec plan based on comprehensive code review
