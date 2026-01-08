# Polymarket TUI Demo - Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Implemented

## Context

Goal: deliver a Bun + TypeScript program with CLI + TUI that demonstrates public Polymarket data in near real-time. The demo should be lightweight, visual, easy to run, and technically correct with current best practices of the API.

## Goals

- Demonstrate discovery (Gamma), market data (CLOB REST + WS), history (prices-history), and holders (Data API).
- Display a TUI dashboard with market radar, orderbook, best bid/ask, last trade, history, and holders.
- Low latency via WebSocket, with fallback to REST.
- Respect official rate limiting and pagination best practices.
- Clean, modular codebase that is easy to evolve.

## Non-Goals

- Trade execution or on-chain wallet.
- L2 authentication and private data (user channel, private positions).
- Durable persistence (database).

## Functional Requirements

1) CLI
- `--tui` starts dashboard (default).
- `--once` prints single JSON snapshot.
- `--list-markets` lists active markets (radar).
- `--market <conditionId>` focuses market by condition id.
- `--slug <slug>` resolves market/event by slug (preference for market slug).
- `--interval <ms>` controls REST polling.
- `--no-ws` disables WebSocket.

2) TUI (layout)
- Top: title, clock, WS status.
- Radar (list): top N active markets with title + outcome 1.
- Market details: event/title/question, condition id, selected outcome, token id.
- Pulse: best bid/ask, spread, midpoint, last trade, bias.
- Orderbook: top N levels (bids/asks).
- History: sparkline + last value.
- Holders: top holders (rank, address, shares).

3) Displayed Data
- Gamma: events/markets for discovery and metadata.
- CLOB REST: /book, /price, /midpoint, /prices-history.
- CLOB WS: market channel (best_bid_ask, last_trade_price, price_change).
- Data API: /holders.

## Non-Functional Requirements

- Simplicity: run with `bun install` + `bun run`.
- Resilience: reconnect WS, backoff, timeouts, out-of-order messages.
- Reliability: schema-tolerant parsing (new price_change, buys/sells vs bids/asks).
- Lightweight observability: error logging and status in footer.
- Resilient UX: treat 404 "no orderbook" as expected state (no noisy alerts).

## Official References (use as source of truth)

- Gamma discovery best practices (use /events with pagination, closed=false; slug for individual market).
- CLOB market channel and migration guide (new price_change schema).
- CLOB REST /book, /price, /midpoint, /prices-history.
- RTDS overview for ping/pong and dynamic subscriptions (if used).
- Official rate limits.

## Proposed Architecture

### Modules

- cli: parse args, help, dispatch
- api: REST clients (Gamma, CLOB, Data API)
- ws: CLOB market channel client
- tui: UI layout + rendering
- state: in-memory store (selected market, radar, orderbook, ticks)
- utils: formatters, rate limiter, retry/backoff

### Data Flow

1) Discovery (Gamma /events): updates radar.
2) Resolve focus (slug/condition id) and extract clobTokenIds.
3) Start WS market channel with asset_ids from focused market (or all radar markets in shard).
4) Poll REST for baseline (book/price/midpoint/history/holders).
5) WS feeds pulse in real-time (best bid/ask, last trade).

### Rate Limiting and Backoff

- Bucket per host and endpoint.
- Respect official limits and use jitter in backoff.
- Prefer WS data to reduce frequent REST calls.

### Resilience

- WS reconnection with exponential backoff and cooldown.
- Heartbeat: ping/pong when applicable.
- REST fallback when WS unavailable.
- Idempotency: basic deduplication by timestamp and asset_id for pulse.

## Multi-phase Engineering TODO

### Phase 0 - Discovery and Verification

- Confirm current schemas of Gamma, CLOB WS (new price_change) and REST.
- Validate /prices-history parameters (market, interval, fidelity).
- Validate current rate limits and pagination limits.
- Review if endpoints return array directly or object with `data`/`events`.

### Phase 1 - CLI Foundation

- Define robust CLI (parse args with validation and clear messages).
- Implement `--help`, `--once`, `--list-markets`, `--market`, `--slug`, `--no-ws`.
- Add `--json` for snapshot/list outputs.

### Phase 2 - Gamma Discovery

- Implement fetch /events with pagination and closed=false.
- Normalize market -> conditionId, clobTokenIds, outcomes.
- In-memory cache with configurable refresh.
- Resolve slug (market slug first; fallback to event slug).

### Phase 3 - CLOB REST Baseline

- Implement /book (orderbook), /price (bid/ask), /midpoint.
- Implement /prices-history (interval + configurable fidelity).
- Normalize orderbook (bids/asks or buys/sells).
- Store tick_size, min_order_size, neg_risk when present.

### Phase 4 - CLOB WS Real-time

- Connect WSS market channel with custom_feature_enabled.
- Implement parsing of new price_change (price_changes[] with best_bid/best_ask per change).
- Support best_bid_ask and last_trade_price.
- Add reconnection, backoff, status in UI.
- Optional: maintain local orderbook (applying price_changes) to avoid frequent polling.

### Phase 5 - Data API Holders

- Implement /holders with limit.
- Normalize fields (shares, shares_value, value).
- Slower refresh (1-5 min).

### Phase 6 - TUI Innovation and UX

- Radar with spread/volatility indicator (simple heat map).
- Alert panel for markets with rapid change (delta > threshold).
- Keys: n/p to navigate, o for outcome, r for refresh, s to save snapshot.
- Visual state for WS (connecting/ok/stale).

### Phase 7 - Observability and Logging

- Simple structured logging (stderr) with errors and response time.
- Staleness indicator (ms since last WS/REST update).
- Basic throughput statistics (msgs/s).

### Phase 8 - QA and Testing

- Unit tests for parsing (new price_change, book, history).
- WS mocks with fixtures.
- CLI tests (help, list, once) with snapshots.

### Phase 9 - Distribution

- Document setup and examples.
- Verify `bin` and shebang for direct execution.
- Optional: bundle with `bun build` for distribution.

## Acceptance Criteria

- Dashboard opens in < 2s and shows real data.
- WS reconnects automatically on network failures.
- WS data reflects current schemas.
- CLI snapshot works and generates valid JSON.
- Respect rate limits without 429 errors.

## Execution Status (Completed)

- Phase 0: validation of schemas and parameters (prices-history, midpoint) without /midprice fallback.
- Phase 1: CLI with args validation and JSON mode.
- Phase 2: Gamma discovery with resilient parsing and default outcomes.
- Phase 3: REST baseline with timeout, normalization, and additional fields.
- Phase 4: WS with new price_change, reconnection/backoff, stale detection.
- Phase 5: holders via Data API with robust parsing.
- Phase 6: TUI with radar heat, alerts, filter, and snapshot.
- Phase 7: simple structured logs and staleness/msg rate indicators.
- Phase 8: unit tests + CLI smoke tests.
- Phase 9: README and build/test scripts.
- Best practices v2: WS ping/heartbeat handling, hash/sequence/timestamp usage, gap detection and resync.

## Open Questions

- Do we need to support RTDS (comments/crypto) in this demo?
- Maximum orderbook depth in the TUI?
- Should we prioritize performance (fewer REST calls) or fidelity (more polling)?
- Do we need to persist snapshots to disk?

---

**Version:** 1.0.0
**Last Updated:** January 2026
