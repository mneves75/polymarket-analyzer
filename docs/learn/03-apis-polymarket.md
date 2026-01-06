# Capítulo 03: Integração com APIs Polymarket

> **"APIs são como LEGO: você pega peças de diferentes serviços e constrói algo novo."**
> — Anônimo

---

## 1. Introdução às APIs Polymarket

### 1.1 O Que é a Polymarket?

A **Polymarket** é uma plataforma descentralizada de mercados de previsão baseada em blockchain. Ela permite que as pessoas apostem em eventos do mundo real, desde eleições até resultados esportivos.

**APIs da Polymarket:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLYMARKET API ECOSYSTEM                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Gamma API    │  │ CLOB API     │  │ Data API             │  │
│  │              │  │              │  │                      │  │
│  │ - Descoberta │  │ - Preços     │  │ - Detentores         │  │
│  │ - Eventos    │  │ - Order book │  │ - Trades             │  │
│  │ - Mercados   │  │ - Histórico  │  │ - Posições            │  │
│  │              │  │ - WebSocket  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  https://gamma-api.polymarket.com                               │
│  https://clob.polymarket.com                                    │
│  https://data-api.polymarket.com                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Visão Geral das APIs

| API | Propósito | Uso Principal | Rate Limit |
|-----|-----------|---------------|------------|
| **Gamma API** | Descoberta de mercados e eventos | Listar mercados, buscar por slug | 300-500 req/10s |
| **CLOB REST** | Dados de mercado (preços, order book) | Livro de ofertas, histórico | 500-1500 req/10s |
| **CLOB WebSocket** | Dados em tempo real | Atualizações de preços live | N/A (stream) |
| **Data API** | Dados agregados de usuários | Top detentores, trades | 150-200 req/10s |

---

## 2. Gamma API - Descoberta de Mercados

### 2.1 O Que é a Gamma API?

A **Gamma API** é a API de **descoberta** da Polymarket. Ela serve como um "catálogo" de todos os mercados e eventos disponíveis.

**Analogia:**

Imagine a Polymarket como um shopping gigante:

```
GAMMA API = Catálogo do Shopping
├─ Piso 1: Loja de Eleições
│  ├─ Eleições EUA 2024
│  ├─ Eleições Brasil 2026
│  └─ Eleições França 2027
├─ Piso 2: Loja de Cripto
│  ├─ Bitcoin > $100k?
│  └─ Ethereum > $5k?
└─ Piso 3: Loja de Esportes
   ├─ Brasil Copa do Mundo?
   └─ Messi vai jogar?
```

### 2.2 Estrutura de Dados Gamma

```typescript
// Event (Ex: "Eleições EUA 2024")
type GammaEvent = {
  id: string;              // "12345"
  slug: string;            // "eleicoes-eua-2024"
  title: string;           // "US Election 2024"
  description?: string;
  markets: GammaMarket[];  // Mercados dentro do evento
};

// Market (Ex: "Trump vence?")
type GammaMarket = {
  id: string;                      // "67890"
  conditionId: string;             // "0xabc123..."
  question: string;                // "Will Trump win?"
  outcomes: string[];              // ["Yes", "No"]
  clobTokenIds: string[];          // ["0x123...", "0x456..."]
  slug?: string;                   // "trump-wins-2024"
  volume24hr?: number;             // 1_500_000 (em cents)
  priceChange24hr?: number;        // 0.05 (5%)
  bestBid?: number;                // 0.65 (65¢)
  bestAsk?: number;                // 0.67 (67¢)
};
```

### 2.3 Endpoints Gamma

#### GET /events

Lista eventos ativos.

```typescript
// src/api.ts:22-36
export async function fetchEvents(limit = 10, offset = 0) {
  const url = withQuery(`${CONFIG.gammaBase}/events`, {
    limit,
    offset,
    closed: false,    // ← Apenas eventos abertos
    active: true,     // ← Apenas eventos ativos
    order: "id",
    ascending: false  // ← Mais recentes primeiro
  });
  const res = await fetchJson<unknown>(url);
  // ...
}
```

**Request:**
```http
GET https://gamma-api.polymarket.com/events?limit=10&offset=0&closed=false&active=true
```

**Response:**
```json
[
  {
    "id": "12345",
    "slug": "eleicoes-eua-2024",
    "title": "US Election 2024",
    "markets": [
      {
        "id": "67890",
        "condition_id": "0xabc123...",
        "question": "Will Trump win?",
        "outcomes": ["Yes", "No"],
        "clob_token_ids": ["0x123...", "0x456..."],
        "volume_24hr": 1500000,
        "price_change_24hr": 0.05,
        "best_bid": 0.65,
        "best_ask": 0.67
      }
    ]
  }
]
```

#### GET /markets

Lista mercados ativos.

```typescript
// src/api.ts:38-52
export async function fetchMarkets(limit = 10, offset = 0) {
  const url = withQuery(`${CONFIG.gammaBase}/markets`, {
    limit,
    offset,
    closed: false,
    active: true,
    order: "id",
    ascending: false
  });
  const res = await fetchJson<unknown>(url);
  // ...
}
```

#### GET /markets/slug/{slug}

Busca um mercado específico por slug.

```typescript
// src/api.ts:54-60
export async function fetchMarketBySlug(slug: string) {
  const res = await fetchJson<unknown>(
    `${CONFIG.gammaBase}/markets/slug/${slug}`
  );
  // A API pode retornar { market: {...} } ou direto o objeto
  if (res && typeof res === "object" && "market" in res) {
    return (res as { market: GammaMarket }).market;
  }
  return res as GammaMarket;
}
```

**Exemplo de uso:**
```typescript
const mercado = await fetchMarketBySlug("trump-wins-2024");
// → { id: "67890", question: "Will Trump win?", ... }
```

#### GET /events/slug/{slug}

Busca um evento por slug.

```typescript
// src/api.ts:62-68
export async function fetchEventBySlug(slug: string) {
  const res = await fetchJson<unknown>(
    `${CONFIG.gammaBase}/events/slug/${slug}`
  );
  if (res && typeof res === "object" && "event" in res) {
    return (res as { event: GammaEvent }).event;
  }
  return res as GammaEvent;
}
```

#### GET /markets?condition_ids={id}

Busca mercado por condition ID.

```typescript
// src/api.ts:70-80
export async function fetchMarketByConditionId(conditionId: string) {
  const url = withQuery(`${CONFIG.gammaBase}/markets`, {
    condition_ids: conditionId,
    limit: 1
  });
  const res = await fetchJson<unknown>(url);
  // A API pode retornar array ou objeto com propriedades diferentes
  if (Array.isArray(res)) return res[0] as GammaMarket | undefined;
  const record = res as Record<string, unknown>;
  const list = (record.markets as GammaMarket[] | undefined)
    || (record.data as GammaMarket[] | undefined)
    || [];
  return list[0];
}
```

### 2.4 Normalização de Dados Gamma

A API Gamma retorna dados em **formatos inconsistentes**. Precisamos normalizar:

```typescript
// src/api.ts:82-124
export function normalizeMarket(
  market: GammaMarket,
  event?: GammaEvent
): MarketInfo | null {
  // ─── 1. Extrair condition ID (nomes variados) ───
  const conditionId =
    market.conditionId          // camelCase
    || market.condition_id      // snake_case
    || market.conditionID;      // PascalCase

  // ─── 2. Extrair market ID ───
  const marketId =
    market.id
    || market.marketId
    || market.market_id;

  // ─── 3. Extrair pergunta (tenta múltiplos campos) ───
  const question =
    market.question
    || market.title
    || event?.title;

  // ─── 4. Extrair outcomes (pode ser array ou string JSON) ───
  const outcomes = extractOutcomes(market);

  // ─── 5. Extrair token IDs (múltiplos formatos) ───
  const clobTokenIds = extractTokenIds(market);

  // ─── 6. Extrair volume (nomes variados) ───
  const volume24hr = asNumber(
    market.volume24hr      // camelCase
    || market.volume24h    // sem "r"
    || market.volume24hrUsd
    || market.volumeUSD
  );

  // ─── 7. Validar dados obrigatórios ───
  if (!conditionId || clobTokenIds.length === 0) return null;

  // ─── 8. Retornar formato normalizado ───
  return {
    eventId: event?.id as string | undefined,
    eventTitle: event?.title as string | undefined,
    marketId,
    question,
    conditionId,
    slug: market.slug as string | undefined,
    outcomes,
    clobTokenIds,
    volume24hr: volume24hr ?? undefined,
    priceChange24hr: priceChange24hr ?? undefined,
    bestBid: bestBid ?? undefined,
    bestAsk: bestAsk ?? undefined
  };
}
```

**Por que tantos fallbacks?**

```
API inconsistente ao longo do tempo:
─────────────────────────────────────────────────────
Versão 2023: { condition_id: "0x123" }
Versão 2024: { conditionId: "0x123" }
Versão 2025: { conditionID: "0x123" }

Nossa normalização lida com TODOS os formatos!
```

### 2.5 Funções Auxiliares de Extração

#### extractOutcomes

```typescript
// src/api.ts:126-142
function extractOutcomes(market: GammaMarket): string[] {
  // 1. Tenta campo "outcomes" ou "outcome"
  const raw = market.outcomes || market.outcome;

  // 2. Pode ser array ou string JSON
  const parsed = parseMaybeJsonArray(raw);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map(String);
  }

  // 3. Pode estar aninhado em "tokens"
  const nested = market.tokens;
  if (Array.isArray(nested)) {
    const names = nested
      .map((token) => token.outcome)
      .filter(Boolean);
    if (names.length > 0) return names as string[];
  }

  return [];
}
```

**Exemplos de formatos:**
```json
// Formato 1: Array direto
{ "outcomes": ["Yes", "No"] }

// Formato 2: String JSON
{ "outcomes": "[\"Yes\", \"No\"]" }

// Formato 3: Aninhado
{
  "tokens": [
    { "outcome": "Yes" },
    { "outcome": "No" }
  ]
}
```

#### extractTokenIds

```typescript
// src/api.ts:155-172
function extractTokenIds(market: GammaMarket): string[] {
  // 1. Tenta campo direto (nomes variados)
  const direct =
    market.clobTokenIds          // camelCase
    || market.clob_token_ids     // snake_case
    || market.clob_token_ids;    // snake_case alternativo

  const parsed = parseMaybeJsonArray(direct);
  if (Array.isArray(parsed) && parsed.length > 0) {
    return parsed.map(String);
  }

  // 2. Tenta aninhado em "tokens"
  const nested = market.tokens;
  if (Array.isArray(nested)) {
    const ids = nested
      .map((token) => token.token_id || token.id)
      .filter(Boolean);
    if (ids.length > 0) return ids as string[];
  }

  return [];
}
```

#### parseMaybeJsonArray

```typescript
// src/api.ts:174-188
function parseMaybeJsonArray(
  value: string[] | string | undefined
): string[] | undefined {
  if (!value) return undefined;

  // Já é array
  if (Array.isArray(value)) return value;

  // É string - tenta fazer parse
  if (typeof value === "string") {
    const trimmed = value.trim();

    // Não parece JSON
    if (!trimmed.startsWith("[")) return undefined;

    // Tenta fazer parse
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;  // JSON inválido
    }
  }

  return undefined;
}
```

---

## 3. CLOB REST API - Dados de Mercado

### 3.1 O Que é CLOB?

**CLOB** significa **Central Limit Order Book** (Livro de Ofertas Centralizado).

É onde os **pedidos de compra e venda** são registrados.

```
CLOB ORDER BOOK (Exemplo)
────────────────────────────────────────────────────
BIDS (Compras)              ASKS (Vendas)
────────────────────────────────────────────────────
0.65¢ × 1000 tokens    0.67¢ × 500 tokens
0.64¢ × 2000 tokens    0.68¢ × 750 tokens
0.63¢ × 1500 tokens    0.69¢ × 1000 tokens
0.62¢ × 3000 tokens    0.70¢ × 2000 tokens
0.61¢ × 500 tokens     0.71¢ × 1500 tokens
```

### 3.2 Endpoints CLOB REST

#### GET /book

Retorna o livro de ofertas completo para um token.

```typescript
// src/api.ts:190-193
export async function getOrderbook(tokenId: string) {
  const url = withQuery(`${CONFIG.clobRestBase}/book`, {
    token_id: tokenId
  });
  return fetchJson<Record<string, unknown>>(url, {
    timeoutMs: CONFIG.restTimeoutMs
  });
}
```

**Request:**
```http
GET https://clob.polymarket.com/book?token_id=0x123...
```

**Response:**
```json
{
  "bids": [[0.65, 1000], [0.64, 2000], [0.63, 1500]],
  "asks": [[0.67, 500], [0.68, 750], [0.69, 1000]],
  "min_order_size": 1,
  "tick_size": 0.01,
  "neg_risk": false
}
```

**Normalização:**
```typescript
// src/parsers.ts:34-45
export function normalizeOrderbook(
  response: Record<string, unknown>
): OrderbookState {
  const bids = normalizeLevels(
    response.bids      // ← Pode ser array ou objeto
    || response.buys   // ← Nome alternativo
    || []
  );
  const asks = normalizeLevels(
    response.asks
    || response.sells
    || []
  );

  return {
    bids,
    asks,
    minOrderSize: asNumber(response.min_order_size),
    tickSize: asNumber(response.tick_size),
    negRisk: Boolean(response.neg_risk)
  };
}
```

#### GET /price

Retorna o melhor preço de compra ou venda.

```typescript
// src/api.ts:195-203
export async function getPrices(tokenId: string) {
  // Faz DUAS requisições em paralelo
  const buy = withQuery(`${CONFIG.clobRestBase}/price`, {
    token_id: tokenId,
    side: "BUY"
  });
  const sell = withQuery(`${CONFIG.clobRestBase}/price`, {
    token_id: tokenId,
    side: "SELL"
  });

  const [buyRes, sellRes] = await Promise.all([
    fetchJson<Record<string, unknown>>(buy),
    fetchJson<Record<string, unknown>>(sell)
  ]);

  return { buy: buyRes, sell: sellRes };
}
```

**Por que Promise.all?**

```
SEM PARALELISMO:
────────────────────────────────────────────────────
buy = await fetch(...)  // 100ms
sell = await fetch(...) // 100ms
Total: 200ms

COM PARALELISMO (Promise.all):
────────────────────────────────────────────────────
[buy, sell] = await Promise.all([
  fetch(...),  // 100ms (executam em paralelo)
  fetch(...)   // 100ms
])
Total: 100ms (50% mais rápido!)
```

#### GET /midpoint

Retorna o preço médio entre melhor bid e melhor ask.

```typescript
// src/api.ts:205-208
export async function getMidpoint(tokenId: string) {
  const url = withQuery(`${CONFIG.clobRestBase}/midpoint`, {
    token_id: tokenId
  });
  return fetchJson<Record<string, unknown>>(url);
}
```

**Response:**
```json
{
  "midpoint": 0.66
}
```

#### GET /prices-history

Retorna histórico de preços.

```typescript
// src/api.ts:210-224
export async function getPriceHistory(tokenId: string) {
  const baseParams = {
    market: tokenId,
    interval: CONFIG.historyInterval,   // "1d" (diário)
    fidelity: CONFIG.historyFidelity    // 30 pontos
  };

  const url = withQuery(
    `${CONFIG.clobRestBase}/prices-history`,
    baseParams
  );

  try {
    return await fetchJson<Record<string, unknown>>(url);
  } catch (err) {
    // Fallback para endpoint alternativo
    const fallback = withQuery(
      `${CONFIG.clobRestBase}/price_history`,
      baseParams
    );
    return fetchJson<Record<string, unknown>>(fallback);
  }
}
```

**Por que fallback?**

```
APIs mudam endpoints:
────────────────────────────────────────────────────
2023: /prices-history (novo)
2022: /price_history (antigo, mas ainda funciona)

Se um falhar, tentamos o outro!
```

**Extrair histórico:**
```typescript
// src/parsers.ts:22-32
export function extractHistory(
  response: Record<string, unknown>
): number[] {
  const raw =
    response.history        // Nome comum
    || response.prices      // Nome alternativo
    || response.data        // Nome genérico
    || [];

  return raw
    .map((point) =>
      asNumber(
        point.p          // "p" de "price"
        || point.price
        || point.value
        || point.close   // Candle close
      )
    )
    .filter((value): value is number => value !== undefined);
}
```

---

## 4. Data API - Dados de Usuários

### 4.1 GET /holders

Retorna os maiores detentores de tokens de um mercado.

```typescript
// src/api.ts:226-232
export async function getHolders(
  conditionId: string,
  limit = 10
) {
  const url = withQuery(`${CONFIG.dataApiBase}/holders`, {
    market: conditionId,
    limit
  });
  return fetchJson<Array<Record<string, unknown>>>(url);
}
```

**Response:**
```json
{
  "holders": [
    {
      "address": "0xabc...",
      "quantity": 10000,
      "percentage": 15.5
    },
    {
      "address": "0xdef...",
      "quantity": 8000,
      "percentage": 12.3
    }
  ]
}
```

### 4.2 GET /trades

Retorna as negociações mais recentes.

```typescript
// src/api.ts:234-240
export async function getTrades(
  conditionId: string,
  limit = 10
) {
  const url = withQuery(`${CONFIG.dataApiBase}/trades`, {
    market: conditionId,
    limit
  });
  return fetchJson<Record<string, unknown>>(url);
}
```

---

## 5. Compondo Dados de Múltiplas APIs

### 5.1 Fluxo Completo de Coleta de Dados

```typescript
// Exemplo simplificado do fluxo em tui.ts

async function carregarDadosCompletos(market: MarketInfo) {
  // 1. Buscar order book
  const orderbookRaw = await getOrderbook(market.clobTokenIds[0]);
  const orderbook = normalizeOrderbook(orderbookRaw);

  // 2. Buscar preços (bid/ask em paralelo)
  const prices = await getPrices(market.clobTokenIds[0]);

  // 3. Buscar midpoint
  const midpointRaw = await getMidpoint(market.clobTokenIds[0]);
  const midpoint = extractMidpoint(midpointRaw);

  // 4. Buscar histórico
  const historyRaw = await getPriceHistory(market.clobTokenIds[0]);
  const history = extractHistory(historyRaw);

  // 5. Buscar holders
  const holdersRaw = await getHolders(market.conditionId!);
  const holders = normalizeHolders(holdersRaw);

  // 6. Compor tudo
  return {
    orderbook,
    prices: {
      bestBid: extractPrice(prices.buy),
      bestAsk: extractPrice(prices.sell),
      midpoint
    },
    priceHistory: history,
    holders
  };
}
```

### 5.2 Otimizando com Paralelismo

```typescript
// ❌ RUIM - Sequencial (lento)
async function carregarDadosSequencial(tokenId: string) {
  const a = await getOrderbook(tokenId);    // 100ms
  const b = await getPrices(tokenId);       // 100ms
  const c = await getMidpoint(tokenId);     // 100ms
  const d = await getPriceHistory(tokenId); // 100ms
  const e = await getHolders(conditionId);  // 100ms
  // Total: 500ms
}

// ✅ BOM - Paralelo (rápido)
async function carregarDadosParalelo(
  tokenId: string,
  conditionId: string
) {
  const [
    orderbook,
    prices,
    midpoint,
    history,
    holders
  ] = await Promise.all([
    getOrderbook(tokenId),       // 100ms
    getPrices(tokenId),          // 100ms
    getMidpoint(tokenId),        // 100ms
    getPriceHistory(tokenId),    // 100ms
    getHolders(conditionId)      // 100ms
  ]);
  // Total: 100ms (5x mais rápido!)
}
```

---

## 6. Boas Práticas de Integração de API

### 6.1 Sempre Respeite Rate Limits

```typescript
// http.ts - Rate limiting automático
const RATE_LIMITS = [
  { host: "clob.polymarket.com", path: "/book", limit: 1500 },
  { host: "clob.polymarket.com", path: "/price", limit: 1500 },
  // ...
];

export async function fetchJson<T>(url: string, options = {}) {
  const limitRule = matchRateLimit(url);
  if (limitRule) {
    await limiter.take(limitRule);  // ← Aguarda se necessário
  }
  // ...
}
```

### 6.2 Sempre Use Timeout

```typescript
// ❌ RUIM - Pode travar para sempre
const res = await fetch(url);

// ✅ BOM - Timeout protege contra travamentos
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const res = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

### 6.3 Sempre Trate Erros

```typescript
// ❌ RUIM - Erros não tratados
const data = await fetchJson(url);
process(data);

// ✅ BOM - Tratamento de erros
try {
  const data = await fetchJson(url);
  process(data);
} catch (err) {
  if (err instanceof Error) {
    console.error(`Failed to fetch ${url}:`, err.message);
    // Implementar fallback ou retry
  }
}
```

### 6.4 Use Fallbacks para Endpoints Instáveis

```typescript
// Exemplo: getPriceHistory com fallback
export async function getPriceHistory(tokenId: string) {
  const url = withQuery(
    `${CONFIG.clobRestBase}/prices-history`,
    { market: tokenId, interval: "1d", fidelity: 30 }
  );

  try {
    return await fetchJson(url);
  } catch (err) {
    // Endpoint principal falhou, tenta fallback
    const fallback = withQuery(
      `${CONFIG.clobRestBase}/price_history`,
      { market: tokenId, interval: "1d", fidelity: 30 }
    );
    return fetchJson(fallback);
  }
}
```

### 6.5 Cache Quando Possível

```typescript
// Cache simples em memória
const cache = new Map<string, { data: unknown; expiresAt: number }>();

export async function fetchWithCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data as T;
  }

  const data = await fn();
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  return data;
}

// Uso
const markets = await fetchWithCache(
  "markets:latest",
  () => fetchMarkets(10),
  60_000  // Cache por 1 minuto
);
```

---

## 7. Testando APIs Manualmente

### 7.1 Usando curl

```bash
# Listar eventos
curl "https://gamma-api.polymarket.com/events?limit=5&closed=false&active=true"

# Buscar mercado por slug
curl "https://gamma-api.polymarket.com/markets/slug/trump-wins-2024"

# Order book
curl "https://clob.polymarket.com/book?token_id=0x123..."

# Preços
curl "https://clob.polymarket.com/price?token_id=0x123...&side=BUY"
```

### 7.2 Usando Bun

```typescript
// test-api.ts
import { fetchEvents } from "./src/api";

const events = await fetchEvents(5);
console.log(JSON.stringify(events, null, 2));
```

```bash
bun run test-api.ts
```

---

## 8. Exercícios Práticos

### Exercício 1: Buscar Mercado

Implemente uma função que busca um mercado por slug e retorna os dados normalizados:

```typescript
async function buscarMercado(slug: string): Promise<MarketInfo | null> {
  // 1. Tenta fetchMarketBySlug
  // 2. Se falhar, tenta fetchEventBySlug + primeiro mercado
  // 3. Retorna normalizeMarket()
}
```

### Exercício 2: Calcular Spread

Implemente uma função que calcula o spread percentual:

```typescript
function calcularSpread(bestBid: number, bestAsk: number): number {
  // Spread = ((ask - bid) / ask) * 100
  // Retorna em porcentagem
}

// Exemplo:
// bestBid = 0.64, bestAsk = 0.66
// spread = ((0.66 - 0.64) / 0.66) * 100 = 3.03%
```

### Exercício 3: Detectar Arbitragem

Implemente uma função que detecta oportunidade de arbitragem:

```typescript
function detectarArbitragem(bidA: number, askA: number, bidB: number, askB: number): boolean {
  // Arbitragem existe se:
  // bidA > askB (comprar em B, vender em A)
  // OU bidB > askA (comprar em A, vender em B)
  // Retorna true se existe oportunidade
}
```

### Exercício 4: Agregador de Dados

Crie uma função que agrega dados de múltiplos mercados:

```typescript
async function agregarResultados(
  conditionIds: string[]
): Promise<Array<{ conditionId: string; stats: Estatisticas }>> {
  // Para cada condition ID:
  // 1. Buscar order book
  // 2. Calcular estatísticas (spread, profundidade, etc.)
  // 3. Retornar array com resultados
  //
  // Dica: Use Promise.all() para paralelismo
}
```

---

## 9. Resumo do Capítulo

- **Gamma API**: Descoberta de mercados e eventos
- **CLOB REST**: Dados de mercado (preços, order book, histórico)
- **Data API**: Dados de usuários (detentores, trades)
- **Normalização**: Lidar com formatos inconsistentes
- **Paralelismo**: Promise.all() para múltiplas requisições
- **Rate limiting**: Token bucket para respeitar limites
- **Timeout**: Sempre definir timeout em requisições
- **Fallbacks**: Endpoints alternativos para resiliência

---

## 10. Para Saber Mais

- **Documentação Oficial Polymarket**: https://docs.polymarket.com
- **REST API Design**: RESTful Web APIs (Leonard Richardson)
- **HTTP Handbook**: https://developer.mozilla.org/en-US/docs/Web/HTTP

---

**Próximo Capítulo:** WebSockets e Tempo Real

[Continue para o Capítulo 4](./04-websockets-tempo-real.md)
