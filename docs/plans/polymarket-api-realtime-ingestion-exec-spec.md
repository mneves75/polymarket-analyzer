# Polymarket API Realtime Ingestion - Exec Spec

Date: 2026-01-06
Owner: (fill)
Status: Draft

## Context
Objective: to unpack the Polymarket API and implement an ingestion pipeline that captures as much data as possible with minimal latency ("as it happens"). This requires combining real-time sources (WebSocket) with backfill/polling (REST) and state reconciliation.

## Objectives
- Cover all official documented sources: CLOB WebSocket + CLOB REST, Gamma API, Data API, RTDS, and on-chain subgraph.
- Low latency for market events (orderbook and last trade) via WebSocket.
- Data consistency with reconciliation (snapshot + stream) and reprocessing.
- Complete observability (lag, losses, reconnection, quality).

## Non-objectives
- Trade execution in production (only ingestion and analysis).
- Automated trading/market making.
- UX/final visualization (out of scope for this spec).

## Official data sources (what to capture)

### 1) CLOB WebSocket (real-time)
- Base: wss://ws-subscriptions-clob.polymarket.com/ws/
- Main channels:
  - market: public market data, low latency.
  - user: authenticated user data (orders/trades), if credentials are available.
- Subscriptions:
  - market uses assets_ids (token IDs) and type=MARKET.
  - user uses markets (condition IDs) and type=USER.
  - custom_feature_enabled enables extra events (e.g., best_bid_ask, new_market).
  - Support dynamic subscribe/unsubscribe without reconnect.
- Relevant messages from market channel:
  - book: orderbook snapshot/updates (bids/asks).
  - price_change: incremental deltas of bids/asks (new schema since 2025-09-15).
  - last_trade_price: last traded price (trade event).
  - tick_size_change: tick change when price crosses 0.04 or 0.96.
  - best_bid_ask: best bid/ask when custom_feature_enabled.
  - new_market: new market (custom_feature_enabled).
- Optional: initial_dump=true (default) for initial snapshot via WS.
- Note: docs show inconsistencies in keys (buys/sells vs bids/asks). Parser must accept both.
- User channel includes trade events with status changes (MATCHED, MINED, CONFIRMED, RETRYING, FAILED).
- Best practices recommend: maintain local orderbook, respond to heartbeats, and detect gaps.

### 2) CLOB REST (snapshot + backfill)
- Base: https://clob.polymarket.com
- Main endpoints (public):
  - GET /book, POST /books (orderbook snapshot, batch)
  - GET /price, GET /prices, POST /prices (price; batch with body)
  - GET /midpoint (mid price)
  - GET /prices-history (price history; rate limits reference /price_history)
  - GET /data/trades (trades from authenticated user; requires L2 header)
- Use for:
  - Initial snapshot (if not using initial_dump on WS).
  - Resync when gaps/errors detected.
  - Historical backfill (prices-history).
  - Detailed trades when auth available (user-scoped).

### 3) Gamma API (event/market metadata)
- Base: https://gamma-api.polymarket.com
- Main endpoints:
  - GET /events (recommended for discovery with pagination)
  - GET /markets
- Use for:
  - Discovery of active markets/events.
  - Map market -> conditionId -> token/outcome/asset_id.
  - Update metadata (title, category, timestamps, resolution, etc).
- Common practice: /events with active=true, closed=false, order/id, and pagination by limit/offset.

### 4) Data API (aggregated user and market data)
- Base: https://data-api.polymarket.com
- Main endpoints:
  - GET /positions (current positions)
  - GET /activity (on-chain activity)
  - GET /trades (trade history)
  - GET /closed-positions (closed positions)
  - GET /holders (top holders per market)
  - GET /value (total portfolio value)
  - GET /v1/leaderboard (trader rankings)
- Use for:
  - Aggregated position and activity data.
  - Top holders, leaderboard, and metrics not available in CLOB WS.
  - Polling with longer intervals (not real-time).
- Pagination: respect limit/offset and prefer time windows for backfill.
- Since 2025-08-26, /trades and /activity have lower limits (limit <= 500, offset <= 1000).
- Limits per endpoint (docs):
  - /positions: limit <= 500, offset <= 10000
  - /activity: limit <= 500, offset <= 10000 (changelog reduces offset to 1000)
  - /trades: limit/offset up to 10000 (changelog reduces to 500/1000)
  - /closed-positions: limit <= 50, offset <= 100000
  - /holders: limit <= 20
  - /v1/leaderboard: limit <= 50, offset <= 1000

### 5) RTDS WebSocket (comments and crypto)
- Base: wss://ws-live-data.polymarket.com
- Known messages:
  - Crypto prices.
  - Market comments (comment_created, comment_removed, reaction_created, reaction_removed).
- Use when needed to enrich context (comments and price references).
- Crypto prices are derived from feeds (e.g., Binance + Chainlink).
- Maintain periodic ping/pong (e.g., 5s) and support dynamic subscribe/unsubscribe.

### 6) On-chain / Subgraph
- Use to reconcile resolutions and on-chain facts when needing to guarantee finality.
- Source suggested in Polymarket docs as "Additional Data Sources".

## Proposed Architecture

### Overview
- Market Discovery Service (Gamma): generates list of markets and asset_ids.
- Real-time Streamer (CLOB WS): subscribes to market channel by asset_ids; emits normalized events.
- Snapshot/Backfill Service (CLOB REST + Data API): snapshots and history.
- RTDS Listener (optional): comments and crypto prices.
- Normalizer: standardizes schemas and IDs.
- Storage:
  - Relational (Postgres) for metadata and reference data.
  - Time-series (ClickHouse/Timescale) for ticks and orderbook updates.
  - Object store (S3) for raw event logs.
- Event bus (Kafka/Redpanda) for decoupled ingestion and processing.

### Identifiers and relationships
- event_id (Gamma /events)
- market_id and condition_id (Gamma /markets)
- asset_id (CLOB token/outcome; derived from clobTokenIds/outcomes)
- trade_id (CLOB trades)
- user_id (Data API, when applicable)

### Real-time flow (market data)
1) Poll Gamma /events and /markets to discover/update markets.
2) Extract asset_ids from each market.
3) Connect WS to market channel and subscribe by asset_ids.
4) If initial_dump=true, generate initial orderbook snapshot via WS; otherwise, use CLOB REST /book(s).
5) Process updates:
   - price_change -> apply deltas to orderbook.
   - book -> replace snapshot when sent.
   - last_trade_price -> generate simplified trade event; then supplement via Data API /trades (short poll) or via CLOB /data/trades if auth available.
6) Periodically reconcile with /book(s) and /prices-history to ensure consistency.

### Aggregated data flow
- Data API: interval polling (e.g., 1-5 min) for positions/activity/holders/value.
- Leaderboard: slower polling (e.g., 5-30 min).
- RTDS: maintain connection and heartbeats; map comments to market_id.

### Reliability and reconciliation
- Detect gaps: counters/sequence or timestamps out of order.
- Re-sync: full snapshot + replay of recent events.
- Idempotency: composite key (source, type, id, timestamp, hash) for deduplication.
- Monitor orderbook hashes/sequence when exposed by feeds.

### Rate limits and throttling
- Respect official limits per endpoint (CLOB, Gamma, Data API) and backoff.
- Limits use throttling (Cloudflare), not immediate rejection.
- Implement rate bucket per host and per endpoint.
- Data API: respect pagination limits (limit/offset) and adjust backfill by time windows.
- Quick reference (per 10s):
  - CLOB general: 9000
  - CLOB: /book 1500, /books 500, /price 1500, /prices 500, /midpoint 1500
  - CLOB: /price_history 1000, /data/trades 500
  - Gamma general: 4000
  - Gamma: /events 500, /markets 300
  - Data API: general 1000, /positions 150, /trades 200, /closed-positions 150

### Observability
- Metrics: WS lag, msgs/s, drops, reconnections, desyncs, processing latency.
- Structured logs and reprocessing trail.
- Alerts: lag > Xs, frequent reconnections, backfill failures.

## Multi-phase Engineering TODO

### Phase 0 - Discovery and technical foundation
- Read official docs and confirm endpoints/params in real environment.
- Define the stack (language, WS libs, DB, queue) and deployment patterns.
- Define canonical data schema and normalization rules.
- Document auth requirements (L2 headers) for user channel.
- Validate exact path for midpoint and price_history/prices-history, plus batch endpoints.

### Phase 1 - Foundation and storage
- Create ingestion repository with environment config.
- Implement models and migrations (market, event, token, orderbook, trade, activity, holder).
- Prepare raw event storage (S3 or filesystem).
- Setup observability (metrics + logs).

### Phase 2 - Gamma discovery
- Implement /events and /markets crawler with pagination.
- Map market -> asset_ids; maintain active/closed list.
- Delta sync (update only changed markets).
- Persist metadata and events.

### Phase 3 - CLOB WS real-time
- Connect WS market channel with reconnect + backoff.
- Subscriptions by asset_ids, with sharding for connection limits (token limit removed 2025-09-15).
- Support price_change (new schema) + book + last_trade_price + tick_size_change + best_bid_ask.
- Lenient parser for buys/sells vs bids/asks.
- Apply deltas to orderbook and publish normalized events.
- Persist best_bid/best_ask and price_change timestamps.
- Implement heartbeat/keepalive and connection rotation.

### Phase 4 - CLOB REST snapshot/backfill
- Implement /book(s) for initial snapshot and resync.
- Implement /price(s) and /midpoint for checks and baseline.
- Implement /prices-history for history.
- Implement /data/trades for trade details (auth, user-scoped).
- Persist new fields from /book(s) (min_order_size, tick_size, neg_risk) when present.
- Respect limit of up to 500 items per request on batch endpoints (/books, /prices).
- Create periodic reconciler (snapshot vs stream).

### Phase 5 - Aggregated Data API
- Implement polling /positions, /activity, /trades, /closed-positions.
- Implement /holders, /value, /v1/leaderboard.
- Normalize and persist; link with market_id/asset_id.
- Define windows and refresh strategies (e.g., diff by updated_at).
- Adjust pagination for limit/offset limits (e.g., limit <= 500, offset <= 1000).

### Phase 6 - RTDS (comments/crypto)
- Implement RTDS WS with subscribe/unsubscribe.
- Capture comments by market_id and crypto prices.
- Integrate with pipeline and storage.

### Phase 7 - On-chain/subgraph
- Identify official subgraph(s) and minimal queries.
- Backfill resolution and final reconciliation.
- Daily jobs to ensure finality.

### Phase 8 - QA, resilience, and operations
- Integration tests with real endpoints (safe rate).
- Tests for reconnection, loss, and message reordering.
- Incident runbooks and resync playbooks.
- Load test with high number of asset_ids.

### Phase 9 - Validation and delivery
- Validate quality (lag < target, consistency vs REST).
- Document limits and costs.
- Deployment and monitoring checklist.

## Open questions
- What is the desired latency SLA (e.g., < 500ms vs < 2s)?
- Do we need private data (user channel) or only public?
- What is the retention policy for raw events and history?
- Where to host: cloud vs local?
- Do we need additional enrichment (news, external odds)?

## References (to be added to codebase)
- Endpoints base: https://docs.polymarket.com/quickstart/reference/endpoints
- CLOB WSS overview: https://docs.polymarket.com/developers/CLOB/websocket/wss-overview
- CLOB market channel: https://docs.polymarket.com/developers/CLOB/websocket/market-channel
- CLOB user channel: https://docs.polymarket.com/developers/CLOB/websocket/user-channel
- CLOB trades (auth): https://docs.polymarket.com/developers/CLOB/trades/get-trades
- CLOB orderbook /book: https://docs.polymarket.com/api-reference/orderbook/get-order-book-summary
- CLOB orderbook /books: https://docs.polymarket.com/api-reference/orderbook/get-multiple-order-books-summaries-by-request
- CLOB price /price: https://docs.polymarket.com/api-reference/pricing/get-market-price
- CLOB prices /prices: https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices
- CLOB prices /prices (batch): https://docs.polymarket.com/api-reference/pricing/get-multiple-market-prices-by-request
- CLOB midpoint /midpoint: https://docs.polymarket.com/api-reference/pricing/get-midpoint-price
- CLOB prices-history: https://docs.polymarket.com/api-reference/pricing/get-price-history-for-a-traded-token
- Gamma fetch markets guide: https://docs.polymarket.com/developers/gamma-markets-api/fetch-markets-guide
- Data API positions: https://docs.polymarket.com/developers/misc-endpoints/data-api-get-positions
- Data API activity: https://docs.polymarket.com/developers/misc-endpoints/data-api-activity
- Data API trades: https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets
- Data API closed-positions: https://docs.polymarket.com/api-reference/core/get-closed-positions-for-a-user
- Data API holders: https://docs.polymarket.com/developers/misc-endpoints/data-api-holders
- Data API value: https://docs.polymarket.com/developers/misc-endpoints/data-api-value
- Data API leaderboard: https://docs.polymarket.com/api-reference/core/get-trader-leaderboard-rankings
- RTDS overview: https://docs.polymarket.com/developers/RTDS/RTDS-overview
- RTDS crypto prices: https://docs.polymarket.com/developers/RTDS/RTDS-crypto-prices
- RTDS comments: https://docs.polymarket.com/developers/RTDS/RTDS-comments
- Rate limits: https://docs.polymarket.com/quickstart/introduction/rate-limits
- Changelog: https://docs.polymarket.com/changelog
- Data feeds best practices: https://docs.polymarket.com/developers/market-makers/data-feeds
- Polymarket subgraph: https://docs.polymarket.com/developers/subgraph/overview
- CLOB WS migration guide: https://docs.polymarket.com/developers/CLOB/websocket/market-channel-migration-guide

---

**Version:** 1.0.0
**Last Updated:** January 2026
