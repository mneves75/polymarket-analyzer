# Polymarket TUI Demo

Realtime CLI + TUI demo for Polymarket public APIs (Gamma discovery + CLOB REST/WS + Data API).

## Quickstart

```sh
bun install
bun run src/index.ts --tui
```

### Snapshot JSON

```sh
bun run src/index.ts --once
```

### List Markets

```sh
bun run src/index.ts --list-markets
bun run src/index.ts --list-markets --json
```

### Focus a Market

```sh
bun run src/index.ts --market <conditionId>
bun run src/index.ts --slug <slug>
```

## TUI Controls

- `n` / `p`: next / previous market
- `o`: toggle outcome
- `r`: refresh data
- `f` or `/`: filter radar
- `s`: save snapshot to `snapshots/`
- `q`: quit

## Notes
- Uses WebSocket market channel for realtime best bid/ask + last trade.
- REST polling provides baseline orderbook, midpoint, price history, and holders.
- Rate limits respected with token bucket per host/endpoint.
- Markets without orderbooks are treated as a normal state (no noisy alerts); midpoint falls back to best bid/ask when available.

## Tests

```sh
bun test
```
