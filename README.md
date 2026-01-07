# Polymarket Analyzer - Realtime CLI/TUI Demo

Realtime terminal interface for [Polymarket](https://polymarket.com) public APIs (Gamma discovery + CLOB REST/WS + Data API).

> **Note**: All data is **real and live** from Polymarket's production APIs. This is not mock/demo data.

## Quickstart

```sh
bun install
bun --bun run dev --tui
```

## Features

- **Real-time WebSocket integration** for live price updates
- **8-panel TUI dashboard** showing market data, orderbook, history, and holders
- **Automatic reconnection** with exponential backoff
- **Rate limiting** using token bucket algorithm per endpoint
- **Smart orderbook handling** treats missing orderbooks as normal state
- **Market health scoring** (A-F) based on spread, depth, and volume
- **Price alerts** with configurable thresholds
- **CSV export** for historical data

## Usage

### TUI Mode

**Blessed (Default - Production Ready):**
```sh
bun --bun run dev --tui
```

**OpenTUI (Experimental - NOT Production-Ready):**
```sh
OPENTUI=1 bun --bun run dev --tui
```

> **WARNING:** OpenTUI is explicitly marked by its developers as **"not ready for production use"**. Use Blessed for production. OpenTUI is for experimentation only. See [OpenTUI GitHub](https://github.com/sst/opentui).

### Snapshot JSON
```sh
bun --bun run dev --once
```

### List Markets
```sh
bun --bun run dev --list-markets
bun --bun run dev --list-markets --json
```

### Focus a Market
```sh
bun --bun run dev --market <conditionId>
bun --bun run dev --slug <slug>
```

### Fetch More Markets
```sh
bun --bun run dev --limit 100           # Fetch 100 markets (default: 50)
bun --bun run dev --list-markets --limit 200  # List 200 markets
```

## TUI Controls

| Key | Action |
|-----|--------|
| `n` / `p` | Next / previous market |
| `o` | Toggle outcome (YES/NO) |
| `r` | Refresh data manually |
| `f` or `/` | Filter radar by keyword |
| `a` | Toggle auto-skip (no orderbook markets) |
| `t` | Set price alert (`>0.6` or `<0.4`) |
| `e` | Export history to CSV |
| `s` | Save snapshot to `snapshots/` |
| `Enter` | Open detail screen |
| `h` or `?` | Show help modal |
| `ESC` | Close modal |
| `q` | Quit |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      index.ts (CLI)                      │
│  - Parses args, selects market, starts TUI or snapshot  │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐      ┌────────▼─────────┐
│  market.ts     │      │    tui.ts        │
│  - Resolves    │      │  - Blessed UI    │
│    market      │      │  - 8 panels      │
└───────┬────────┘      │  - Keyboard      │
        │               │  - Refresh loop  │
        │               └────────┬─────────┘
┌───────▼────────┐               │
│  api.ts        │      ┌────────▼─────────┐
│  - fetchJson   │◄─────┤  ws.ts           │
│  - withQuery   │      │  - WebSocket     │
└───────┬────────┘      │  - Auto-reconnect│
        │               │  - Subscription  │
┌───────▼────────┐      └──────────────────┘
│  rateLimiter   │
│  - Token bucket│
└────────────────┘
```

## Project Structure

```
polymarket-analyzer/
├── src/
│   ├── index.ts          # CLI entry point
│   ├── config.ts         # Configuration
│   ├── market.ts         # Market resolution logic
│   ├── api.ts            # Polymarket API client
│   ├── http.ts           # HTTP with retry + rate limiting
│   ├── rateLimiter.ts    # Token bucket rate limiter
│   ├── ws.ts             # WebSocket client
│   ├── tui.ts            # Terminal UI (Blessed)
│   ├── opentui/
│   │   └── tui.ts        # Terminal UI (OpenTUI, experimental)
│   └── utils.ts          # Utility functions
├── docs/
│   ├── learn/            # Learning documentation (9 chapters)
│   ├── diagrams/         # Architecture diagrams (Mermaid)
│   └── plans/            # Engineering specifications
└── tests/                # Test files
```

## Documentation

Comprehensive Portuguese documentation available in `docs/learn/`:

- **[00 - Introdução](docs/learn/00-introducao.md)** - Project overview and getting started
- **[01 - Bun + TypeScript](docs/learn/01-ecossistema-bun-typescript.md)** - Development environment
- **[02 - Arquitetura](docs/learn/02-arquitetura-estrutura.md)** - Project structure
- **[03 - APIs Polymarket](docs/learn/03-apis-polymarket.md)** - API integration
- **[04 - WebSockets](docs/learn/04-websockets-tempo-real.md)** - Real-time data
- **[05 - Interface Terminal](docs/learn/05-interface-terminal.md)** - TUI implementation
- **[06 - Erros & Rate Limiting](docs/learn/06-erros-rate-limiting.md)** - Error handling
- **[07 - Testes](docs/learn/07-testes.md)** - Testing strategies
- **[08 - Exercícios](docs/learn/08-exercicios-completos.md)** - Practice exercises
- **[09 - Próximos Passos](docs/learn/09-proximos-passos.md)** - Further learning

### Additional Resources

- **[ONBOARDING.md](docs/learn/ONBOARDING.md)** - 90-day onboarding plan
- **[PROGRESSO.md](docs/learn/PROGRESSO.md)** - Progress tracking system
- **[ARQUITETURA-COMPLETA.md](docs/diagrams/ARQUITETURA-COMPLETA.md)** - Architecture diagrams

## Testing

```sh
bun test              # Run all tests
bun test --coverage   # With coverage report
bun typecheck         # Type checking
```

## API Integration

This project integrates with multiple Polymarket APIs:

| API | Purpose | Rate Limit |
|-----|---------|------------|
| **Gamma API** | Market discovery | 300 req/10s |
| **CLOB REST** | Orderbook, prices, history | 500-1500 req/10s |
| **CLOB WebSocket** | Real-time updates | N/A (push) |
| **Data API** | Holders, positions, trades | 150-200 req/10s |

## Error Handling

- **Automatic retry** on rate limits (429) and server errors (5xx)
- **Exponential backoff** with jitter (200ms → 400ms → 800ms...)
- **Graceful degradation** for missing orderbooks
- **Structured HTTP errors** with detailed context

## Tech Stack

- **Runtime**: Bun 1.3.5+
- **Language**: TypeScript 5.6.3
- **UI Framework**: Blessed (default) / OpenTUI (experimental)
- **Testing**: Bun Test (built-in)

## Notes

- Uses WebSocket market channel for real-time best bid/ask + last trade
- REST polling provides baseline orderbook, midpoint, price history, and holders
- Rate limits respected with token bucket per host/endpoint
- Markets without orderbooks are treated as a normal state (no noisy alerts)
- Midpoint falls back to best bid/ask when orderbook unavailable

## License

MIT
