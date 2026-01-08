# Detail Modal Navigation Fixes

This ExecPlan is a living document. Maintained in accordance with `dev/GUIDELINES-REF/EXECPLANS-GUIDELINES.md`.

## Purpose / Big Picture

Fix the detail modal to properly update when navigating between markets (n/p keys) and swapping outcomes (o key). The modal should display current market data including the price history chart.

## Progress

- [x] (2026-01-06 00:10Z) Phase 1: Add screen.render() after renderDetailModal() in n/p/o handlers
- [x] (2026-01-06 00:11Z) Phase 2: Add screen.append() for modals after footer for z-ordering
- [x] (2026-01-06 00:12Z) Phase 3: Update refreshFocus() to update detail modal when async data loads
- [x] (2026-01-06 00:13Z) Phase 4: Update refreshHistory() to update detail modal when async data loads
- [x] (2026-01-06 00:14Z) Phase 5: Verify TypeScript compiles and tests pass

## Surprises & Discoveries

- Bug: `render()` calls `screen.render()` internally, but subsequent `renderDetailModal()` had no screen.render() call
  Evidence: Modal content not visible after n/p navigation
  Fix: Wrap renderDetailModal() with explicit screen.render()

- Bug: refreshFocus() and refreshHistory() are async but called synchronously in n/p handlers
  Evidence: Detail modal showed stale data (no chart) until async functions completed
  Fix: Add renderDetailModal() + screen.render() in async function completion callbacks

- Bug: Modals created with parent: screen but not explicitly appended after other elements
  Evidence: Modals appearing behind main UI panels
  Fix: screen.append(detailModal) and screen.append(helpModal) after footer

- Bug: Chart showing stale data from previous market when navigating with n/p/o keys
  Evidence: historySeries not cleared when focusMarket or outcomeIndex changes
  Fix: Reset historySeries = [] in n/p/o/filter handlers before calling refreshHistory()

## Decision Log

- Decision: Update async refresh functions to update modal instead of awaiting them
  Rationale: Non-blocking UI is better UX; modal updates progressively as data loads
  Date/Author: 2026-01-06 / Agent

## Outcomes & Retrospective

**Completed**: 2026-01-06

**Changes Made**:
1. `src/tui.ts:206-207` - Added screen.append() for modals after footer
2. `src/tui.ts:357-361` - Added detail modal update after refreshFocus() async completion
3. `src/tui.ts:369-372` - Added detail modal update after refreshHistory() async completion
4. `src/tui.ts:398-401` - Added screen.render() after renderDetailModal() in swapOutcome()
5. `src/tui.ts:946-949` - Added screen.render() after renderDetailModal() in n key handler
6. `src/tui.ts:964-967` - Added screen.render() after renderDetailModal() in p key handler

**Verification**:
- `bun --bun run tsc --noEmit` - No errors
- `bun test` - 59 tests pass

**Lessons Learned**:
- In blessed, `setContent()` changes require `screen.render()` to be visible
- Z-order in blessed determined by append order, not CSS z-index
- Async callbacks must update UI elements that depend on their data

## Self-Critique Against Guidelines

### Issues Found vs DEV-GUIDELINES.md

1. **File Size Violation** (Critical)
   - `src/tui.ts` is 1170+ lines
   - Guideline: Files should be under 300 lines
   - Recommendation: Extract modal rendering, key bindings, and refresh functions to separate modules

2. **TSConfig Missing Settings** (Medium)
   - Current config lacks: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`
   - Guideline: Use strict family with all safety flags
   - Recommendation: Update tsconfig.json to match TYPESCRIPT-GUIDELINES.md baseline

3. **Error Handling** (Low)
   - Some catch blocks only log without recovery strategy
   - Guideline: Handle errors gracefully with fallback behavior

### Blessed Library Best Practices (from web research)

- Modal focus handling: Using `focus()` after `show()` is correct
- Element stacking: Append order determines z-order (fixed)
- Keys for scrolling: `keys: true` and `vi: true` enable vim-style scrolling

## Remaining Work

### Completed This Session
- [x] Extract tui-modals.ts (162 lines) for modal content generation
- [x] Add proper multi-line ASCII chart with block characters (▁▂▃▄▅▆▇█)
- [x] Update tsconfig.json with `noFallthroughCasesInSwitch`, `forceConsistentCasingInFileNames`, `useUnknownInCatchVariables`
- [x] Add 20 tests for utils.ts including asciiChart function
- [x] Fix stale chart data on navigation - clear historySeries when market/outcome changes
- [x] Improve chart edge cases: show message for 1-2 points, flat line for constant values

### High Priority (Future)
- [ ] Extract tui-keys.ts (~150 lines) for key binding setup
- [x] Add `noUncheckedIndexedAccess` (requires code updates for array access safety) - COMPLETED 2026-01-07

### Medium Priority
- [ ] Add tests for modal update behavior (mock blessed)
- [ ] Add real-time WebSocket updates to detail modal

### Low Priority
- [ ] Reduce main tui.ts to under 500 lines (currently 1063)
- [ ] Add keyboard shortcut to scroll within detail modal content

---

Revision Notes:
- 2026-01-06: Created exec plan for detail modal navigation fixes

---

**Version:** 1.0.0
**Last Updated:** January 2026

