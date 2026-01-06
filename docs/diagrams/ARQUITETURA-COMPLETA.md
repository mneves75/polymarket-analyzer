# 🏗️ Mapa de Arquitetura Completa - Polymarket Analyzer

> **"Um bom diagrama vale mais que mil palavras."**
> — Princípio de Documentação Visual

---

## 📊 Visão Geral da Arquitetura

Este documento contém diagramas Mermaid que mostram a arquitetura completa do Polymarket Analyzer em diferentes níveis de detalhe.

---

## 1. Arquitetura em Alto Nível

```mermaid
graph TB
    subgraph Usuario["Usuário"]
        CLI["Terminal / CLI"]
    end

    subgraph Aplicacao["Polymarket Analyzer"]
        CamadaA["Camada de Apresentação<br/>index.ts, tui.ts"]
        CamadaB["Camada de Domínio<br/>market.ts, parsers.ts, utils.ts"]
        CamadaC["Camada de Dados<br/>api.ts, ws.ts, http.ts"]
    end

    subgraph Externo["Serviços Externos"]
        Gamma["Gamma API"]
        CLOB["CLOB REST"]
        WS["CLOB WebSocket"]
        Data["Data API"]
    end

    CLI --> CamadaA
    CamadaA --> CamadaB
    CamadaB --> CamadaC
    CamadaC --> Gamma
    CamadaC --> CLOB
    CamadaC --> WS
    CamadaC --> Data

    style Usuario fill:#e1f5ff
    style Aplicacao fill:#fff4e6
    style Externo fill:#e8f5e9
```

---

## 2. Fluxo de Dados Completo

```mermaid
sequenceDiagram
    participant U as Usuário
    participant I as index.ts (CLI)
    participant M as market.ts
    participant A as api.ts
    participant W as ws.ts
    participant H as http.ts
    participant G as Gamma API
    participant C as CLOB API
    participant S as CLOB WebSocket
    participant T as tui.ts

    U->>I: bun run dev --market <id>
    I->>M: resolveMarket(opts, radar)

    alt Mercado não está no radar
        M->>A: fetchMarketByConditionId(id)
        A->>H: fetchJson(url)
        H->>C: GET /markets?condition_ids={id}
        C-->>H: 200 OK + market data
        H-->>A: parsed market
        A-->>M: normalized market
    end

    M-->>I: MarketInfo
    I->>T: runDashboard(market)

    par Fluxo REST
        T->>A: getOrderbook(tokenId)
        A->>H: fetchJson(url)
        H->>C: GET /book?token_id={id}
        C-->>H: order book
        H-->>A: parsed data
        A-->>T: normalized orderbook
    and

    par Fluxo WebSocket
        T->>W: connectMarketWs(tokenIds, handlers)
        W->>S: WebSocket connect
        S-->>W: Connected
        W->>S: Subscribe to assets
        S-->>W: Real-time updates
        W-->>T: onBook/onUpdate
    end

    T->>T: Render interface
    T-->>U: TUI Display

    loop A cada 3 segundos
        T->>A: Fetch additional data
        A-->>T: Updated data
        T->>T: Re-render
    end
```

---

## 3. Detalhamento dos Componentes

### 3.1 Camada de Dados

```mermaid
graph TB
    subgraph Data_Layer["Camada de Dados"]
        subgraph APIs["Clientes de API"]
            api["api.ts<br/>- fetchEvents<br/>- fetchMarkets<br/>- getOrderbook<br/>- getPrices<br/>- getHistory<br/>- getHolders"]
            ws["ws.ts<br/>- connectMarketWs<br/>- subscribe<br/>- unsubscribe<br/>- reconnect"]
        end

        subgraph Infra["Infraestrutura"]
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

### 3.2 Camada de Domínio

```mermaid
graph LR
    subgraph Domain["Camada de Domínio"]
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

### 3.3 Camada de Apresentação

```mermaid
graph TB
    subgraph Presentation["Camada de Apresentação"]
        index["index.ts<br/>- parseArgs<br/>- dispatch mode<br/>- entry point"]

        tui["tui.ts<br/>- createScreen<br/>- layoutComponents<br/>- render loop<br/>- key handlers"]

        components["Componentes Blessed<br/>├─ Header<br/>├─ Radar Table<br/>├─ Market Box<br/>├─ Pulse Panel<br/>├─ Orderbook Table<br/>├─ History Panel<br/>├─ Holders Table<br/>└─ Status Panel"]
    end

    index --> tui
    tui --> components

    style Presentation fill:#fff3e0
    style tui fill:#ffe0b2
    style components fill:#ffcc80
```

---

## 4. Integração com APIs Polymarket

```mermaid
graph TB
    subgraph Polymarket["Polymarket APIs"]
        GammaAPI["Gamma API<br/>gamma-api.polymarket.com<br/><br/>Endpoints:<br/>- GET /events<br/>- GET /markets<br/>- GET /markets/slug/{slug}<br/>- GET /events/slug/{slug}"]

        CLOBRest["CLOB REST API<br/>clob.polymarket.com<br/><br/>Endpoints:<br/>- GET /book<br/>- GET /price<br/>- GET /midpoint<br/>- GET /prices-history"]

        CLOBWs["CLOB WebSocket<br/>ws-subscriptions-clob.polymarket.com<br/><br/>Messages:<br/>- best_bid_ask<br/>- last_trade_price<br/>- price_change<br/>- book"]

        DataAPI["Data API<br/>data-api.polymarket.com<br/><br/>Endpoints:<br/>- GET /holders<br/>- GET /trades"]
    end

    Client["Polymarket Analyzer<br/>(Cliente)"]

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

## 5. Estrutura de Módulos TypeScript

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

## 6. Fluxo de Estados da Aplicação

```mermaid
stateDiagram-v2
    [*] --> Initializing: bun run dev

    Initializing --> Loading: parseArgs()

    Loading --> FetchingRadar: loadRadar()
    FetchingRadar --> Resolving: resolveMarket()

    Resolving --> Connecting: connectMarketWs()
    Resolving --> Error: Falha na API

    Connecting --> Connected: WebSocket open
    Connecting --> Error: Connection failed

    Connected --> Streaming: Recebendo dados

    Streaming --> Updating: Dados chegaram
    Updating --> Rendering: Atualizar UI
    Rendering --> Streaming: Loop contínua

    Streaming --> Reconnecting: WebSocket fechado
    Reconnecting --> Connecting: Tentar reconectar

    Streaming --> Stopping: Usuário saiu (q)
    Stopping --> [*]

    Error --> [*]: Fatal error
```

---

## 7. Estratégia de Rate Limiting

```mermaid
graph TB
    subgraph RateLimiting["Rate Limiting Strategy"]
        Request["Requisição HTTP"]

        subgraph Match["Match Endpoint"]
            GammaBook["/book → 1500/10s"]
            GammaPrice["/price → 1500/10s"]
            GammaDefault["Default → 300/10s"]
        end

        Bucket["Token Bucket<br/><br/>tokens: N<br/>resetAt: timestamp"]

        Decision{Tem tokens?}

        Consume["Consome 1 token"]

        Wait["Aguarda reset<br/>+ jitter 20-120ms"]

        Proceed["Requisição permitida"]
    end

    Request --> Match
    Match --> Bucket
    Bucket --> Decision
    Decision -- Sim --> Consume
    Decision -- Não --> Wait
    Consume --> Proceed
    Wait --> Bucket

    style RateLimiting fill:#fff9c4
    style Match fill:#ffecb3
    style Bucket fill:#ffe082
    style Decision fill:#ffd54f
```

---

## 8. Pipeline de Normalização de Dados

```mermaid
graph TD
    subgraph Pipeline["Pipeline de Normalização"]
        Raw["Dado Bruto da API<br/><br/>{<br/>  condition_id: 0x123,<br/>  clob_token_ids: [...],<br/>  volume_24h: 1500000<br/>}"]

        Step1["Passo 1: Extração<br/><br/>extractConditionId<br/>extractTokenIds<br/>extractOutcomes"]

        Step2["Passo 2: Conversão<br/><br/>asNumber para valores<br/>String para arrays"]

        Step3["Passo 3: Validação<br/><br/>Verifica campos obrigatórios:<br/>- conditionId ✅<br/>- clobTokenIds ✅"]

        Step4["Passo 4: Formatação<br/><br/>Formata para tipos TS:<br/>MarketInfo"]

        Normalized["Dado Normalizado<br/><br/>interface MarketInfo {<br/>  conditionId: string<br/>  clobTokenIds: string[]<br/>  volume24hr: number<br/>}"]
    end

    Raw --> Step1
    Step1 --> Step2
    Step2 --> Step3
    Step3 -->|Valid| Step4
    Step3 -->|Inválido| Null["null"]
    Step4 --> Normalized

    style Pipeline fill:#e1bee7
    style Raw fill:#f8bbd0
    style Normalized fill:#c2185b
    style Null fill:#ef5350
```

---

## 9. Layout da Interface TUI

```mermaid
graph TB
    subgraph Screen["TUI Screen Layout"]
        Header["┌─ Header ─────────────────────────────────────┐<br/>│ 12:34:56  Polymarket Analyzer  [WS: ●]      │<br/>└────────────────────────────────────────────┘"]

        Main["┌─ Main Content ─────────────────────────────┐<br/>│                                              │<br/>│  ┌── Radar ─────────┐  ┌─ Market ──────┐  │<br/>│  │ • Market 1       │  │ Question:     │  │<br/>│  │ • Market 2       │  │ Trump 2024?  │  │<br/>│  │ • Market 3       │  │               │  │<br/>│  └──────────────────┘  │ Price: 65¢    │  │<br/>│                         │ Bid: 64 Ask: 66│  │<br/>│  ┌── Order Book ────┐  └───────────────┘  │<br/>│  │ BIDS    ASKS      │                      │<br/>│  │ 65¢     67¢       │  ┌── Pulse ────┐    │<br/>│  │ 64¢     68¢       │  │ ▁▃▄▅▆▇█   │    │<br/>│  │ 63¢     69¢       │  │ Sparkline  │    │<br/>│  └───────────────────┘  └────────────┘    │<br/>│                                              │<br/>│  ┌── History ─────────┐  ┌─ Holders ────┐   │<br/>│  │ 30d chart          │  │ 1. User: 10K │   │<br/>│  │ ▁▂▃▅▆▇            │  │ 2. User: 8K  │   │<br/>│  └───────────────────┘  │ 3. User: 5K  │   │<br/>│                         └──────────────┘   │<br/>└────────────────────────────────────────────┘"]

        Footer["┌─ Footer ──────────────────────────────────────┐<br/>│ [n]ext [p]rev [o]utcome [s]napshot [q]uit │<br/>└────────────────────────────────────────────┘"]
    end

    Header --> Main
    Main --> Footer

    style Screen fill:#e0f2f1
    style Header fill:#b2dfdb
    style Main fill:#80cbc4
    style Footer fill:#4db6ac
```

---

## 10. Relacionamentos Entre Arquivos

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

## 📚 Como Usar Este Documento

1. **Para entender arquitetura geral:** Veja o diagrama 1
2. **Para entender fluxo de dados:** Veja o diagrama 2
3. **Para entender componentes:** Veja o diagrama 3
4. **Para entender integração:** Veja o diagrama 4
5. **Para entender código:** Veja o diagrama 5
6. **Para entender estados:** Veja o diagrama 6
7. **Para entender rate limiting:** Veja o diagrama 7
8. **Para entender normalização:** Veja o diagrama 8
9. **Para entender interface:** Veja o diagrama 9
10. **Para entender dependências:** Veja o diagrama 10

---

**Última Atualização:** Janeiro 2026
**Versão:** 1.0
