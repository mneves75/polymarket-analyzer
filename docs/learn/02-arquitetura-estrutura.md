# Capítulo 02: Arquitetura e Estrutura do Projeto

> **"A complexidade é o inimigo. Quanto mais simples, melhor."**
> — John Carmack

---

## 1. Visão Arquitetural

### 1.1 O Que é Arquitetura de Software?

**Arquitetura de software** é como você organiza e estrutura o código do seu projeto. É como a planta de uma casa: define onde ficam os quartos, a cozinha, a sala, e como eles se conectam.

**Analogia Prática:**

Imagine que você está construindo um restaurante:

```
ARQUITETURA RUIM:
─────────────────────────────────────────────
┌─────────────────────────────────────────┐
│  Cozinha  │  Mesa  │  Banheiro  │ Mesa  │
│    └──────────────────────────────────┘ │
│         Tudo em um cômodo gigante       │
└─────────────────────────────────────────┘

Problemas:
- Os clientes precisam passar pela cozinha
- O chefe não consegue gerenciar
- Barulho de todo lado
- Impossível expandir

ARQUITETURA BOA:
─────────────────────────────────────────────
┌────────────┬────────────┬────────────┐
│  Cozinha   │   Salão    │  Banheiro  │
│  (privado) │  (público) │  (privado) │
└────────────┴────────────┴────────────┘

Vantagens:
- Separação clara de responsabilidades
- Fácil de gerenciar
- Pode expandir cada parte independentemente
```

### 1.2 Arquitetura do Polymarket Analyzer

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Camada de Apresentação                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                     index.ts (CLI)                           │  │
│  │  - Parse argumentos                                          │  │
│  │  - Despacha para modo apropriado                            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                  │                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    tui.ts (Interface)                        │  │
│  │  - Renderiza terminal UI                                     │  │
│  │  - Gerencia interação do usuário                            │  │
│  │  - Atualiza display em tempo real                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Camada de Domínio                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │  market.ts     │  │  parsers.ts    │  │    utils.ts        │    │
│  │  - Resolução   │  │  - Normaliza   │  │  - Formatação      │    │
│  │    de mercado  │  │    dados       │  │  - Sparklines      │    │
│  └────────────────┘  └────────────────┘  └────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Camada de Dados                           │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │   api.ts       │  │    ws.ts       │  │    http.ts         │    │
│  │  - Cliente REST│  │  - Cliente WS  │  │  - HTTP + Rate     │    │
│  │    (Polymarket)│  │    (Tempo real)│  │    Limit           │    │
│  └────────────────┘  └────────────────┘  └────────────────────┘    │
│                                  │                                  │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              rateLimiter.ts (Controle de Fluxo)              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      APIs Externas (Polymarket)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Gamma API    │  │ CLOB API     │  │ Data API                 │  │
│  │ (Descoberta) │  │ (Preços/WS)  │  │ (Detentores/Trades)      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Estrutura de Diretórios

### 2.1 Mapa Completo do Projeto

```
polymarket-analyzer/
│
├── src/                          # ← Todo o código fonte (lógica)
│   ├── index.ts                  # Ponto de entrada CLI
│   ├── config.ts                 # Configurações centralizadas
│   │
│   │  # ─── Camada de Dados ───
│   ├── api.ts                    # Cliente REST (todas APIs)
│   ├── ws.ts                     # Cliente WebSocket
│   ├── http.ts                   # HTTP + rate limiting
│   │
│   │  # ─── Camada de Domínio ───
│   ├── market.ts                 # Lógica de mercados
│   ├── parsers.ts                # Normalização de dados
│   ├── utils.ts                  # Utilitários de formatação
│   ├── logger.ts                 # Sistema de logging
│   ├── rateLimiter.ts            # Algoritmo token bucket
│   │
│   │  # ─── Camada de Apresentação ───
│   ├── tui.ts                    # Interface terminal (682 linhas!)
│   └── demo.ts                   # Modos snapshot/list
│
├── tests/                        # ← Testes automatizados
│   ├── api.test.ts               # Testes de API
│   ├── cli.test.ts               # Testes de CLI
│   ├── parsers.test.ts           # Testes de parsing
│   └── ws.test.ts                # Testes de WebSocket
│
├── docs/                         # ← Documentação
│   └── learn/                    # ← Você está aqui!
│
├── snapshots/                    # ← Snapshots exportados
│
├── package.json                  # Metadados e scripts
├── tsconfig.json                 # Configuração TypeScript
├── bun.lockb                     # Lock file de dependências
└── README.md                     # Documentação rápida
```

### 2.2 Por Que Essa Estrutura?

#### Separação de Responsabilidades (Separation of Concerns)

Cada arquivo/módulo tem **uma responsabilidade clara**:

```typescript
// ❌ RUIM - Tudo em um arquivo
// api.ts (1000 linhas)
// - Fetch de dados
// - Rate limiting
// - Parsing
// - Normalização
// - WebSocket
// - Logging
// - Formatação

// ✅ BOM - Separado em módulos
// api.ts (400 linhas) - Apenas fetch de dados
// rateLimiter.ts (42 linhas) - Apenas rate limiting
// parsers.ts (84 linhas) - Apenas parsing
// http.ts (116 linhas) - HTTP + rate limiting
// ws.ts (200 linhas) - Apenas WebSocket
// logger.ts (30 linhas) - Apenas logging
// utils.ts (37 linhas) - Apenas formatação
```

#### Vantagens da Separação:

1. **Fácil de encontrar coisas** - O código de rate limiting está em `rateLimiter.ts`
2. **Fácil de testar** - Cada módulo pode ser testado isoladamente
3. **Fácil de modificar** - Mudar rate limiting não afeta parsing
4. **Fácil de reutilizar** - `utils.ts` pode ser usado em outros projetos

---

## 3. Anatomia dos Arquivos Principais

### 3.1 config.ts - Configurações Centralizadas

Veja `src/config.ts`:

```typescript
export const CONFIG = {
  // URLs base das APIs
  gammaBase: "https://gamma-api.polymarket.com",
  clobRestBase: "https://clob.polymarket.com",
  clobWsBase: "wss://ws-subscriptions-clob.polymarket.com/ws/",
  dataApiBase: "https://data-api.polymarket.com",

  // Intervalos de refresh (ms)
  refreshMs: 3000,         // Dados gerais: 3 segundos
  historyMs: 30000,        // Histórico: 30 segundos
  holdersMs: 60000,        // Detentores: 60 segundos
  radarMs: 60000,          // Radar: 60 segundos

  // Limites de stale data (dados antigos)
  wsStaleMs: 15000,        // WebSocket: 15 segundos
  restStaleMs: 20000,      // REST: 20 segundos

  // Limites de dados
  historyFidelity: 30,     // Pontos de histórico
  holdersLimit: 8,         // Top detentores
  orderbookDepth: 10,      // Níveis do order book
  radarLimit: 10,          // Mercados no radar

  // Timeouts
  restTimeoutMs: 10000,    // Timeout de requisições
};
```

**Por que centralizar configurações?**

```typescript
// ❌ RUIM - Valores "hardcoded" espalhados
async function fetchEvents() {
  const response = await fetch("https://gamma-api.polymarket.com/events");
  await sleep(3000);  // ← De onde veio esse 3000?
}

async function fetchMarkets() {
  const response = await fetch("https://gamma-api.polymarket.com/markets");
  await sleep(3000);  // E se precisar mudar em um só lugar?
}

// ✅ BOM - Configuração centralizada
const CONFIG = { refreshMs: 3000 };

async function fetchEvents() {
  await sleep(CONFIG.refreshMs);  // ← Um lugar para mudar
}
```

**Benefícios:**
- ✅ Fácil modificar - Mude em um lugar, afeta todos
- ✅ Fácil testar - Mock `CONFIG` nos testes
- ✅ Documentação - Valores e unidades documentados
- ✅ Consistência - Todos usam os mesmos valores

### 3.2 index.ts - Ponto de Entrada

Veja `src/index.ts`:

```typescript
#!/usr/bin/env bun
import { CONFIG } from "./config";
import { listMarkets, runSnapshot } from "./demo";
import { runDashboard } from "./tui";

// ─── 1. Definição de tipos ───
type Options = {
  market?: string;      // ID do mercado
  slug?: string;        // Slug do mercado
  intervalMs: number;   // Intervalo de refresh
  limit: number;        // Limite de mercados
  once: boolean;        // Modo snapshot
  listMarkets: boolean; // Modo listagem
  ws: boolean;          // Usar WebSocket
  json: boolean;        // Output JSON
};

// ─── 2. Parse de argumentos ───
const opts = parseArgs(process.argv.slice(2));

// ─── 3. Despacho de modo ───
if (opts.listMarkets) {
  await listMarkets(opts.limit, opts.json);
  process.exit(0);
}

if (opts.once) {
  await runSnapshot({ ... });
  process.exit(0);
}

await runDashboard({ ... });
```

**Fluxo de Execução:**

```
Usuário executa: bun run src/index.ts --tui --market 123
                        │
                        ▼
              ┌─────────────────────┐
              │  parseArgs()        │
              │  Processa argv      │
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  opts = {           │
              │    market: "123",   │
              │    ws: true,        │
              │    ...              │
              │  }                  │
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  Verifica modo      │
              │  (tui/snapshot/etc) │
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  runDashboard()     │
              └─────────────────────┘
```

### 3.3 http.ts - Cliente HTTP Inteligente

Veja `src/http.ts`:

```typescript
// ─── 1. Tipos ───
export type FetchOptions = {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
};

// ─── 2. Rate limits conhecidos ───
const RATE_LIMITS = [
  { host: "clob.polymarket.com", path: "/book", limit: 1500 },
  { host: "clob.polymarket.com", path: "/price", limit: 1500 },
  // ... mais regras
];

// ─── 3. Função principal ───
export async function fetchJson<T>(
  url: string,
  options: FetchOptions = {}
): Promise<T> {
  // 1. Identifica rate limit aplicável
  const limitRule = matchRateLimit(url);
  if (limitRule) await limiter.take(limitRule);

  // 2. Tenta com retry
  let attempt = 0;
  while (true) {
    try {
      // 3. Faz fetch com timeout
      const res = await fetch(url, { ... });
      if (!res.ok) {
        // 4. Verifica se deve retry
        if (shouldRetry(res.status) && attempt < retries) {
          await backoff(attempt);
          continue;
        }
        throw new Error(...);
      }
      return await res.json();
    } catch (err) {
      if (attempt < retries) {
        await backoff(attempt);
        continue;
      }
      throw err;
    }
  }
}
```

**Fluxo de uma Requisição:**

```
fetchJson(url)
    │
    ▼
┌─────────────────────────────────────┐
│ 1. Match rate limit rule            │
│    - Encontra endpoint específico   │
│    - Ou fallback para host          │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 2. Aguarda se necessário            │
│    - Token bucket                   │
│    - Respeita limites da API        │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│ 3. Faz requisição HTTP              │
│    - Com timeout                     │
│    - Com headers apropriados         │
└─────────────┬───────────────────────┘
              │
              ▼
          Sucesso? ──Não──▶  Retry?
              │                   │
             Sim                  Sim
              │                   │
              ▼                   ▼
    ┌──────────────┐      ┌──────────────┐
    │  Return data │      │  Backoff +   │
    │              │      │  Tentar de   │
    └──────────────┘      │  novo        │
                          └──────────────┘
```

### 3.4 rateLimiter.ts - Token Bucket

Veja `src/rateLimiter.ts`:

```typescript
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  async take(rule: RateLimitRule): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(rule.key);

    // 1. Cria ou reseta bucket
    if (!bucket || now >= bucket.resetAt) {
      bucket = { tokens: rule.limit, resetAt: now + rule.windowMs };
      this.buckets.set(rule.key, bucket);
    }

    // 2. Consome token
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;  // Tem tokens, pode continuar
    }

    // 3. Aguarda reset
    const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
    await sleep(waitMs);
    return this.take(rule);  // Recursão após wait
  }
}
```

**Analogia do Token Bucket:**

```
Imagine um balde (bucket) que pode conter tokens:

     ╔═══════════════════╗
     ║   TOKEN BUCKET    ║
     ║  [limit: 1000]    ║
     ║  ╔══════════════╗ ║
     ║  ║██████████████║ ║  ← Tokens disponíveis
     ║  ╚══════════════╝ ║
     ║    ↓ 1 token     ║  ← Cada requisição gasta 1 token
     ╚═══════════════════╝

Se o balde está cheio: requisição passa imediatamente
Se o balde está vazio: aguarda até resetar

┌─────────────────────────────────────────────────────┐
│  timeline (10 segundos window)                     │
│                                                     │
│  │█│█│█│█│█│█│█│█│█│                              │
│  0 1 2 3 4 5 6 7 8 9                              (segundos)
│                                                     │
│  Cada █ é uma requisição que consumiu 1 token      │
│  Após 10 segundos, o balde recarrega               │
└─────────────────────────────────────────────────────┘
```

**Por que Jitter?**

```typescript
function jitter(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

// Sem jitter:
// 10 clientes fazem retry no mesmo momento
// → "Thundering herd" → Servidor sobrecarregado

// Com jitter:
// 10 clientes fazem retry em momentos aleatórios
// → Load distribuído → Servidor aguenta
```

### 3.5 parsers.ts - Normalização de Dados

Veja `src/parsers.ts`:

```typescript
// ─── Problema: APIs retornam formatos diferentes ───
// API 1: { price: 0.65 }
// API 2: { best_price: 0.65 }
// API 3: { value: 0.65 }

// ─── Solução: Funções de extração ───
export function extractPrice(response: Record<string, unknown>) {
  const direct = response.price ?? response.best_price ?? response.value;
  if (direct !== undefined) return asNumber(direct);
  return undefined;
}

// ─── Order book: múltiplos formatos ───
// Formato 1: { bids: [[price, size], ...] }
// Formato 2: { bids: [{ price: 0.65, size: 100 }, ...] }
// Formato 3: { buys: [{ p: 0.65, s: 100 }, ...] }

export function normalizeLevels(levels: unknown[]): OrderbookLevel[] {
  return levels
    .map((level) => {
      // Array [price, size]
      if (Array.isArray(level)) {
        return {
          price: asNumber(level[0]) ?? 0,
          size: asNumber(level[1]) ?? 0
        };
      }
      // Objeto { price, size }
      if (level && typeof level === "object") {
        const record = level as Record<string, unknown>;
        return {
          price: asNumber(record.price ?? record.p ?? record.rate) ?? 0,
          size: asNumber(record.size ?? record.s ?? record.amount) ?? 0
        };
      }
      return null;
    })
    .filter((level): level is OrderbookLevel => level !== null)
    .filter((level) => level.price !== 0 && level.size !== 0);
}
```

**Fluxo de Normalização:**

```
┌─────────────────────────────────────────────────────────┐
│  DADO BRUTO (vários formatos possíveis)                 │
│                                                         │
│  {                                                      │
│    "bids": [[0.65, 100], [0.64, 200]]                  │
│  }                                                      │
│                                                         │
│  OU                                                     │
│                                                         │
│  {                                                      │
│    "buys": [{"price": 0.65, "size": 100}]              │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  normalizeLevels()                                      │
│  - Detecta formato (array ou objeto)                    │
│  - Extrai preço e tamanho                              │
│  - Usa fallback para diferentes nomes                  │
│  - Filtra valores inválidos                            │
└─────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│  DADO NORMALIZADO (formato consistente)                 │
│                                                         │
│  [                                                      │
│    { price: 0.65, size: 100 },                         │
│    { price: 0.64, size: 200 }                          │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘
```

### 3.6 market.ts - Resolução de Mercados

Veja `src/market.ts`:

```typescript
export async function resolveMarket(
  opts: ResolveOptions,
  radar: MarketInfo[]
): Promise<MarketInfo | null> {
  // 1. Tenta resolver por slug
  if (opts.slug) {
    // 1a. Tenta buscar mercado por slug
    try {
      const market = await fetchMarketBySlug(opts.slug);
      const normalized = normalizeMarket(market, undefined);
      if (normalized) return normalized;
    } catch (_) { }

    // 1b. Tenta buscar evento por slug
    try {
      const event = await fetchEventBySlug(opts.slug);
      const market = firstMarketFromEvent(event);
      if (market) return market;
    } catch (_) { }
  }

  // 2. Tenta resolver por condition ID
  if (opts.market) {
    try {
      const market = await fetchMarketByConditionId(opts.market);
      if (market) {
        const normalized = normalizeMarket(market, undefined);
        if (normalized) return normalized;
      }
    } catch (_) { }

    // 2b. Fallback para radar local
    const match = radar.find((item) => item.conditionId === opts.market);
    if (match) return match;
  }

  // 3. Último recurso: primeiro do radar
  return radar[0] ?? null;
}
```

**Estratégia de Resolução:**

```
Usuário especifica: --slug "eleicoes-usa-2024"
                        │
                        ▼
              ┌─────────────────────────┐
              │ É um mercado?           │
              └─────┬───────────────┬───┘
                    │ Sim           │ Não
                    ▼               ▼
          ┌──────────────┐   ┌──────────────┐
          │ fetchMarket  │   │ fetchEvent   │
          │   BySlug()   │   │   BySlug()   │
          └──────┬───────┘   └──────┬───────┘
                 │                   │
                 ▼                   ▼
          ┌──────────────┐   ┌──────────────┐
          │ Normalize    │   │ Primeiro     │
          │   market     │   │ mercado do   │
          │              │   │   evento     │
          └──────┬───────┘   └──────┬───────┘
                 │                   │
                 └─────────┬─────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │ Retornar mercado │
                 └──────────────────┘
```

---

## 4. Padrões de Design Utilizados

### 4.1 Singleton Pattern

**Singleton** garante que uma classe tenha **apenas uma instância**.

```typescript
// http.ts
const limiter = new RateLimiter();  // ← Única instância global

export async function fetchJson<T>(...) {
  if (limitRule) await limiter.take(limitRule);
  // ...
}
```

**Por que Singleton?**

```
SEM SINGLETON:
─────────────────────────────────────────────
fetchJson1() → new RateLimiter() → limiter1
fetchJson2() → new RateLimiter() → limiter2
fetchJson3() → new RateLimiter() → limiter3

Problema:
- Cada limiter tem seu próprio estado
- Rate limits não são compartilhados
- Você pode exceder o limite global!

COM SINGLETON:
─────────────────────────────────────────────
fetchJson1() → limiter (mesma instância)
fetchJson2() → limiter (mesma instância)
fetchJson3() → limiter (mesma instância)

Benefício:
- Estado compartilhado
- Rate limits respeitados globalmente
```

### 4.2 Strategy Pattern

**Strategy** permite trocar algoritmos em runtime.

```typescript
// market.ts - Estratégias de resolução
export async function resolveMarket(opts, radar) {
  // Estratégia 1: Por slug
  if (opts.slug) { /* ... */ }

  // Estratégia 2: Por condition ID
  if (opts.market) { /* ... */ }

  // Estratégia 3: Fallback para radar
  return radar[0] ?? null;
}
```

### 4.3 Factory Pattern

**Factory** centraliza a criação de objetos complexos.

```typescript
// parsers.ts - Factory de níveis
export function normalizeLevels(levels: unknown[]): OrderbookLevel[] {
  return levels
    .map((level) => {
      // Cria OrderbookLevel baseado no formato
      if (Array.isArray(level)) {
        return { price: asNumber(level[0]) ?? 0, size: asNumber(level[1]) ?? 0 };
      }
      if (level && typeof level === "object") {
        // ...
      }
    })
    .filter((level): level is OrderbookLevel => level !== null);
}
```

### 4.4 Retry Pattern

**Retry** tenta operações que podem falhar transitoriamente.

```typescript
// http.ts
let attempt = 0;
while (true) {
  try {
    const res = await fetch(url, { ... });
    if (!res.ok && shouldRetry(res.status) && attempt < retries) {
      attempt += 1;
      await backoff(attempt);  // ← Exponential backoff
      continue;  // ← Tenta de novo
    }
    return await res.json();
  } catch (err) {
    if (attempt < retries) {
      attempt += 1;
      await backoff(attempt);
      continue;  // ← Tenta de novo
    }
    throw err;  // ← Desiste após N tentativas
  }
}
```

**Exponential Backoff:**

```
Tentativa 1: falha → espera 200ms
Tentativa 2: falha → espera 400ms (2x)
Tentativa 3: falha → espera 800ms (2x)
Tentativa 4: desiste

Por que exponencial?
- Tenta rápido primeiro (falhas transitórias)
- Aumenta espera se persiste (não sobrecarrega servidor)
- Desiste eventualmente (não trava para sempre)
```

---

## 5. Fluxo de Dados Completo

### 5.1 Cadeia de Dados: Do Usuário à Tela

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USUÁRIO EXECUTA COMANDO                                     │
│                                                                  │
│  $ bun run src/index.ts --tui --market 12345                    │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. CLI PARSE ARGUMENTOS (index.ts)                             │
│                                                                  │
│  parseArgs() → opts = { market: "12345", ws: true, ... }       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. CARREGA RADAR DE MERCADOS (market.ts + api.ts)             │
│                                                                  │
│  loadRadar(10) → fetchEvents() → normalizeMarket()             │
│                                                                  │
│  Resultado: MarketInfo[] (10 mercados)                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. RESOLVE MERCADO ESPECÍFICO (market.ts)                     │
│                                                                  │
│  resolveMarket({ market: "12345" }, radar)                     │
│    → fetchMarketByConditionId("12345")                         │
│    → normalizeMarket()                                          │
│                                                                  │
│  Resultado: MarketInfo (mercado "12345")                       │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. CONECTA WEBSOCKET (ws.ts)                                   │
│                                                                  │
│  connectMarketWs([tokenIds], handlers)                         │
│    → Abre conexão WebSocket                                     │
│    → Envia subscription message                                 │
│    → Recebe atualizações em tempo real                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. BUSCA DADOS ADICIONAIS (api.ts + http.ts)                  │
│                                                                  │
│  getOrderbook() → fetchJson() → normalizeOrderbook()           │
│  getPrices() → fetchJson() → extractPrice()                    │
│  getPriceHistory() → fetchJson() → extractHistory()            │
│  getHolders() → fetchJson() → normalizeHolders()               │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  7. ATUALIZA ESTADO (tui.ts)                                    │
│                                                                  │
│  Toda vez que chega dado novo (WS ou REST):                    │
│    - Atualiza variáveis de estado                               │
│    - Recalcula derivados (spread, midpoint)                     │
│    - Verifica staleness                                         │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  8. RENDERIZA INTERFACE (tui.ts)                                │
│                                                                  │
│  screen.render() → blessed renderiza todos os componentes:     │
│    - Header (status, relógio, WS status)                        │
│    - Radar table (lista de mercados)                            │
│    - Market box (detalhes do mercado)                           │
│    - Pulse panel (preços em tempo real)                         │
│    - Orderbook table (livro de ofertas)                         │
│    - History panel (sparkline)                                  │
│    - Holders table (top detentores)                             │
│    - Alerts & Status (warnings, erros)                          │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  9. LOOP DE REFRESH (tui.ts)                                    │
│                                                                  │
│  setInterval(refreshMs):                                        │
│    - Busca dados REST                                           │
│    - Atualiza estado                                            │
│    - Renderiza                                                  │
│    - Repete                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Estado Global da Aplicação

```typescript
// tui.ts - Variáveis de estado
let radar: MarketInfo[] = [];              // Lista de mercados
let currentMarket: MarketInfo | null = null; // Mercado atual
let currentOutcomeIndex = 0;               // Outcome selecionado
let orderbook: OrderbookState | null = null; // Order book
let prices: PricesInfo | null = null;      // Preços
let priceHistory: number[] = [];           // Histórico
let holders: HolderInfo[] = [];            // Detentores
let wsConnected = false;                   // WS conectado?
let lastWsUpdate = 0;                      // Última msg WS
let lastError = "";                        // Último erro
```

**Fluxo de Atualização de Estado:**

```
┌─────────────────────────────────────────────────────────────┐
│  Estado Inicial                                              │
│  radar = []                                                  │
│  currentMarket = null                                        │
│  wsConnected = false                                         │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Dados chegam (REST ou WebSocket)                           │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Atualiza variáveis de estado                                │
│  - radar = novos dados                                       │
│  - currentMarket = mercado resolvido                         │
│  - orderbook = livro normalizado                             │
│  - prices = preços extraídos                                 │
│  - priceHistory = histórico                                  │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Deriva estado computado                                     │
│  - spread = bestAsk - bestBid                                │
│  - midpoint = (bestBid + bestAsk) / 2                        │
│  - stale = Date.now() - lastUpdate > staleMs                │
└─────────────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│  Renderiza interface                                         │
│  - Atualiza conteúdo de cada componente                      │
│  - Altera cores baseado em estado                            │
│  - Mostra alerts se necessário                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Boas Práticas de Arquitetura

### 6.1 Dependency Inversion

**Dependa de abstrações, não de implementações concretas.**

```typescript
// ❌ RUIM - Depende de implementação concreta
import { blessed } from "blessed";

function renderUI(data: MarketData) {
  const screen = blessed.screen({ ... });  // Acoplado ao blessed
  // ...
}

// ✅ BOM - Depende de abstração
interface Screen {
  render(): void;
  append(component: unknown): void;
}

function renderUI(screen: Screen, data: MarketData) {
  screen.append(...);  // Qualquer implementação de Screen
}
```

### 6.2 Don't Repeat Yourself (DRY)

**Não repita código. Extraia para funções reutilizáveis.**

```typescript
// ❌ RUIM - Repetição
const price1 = data.price !== undefined ? data.price : 0;
const price2 = data.best_price !== undefined ? data.best_price : 0;
const price3 = data.value !== undefined ? data.value : 0;

// ✅ BOM - Função reutilizável
function extractPrice(data: Record<string, unknown>) {
  return data.price ?? data.best_price ?? data.value ?? 0;
}

const price1 = extractPrice(data1);
const price2 = extractPrice(data2);
const price3 = extractPrice(data3);
```

### 6.3 Single Responsibility Principle (SRP)

**Cada função/módulo deve ter uma única responsabilidade.**

```typescript
// ❌ RUIM - Faz múltiplas coisas
async function processarMercado(id: string) {
  const raw = await fetch(`/markets/${id}`);
  const data = await raw.json();
  const normalized = normalizeMarket(data);
  const formatted = formatMarket(normalized);
  const rendered = renderMarket(formatted);
  return rendered;
}

// ✅ BOM - Cada função faz uma coisa
async function fetchMarket(id: string) { /* ... */ }
function normalizeMarket(data: unknown) { /* ... */ }
function formatMarket(market: MarketInfo) { /* ... */ }
function renderMarket(formatted: FormattedMarket) { /* ... */ }

// Composição
async function processarMercado(id: string) {
  const data = await fetchMarket(id);
  const normalized = normalizeMarket(data);
  const formatted = formatMarket(normalized);
  return renderMarket(formatted);
}
```

### 6.4 Fail Fast

**Erro cedo, erro loud.**

```typescript
// ❌ RUIM - Erro silencioso
function getMarketId(market: MarketInfo): string {
  return (market as any).conditionId ?? "default";
  // ↑ Se for undefined, retorna "default" silenciosamente
}

// ✅ BOM - Erro explícito
function getMarketId(market: MarketInfo): string {
  if (!market.conditionId) {
    throw new Error("Market must have a conditionId");
  }
  return market.conditionId;
}
```

---

## 7. Exercícios Práticos

### Exercício 1: Mapeie o Fluxo

Mapeie o fluxo completo de quando o usuário pressiona a tecla 'n' (próximo mercado):

1. Onde o keypress é capturado? (`tui.ts`)
2. Como o estado muda? (`currentOutcomeIndex`)
3. O que precisa ser recarregado? (WebSocket, REST)
4. Como a interface é atualizada? (`screen.render()`)

### Exercício 2: Adicione um Novo Endpoint

Adicione um novo endpoint fictício à API:

```typescript
// 1. Adicione a função em api.ts
export async function fetchMarketStats(marketId: string) {
  // ...
}

// 2. Adicione o rate limit em http.ts
const RATE_LIMITS = [
  // ...
  { host: "api.polymarket.com", path: "/stats", limit: 500 }
];

// 3. Chame de tui.ts para mostrar stats do mercado
```

### Exercício 3: Refatoração

Encontre um lugar no código onde DRY está sendo violado e refatore:

```typescript
// Dica: Procure por código repetido em api.ts
// Exemplo: fetchEvents, fetchMarkets são muito similares
// Extraia a lógica comum para uma função fetchPaginated()
```

---

## 8. Resumo do Capítulo

- **Arquitetura em camadas**: Apresentação → Domínio → Dados
- **Separação de responsabilidades**: Cada arquivo tem uma função clara
- **Configuração centralizada**: `config.ts` evita "magic numbers"
- **Padrões de design**: Singleton, Strategy, Factory, Retry
- **Fluxo de dados**: CLI → API → Parse → Estado → Render
- **Boas práticas**: DRY, SRP, Fail Fast

---

## 9. Para Saber Mais

- **Clean Architecture**: Robert C. Martin
- **Design Patterns**: Gang of Four
- **Refactoring**: Martin Fowler
- **The Pragmatic Programmer**: Andrew Hunt e David Thomas

---

**Exercício Final: Desenhe a Arquitetura**

Desenhe um diagrama da arquitetura do projeto incluindo:
- Todos os arquivos em `src/`
- As dependências entre eles
- O fluxo de dados
- Onde cada padrão de design é usado

Compare com o diagrama deste capítulo e discuta as diferenças.

---

**Próximo Capítulo:** Integração com APIs Polymarket

[Continue para o Capítulo 3](./03-apis-polymarket.md)
