# Polymarket TUI - Alerts/404 Midpoint Hardening Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Implemented

## Context

The TUI still displays noisy alerts when the CLOB returns HTTP 404 with the message "No orderbook exists for the requested token id". This happens for illiquid markets or those with missing orderbooks. The noise appears as `midpoint error: HTTP 404...` and masks real problems. The old `/midprice` fallback was removed, but we still need to treat this 404 as an expected condition, not an error.

## Goals

- Classify CLOB errors in a structured way (status + payload) and differentiate 404 "no orderbook" from real errors.
- Reduce noise in logs/alerts; display "no orderbook" state clearly and silently.
- Avoid unnecessary calls to the `/midpoint` endpoint when we already know there's no orderbook.
- Maintain midpoint via best bid/ask when possible.

## Non-goals

- Change the main UX of the TUI (overall layout).
- Implement trading/authentication.
- Create data persistence.

## Functional Requirements

1) Structured HTTP Errors
- `fetchJson` should produce an error with `status`, `url` and `body` (JSON or text) when `!res.ok`.
- There should be a helper `isNoOrderbookError(err)` based on `status === 404` and message/payload.

2) Alert Policy
- Expected errors (`no orderbook`) should not update `lastAlert` or generate error logs.
- Real errors should continue to register alert + log.
- Upon recovery, clear `lastAlert` when the expected condition no longer exists.

3) Midpoint
- If `/midpoint` fails with `no orderbook`, set `midpoint = midpointFrom(bestBid, bestAsk)` when available.
- If `bestBid/bestAsk` absent and `no orderbook`, display `-` (no alert).

4) UI/Status
- Display "no orderbook" state in the Market/Orderbook panel (e.g., badge/dedicated line).
- Do not print raw error in the Alerts & Status panel.

## Non-functional Requirements

- Do not significantly increase the volume of REST calls.
- Maintain compatibility with current WS behavior.
- Keep logs concise.

## References

- CLOB REST `/midpoint` returns 404 with JSON payload when there's no orderbook.
- Current rate limiting remains the same.

## Proposed Architecture

### Changes in HTTP layer

- Introduce `HttpError` with fields:
  - `status: number`
  - `url: string`
  - `body: unknown` (json/text)
  - `message: string` (short summary)
- `fetchJson` now attempts `res.json()` and falls back to `res.text()` when JSON fails.

### Changes in API layer

- `getMidpoint` returns structured error; no fallback.
- `getOrderbook`/`getPrices` now recognize `no orderbook` and return `undefined`/`null` instead of propagating error (optional, via flag).

### Changes in TUI

- Replace string checks with `isNoOrderbookError(err)`.
- `lastAlert` only updates for real errors.
- Create `lastNoOrderbookAt` and display soft (muted) status in the panel.

## Multi-phase Engineering TODO

### Phase 0 - Diagnosis and Reproduction

- [OK] Reproduce 404 with known tokenId (via direct fetch to `/midpoint`).
- [OK] Capture actual shape of 404 payload (JSON vs HTML) and confirm message string.
- [OK] Map where `lastAlert` gets stuck even after success.

### Phase 1 - Structured HttpError

- [OK] Create `HttpError` class in `src/http.ts`.
- [OK] Update `fetchJson` to throw `HttpError` with status/url/body.
- [OK] Add helper `isNoOrderbookError(err: unknown)` in `src/http.ts` or `src/parsers.ts`.
- [OK] Update calls to use the new helper.

### Phase 2 - API and Fallback Strategies

- [OK] Ensure `getMidpoint` without fallback and with 404 handling.
- [OK] Optional: avoid calling `/midpoint` if `getPrices` or `getOrderbook` already indicated `no orderbook`.
- [OK] Consolidate rule: preferential midpoint via `/midpoint`; fallback via `(bestBid+bestAsk)/2`.

### Phase 3 - TUI: Alerts and Status

- [OK] Change `lastAlert` update to not show `no orderbook`.
- [OK] Clear `lastAlert` when state returns to normal.
- [OK] Display `no orderbook` state in Market/Orderbook panel (light text).
- [OK] Avoid logError for expected 404s.

### Phase 4 - Tests

- [OK] Unit tests for `HttpError` and `isNoOrderbookError`.
- [OK] Test for midpoint fallback with `bestBid/bestAsk`.
- [OK] CLI snapshot test for market without orderbook (should not fail or alert).

### Phase 5 - Documentation

- [OK] Update `docs/plans/polymarket-tui-demo-exec-spec.md` (remove /midprice and record new alert policy).
- [OK] Update README if there's a troubleshooting section.

## Risks

- 404 payloads may vary (HTML vs JSON). Mitigate with robust parsing.
- Silencing too many errors can hide real problems. Mitigate with structured `HttpError` and conditionally detailed logs.

## Acceptance Criteria

- In markets without orderbook, the TUI does not show `midpoint error` or 404 spam.
- In markets with orderbook, midpoint and best bid/ask remain correct.
- Logs do not lose real errors (e.g., 5xx, 429).
- JSON snapshot remains valid even when orderbook is absent.

## Verification

- 2026-01-06: `/midpoint` with token without orderbook returns JSON `{\"error\":\"No orderbook exists for the requested token id\"}` (HTTP 404).

---

**Version:** 1.0.0
**Last Updated:** January 2026
