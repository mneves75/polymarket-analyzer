# Complete Architecture Map - Polymarket Analyzer

> **"A good diagram is worth more than a thousand words."**
> -- Visual Documentation Principle

---

## Architecture Overview

This document contains Mermaid diagrams showing the complete architecture of Polymarket Analyzer at different levels of detail.

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph User["User"]
        CLI["Terminal / CLI"]
    end

    subgraph Application["Polymarket Analyzer"]
        LayerA["Presentation Layer<br/>index.ts, tui.ts"]
        LayerB["Domain Layer<br/>market.ts, parsers.ts, utils.ts"]
        LayerC["Data Layer<br/>api.ts, ws.ts, http.ts"]
    end

    subgraph External["External Services"]
        Gamma["Gamma API"]
        CLOB["CLOB REST"]
        WS["CLOB WebSocket"]
        Data["Data API"]
    end

    CLI --> LayerA
    LayerA --> LayerB
    LayerB --> LayerC
    LayerC --> Gamma
    LayerC --> CLOB
    LayerC --> WS
    LayerC --> Data

    style User fill:#e1f5ff
    style Application fill:#fff4e6
    style External fill:#e8f5e9
```

---

## 2. Complete Data Flow

```mermaid
sequenceDiagram
    participant U as User
    participant I as index.ts (CLI)
    participant M as market.ts
    participant A as api.ts
    participant W as ws.ts
    participant H as http.ts
    participant G as Gamma API
    participant C as CLOB API
    participant S as CLOB WebSocket
    participant T as tui.ts

    U->>I: bun --bun run dev --market <id>
    I->>M: resolveMarket(opts, radar)

    alt Market not in radar
        M->>A: fetchMarketByConditionId(id)
        A->>H: fetchJson(url)
        H->>C: GET /markets?condition_ids={id}
        C-->>H: 200 OK + market data
        H-->>A: parsed market
        A-->>M: normalized market
    end

    M-->>I: MarketInfo
    I->>T: runDashboard(market)

    par REST Flow
        T->>A: getOrderbook(tokenId)
        A->>H: fetchJson(url)
        H->>C: GET /book?token_id={id}
        C-->>H: order book
        H-->>A: parsed data
        A-->>T: normalized orderbook
    and

    par WebSocket Flow
        T->>W: connectMarketWs(tokenIds, handlers)
        W->>S: WebSocket connect
        S-->>W: Connected
        W->>S: Subscribe to assets
        S-->>W: Real-time updates
        W-->>T: onBook/onUpdate
    end

    T->>T: Render interface
    T-->>U: TUI Display

    loop Every 3 seconds
        T->>A: Fetch additional data
        A-->>T: Updated data
        T->>T: Re-render
    end
```

---

## 3. Component Details

### 3.1 Data Layer

```mermaid
graph TB
    subgraph Data_Layer["Data Layer"]
        subgraph APIs["API Clients"]
            api["api.ts<br/>- fetchEvents<br/>- fetchMarkets<br/>- getOrderbook<br/>- getPrices<br/>- getHistory<br/>- getHolders"]
            ws["ws.ts<br/>- connectMarketWs<br/>- subscribe<br/>- unsubscribe<br/>- reconnect"]
        end

        subgraph Infra["Infrastructure"]
            http["http.ts<br/>- fetchJson<br/>- rate limiting<br/>- retry logic<br/>- timeout"]
            rate["rateLimiter.ts<br/>- Token Bucket<br/>- Jitter<br/>- Per-endpoint limits"]
        end
    end

    api --> http
    ws --> http
    http --> rate

    style Data_Layer fill:#e3f2fd
    style APIs fill:#bbdefb
    style Infra fill:#90caf9
```

### 3.2 Domain Layer

```mermaid
graph LR
    subgraph Domain["Domain Layer"]
        market["market.ts<br/>- resolveMarket<br/>- loadRadar<br/>- firstMarketFromEvent"]

        parsers["parsers.ts<br/>- normalizeMarket<br/>- normalizeOrderbook<br/>- extractHistory<br/>- normalizeHolders"]

        utils["utils.ts<br/>- sparkline<br/>- formatPrice<br/>- formatVolume<br/>- formatPercent"]
    end

    market --> parsers
    parsers --> utils

    style Domain fill:#f3e5f5
    style market fill:#e1bee7
    style parsers fill:#ce93d8
    style utils fill:#ba68c8
```

### 3.3 Presentation Layer

```mermaid
graph TB
    subgraph Presentation["Presentation Layer"]
        index["index.ts<br/>- parseArgs<br/>- dispatch mode<br/>- entry point"]

        tui["tui.ts<br/>- createScreen<br/>- layoutComponents<br/>- render loop<br/>- key handlers"]

        components["Blessed Components<br/>|-- Header<br/>|-- Radar Table<br/>|-- Market Box<br/>|-- Pulse Panel<br/>|-- Orderbook Table<br/>|-- History Panel<br/>|-- Holders Table<br/>+-- Status Panel"]
    end

    index --> tui
    tui --> components

    style Presentation fill:#fff3e0
    style tui fill:#ffe0b2
    style components fill:#ffcc80
```

---

## 4. Polymarket API Integration

```mermaid
graph TB
    subgraph Polymarket["Polymarket APIs"]
        GammaAPI["Gamma API<br/>gamma-api.polymarket.com<br/><br/>Endpoints:<br/>- GET /events<br/>- GET /markets<br/>- GET /markets/slug/{slug}<br/>- GET /events/slug/{slug}"]

        CLOBRest["CLOB REST API<br/>clob.polymarket.com<br/><br/>Endpoints:<br/>- GET /book<br/>- GET /price<br/>- GET /midpoint<br/>- GET /prices-history"]

        CLOBWs["CLOB WebSocket<br/>ws-subscriptions-clob.polymarket.com<br/><br/>Messages:<br/>- best_bid_ask<br/>- last_trade_price<br/>- price_change<br/>- book"]

        DataAPI["Data API<br/>data-api.polymarket.com<br/><br/>Endpoints:<br/>- GET /holders<br/>- GET /trades"]
    end

    Client["Polymarket Analyzer<br/>(Client)"]

    Client -->|"Discover<br/>Markets"| GammaAPI
    Client -->|"Order Book<br/>History"| CLOBRest
    Client -->|"Real-time<br/>Updates"| CLOBWs
    Client -->|"Holder<br/>Data"| DataAPI

    style Polymarket fill:#e8f5e9
    style GammaAPI fill:#c8e6c9
    style CLOBRest fill:#a5d6a7
    style CLOBWs fill:#81c784
    style DataAPI fill:#66bb6a
```

---

## 5. TypeScript Module Structure

```mermaid
classDiagram
    class HttpClient {
        +fetchJson(url, options)
        -matchRateLimit(url)
        -shouldRetry(status)
        -backoff(attempt)
    }

    class RateLimiter {
        +take(rule)
        -getTokenBucket(key)
        -waitForReset()
    }

    class APIClient {
        +fetchEvents(limit, offset)
        +fetchMarkets(limit, offset)
        +getOrderbook(tokenId)
        +getPrices(tokenId)
        +getPriceHistory(tokenId)
        +getHolders(conditionId)
    }

    class WebSocketClient {
        +connectMarketWs(assetIds, handlers)
        +subscribe(ids)
        +unsubscribe(ids)
        +close()
        -scheduleReconnect()
        -startHeartbeat()
    }

    class MarketResolver {
        +resolveMarket(opts, radar)
        -resolveBySlug(slug)
        -resolveById(id)
        -fallbackToRadar(radar)
    }

    class DataParser {
        +normalizeMarket(market, event)
        +normalizeOrderbook(response)
        +extractHistory(response)
        +normalizeHolders(response)
    }

    class TUIRenderer {
        +createScreen()
        +renderDashboard()
        +updateMarket(data)
        +renderOrderbook(book)
        +renderHistory(prices)
        +handleKey(key)
    }

    HttpClient --> RateLimiter
    APIClient --> HttpClient
    WebSocketClient --> HttpClient
    MarketResolver --> APIClient
    MarketResolver --> DataParser
    TUIRenderer --> APIClient
    TUIRenderer --> WebSocketClient
```

---

## 6. Application State Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: bun --bun run dev

    Initializing --> Loading: parseArgs()

    Loading --> FetchingRadar: loadRadar()
    FetchingRadar --> Resolving: resolveMarket()

    Resolving --> Connecting: connectMarketWs()
    Resolving --> Error: API Failure

    Connecting --> Connected: WebSocket open
    Connecting --> Error: Connection failed

    Connected --> Streaming: Receiving data

    Streaming --> Updating: Data arrived
    Updating --> Rendering: Update UI
    Rendering --> Streaming: Continuous loop

    Streaming --> Reconnecting: WebSocket closed
    Reconnecting --> Connecting: Retry connection

    Streaming --> Stopping: User exited (q)
    Stopping --> [*]

    Error --> [*]: Fatal error
```

---

## 7. Rate Limiting Strategy

```mermaid
graph TB
    subgraph RateLimiting["Rate Limiting Strategy"]
        Request["HTTP Request"]

        subgraph Match["Match Endpoint"]
            GammaBook["/book -> 1500/10s"]
            GammaPrice["/price -> 1500/10s"]
            GammaDefault["Default -> 300/10s"]
        end

        Bucket["Token Bucket<br/><br/>tokens: N<br/>resetAt: timestamp"]

        Decision{Has tokens?}

        Consume["Consume 1 token"]

        Wait["Wait for reset<br/>+ jitter 20-120ms"]

        Proceed["Request allowed"]
    end

    Request --> Match
    Match --> Bucket
    Bucket --> Decision
    Decision -- Yes --> Consume
    Decision -- No --> Wait
    Consume --> Proceed
    Wait --> Bucket

    style RateLimiting fill:#fff9c4
    style Match fill:#ffecb3
    style Bucket fill:#ffe082
    style Decision fill:#ffd54f
```

---

## 8. Data Normalization Pipeline

```mermaid
graph TD
    subgraph Pipeline["Normalization Pipeline"]
        Raw["Raw API Data<br/><br/>{<br/>  condition_id: 0x123,<br/>  clob_token_ids: [...],<br/>  volume_24h: 1500000<br/>}"]

        Step1["Step 1: Extraction<br/><br/>extractConditionId<br/>extractTokenIds<br/>extractOutcomes"]

        Step2["Step 2: Conversion<br/><br/>asNumber for values<br/>String for arrays"]

        Step3["Step 3: Validation<br/><br/>Check required fields:<br/>- conditionId<br/>- clobTokenIds"]

        Step4["Step 4: Formatting<br/><br/>Format to TS types:<br/>MarketInfo"]

        Normalized["Normalized Data<br/><br/>interface MarketInfo {<br/>  conditionId: string<br/>  clobTokenIds: string[]<br/>  volume24hr: number<br/>}"]
    end

    Raw --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 -->|Valid| Step4
    Step3 -->|Invalid| Null["null"]
    Step4 --> Normalized

    style Pipeline fill:#e1bee7
    style Raw fill:#f8bbd0
    style Normalized fill:#c2185b
    style Null fill:#ef5350
```

---

## 9. TUI Interface Layout

```mermaid
graph TB
    subgraph Screen["TUI Screen Layout"]
        Header["+-- Header ------------------------------------------+<br/>| 12:34:56  Polymarket Analyzer  [WS: *]            |<br/>+---------------------------------------------------+"]

        Main["+-- Main Content ------------------------------------+<br/>|                                                    |<br/>|  +-- Radar --------+  +-- Market --------+        |<br/>|  | * Market 1      |  | Question:        |        |<br/>|  | * Market 2      |  | Trump 2024?      |        |<br/>|  | * Market 3      |  |                  |        |<br/>|  +-----------------+  | Price: 65c       |        |<br/>|                       | Bid: 64 Ask: 66  |        |<br/>|  +-- Order Book ---+  +------------------+        |<br/>|  | BIDS    ASKS    |                             |<br/>|  | 65c     67c     |  +-- Pulse ------+          |<br/>|  | 64c     68c     |  | Sparkline     |          |<br/>|  | 63c     69c     |  +---------------+          |<br/>|  +-----------------+                             |<br/>|                                                    |<br/>|  +-- History ------+  +-- Holders ----+           |<br/>|  | 30d chart       |  | 1. User: 10K  |           |<br/>|  |                 |  | 2. User: 8K   |           |<br/>|  +-----------------+  | 3. User: 5K   |           |<br/>|                       +---------------+           |<br/>+---------------------------------------------------+"]

        Footer["+-- Footer ------------------------------------------+<br/>| [n]ext [p]rev [o]utcome [s]napshot [q]uit         |<br/>+---------------------------------------------------+"]
    end

    Header --> Main
    Main --> Footer

    style Screen fill:#e0f2f1
    style Header fill:#b2dfdb
    style Main fill:#80cbc4
    style Footer fill:#4db6ac
```

---

## 10. File Relationships

```mermaid
graph LR
    index["index.ts"] --> tui["tui.ts"]
    index --> demo["demo.ts"]

    tui --> market["market.ts"]
    tui --> api["api.ts"]
    tui --> ws["ws.ts"]
    tui --> utils["utils.ts"]

    market --> api
    market --> parsers["parsers.ts"]

    api --> http["http.ts"]
    ws --> http

    http --> rate["rateLimiter.ts"]

    parsers --> utils

    api --> config["config.ts"]
    ws --> config
    http --> config

    style index fill:#ffcdd2
    style tui fill:#f8bbd0
    style api fill:#f48fb1
    style ws fill:#f06292
    style http fill:#e91e63
```

---

## How to Use This Document

1. **To understand overall architecture:** See diagram 1
2. **To understand data flow:** See diagram 2
3. **To understand components:** See diagram 3
4. **To understand integration:** See diagram 4
5. **To understand code:** See diagram 5
6. **To understand states:** See diagram 6
7. **To understand rate limiting:** See diagram 7
8. **To understand normalization:** See diagram 8
9. **To understand interface:** See diagram 9
10. **To understand dependencies:** See diagram 10

---

**Version:** 1.0.0
**Last Updated:** January 2026
