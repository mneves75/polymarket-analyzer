# Capítulo 08: Exercícios Práticos Completos

> **"A única maneira de aprender uma nova linguagem de programação é escrevendo programas nela."**
> — Dennis Ritchie

---

## 📊 Sistema de Níveis

Os exercícios são classificados em 4 níveis de dificuldade:

| Nível | Badge | Descrição | Tempo Estimado |
|-------|-------|-----------|----------------|
| 🟢 **Iniciante** | Fácil | Conceitos básicos, bem guiado | 15-30 min |
| 🟡 **Intermediário** | Médio | Requer pensamento, múltiplos passos | 30-60 min |
| 🟠 **Avançado** | Difícil | Problemas complexos, menos guiado | 1-2 horas |
| 🔴 **Mestre** | Desafiador | Requer pesquisa, arquitetura própria | 2+ horas |

---

## Introdução

Este capítulo contém **exercícios práticos completos** que cobrem todos os conceitos aprendidos. Cada exercício inclui:

1. **Nível de dificuldade** (ver tabela acima)
2. **Pré-requisitos** (conhecimentos necessários)
3. **Descrição** do que deve ser implementado
4. **Dicas** para guiar sua solução
5. **Solução exemplo** (não olhe antes de tentar!)

---

## 🟢 Módulo 1: TypeScript Básico (Iniciante)

### Exercício 1.1: Tipos e Interfaces

**Nível:** 🟢 Iniciante
**Pré-requisitos:** Capítulo 01
**Tempo estimado:** 20 minutos

Implemente tipos TypeScript para um sistema de pedidos:

```typescript
// TODO: Defina os tipos
type Order = unknown;
type Product = unknown;
type Customer = unknown;

// TODO: Implemente a função
function calculateOrderTotal(order: Order): number {
  // Soma (preço * quantidade) de cada produto
  return 0; // Implemente
}

// Teste
const order = {
  id: "ORD-001",
  customer: { name: "Maria", email: "maria@example.com" },
  products: [
    { id: "P1", name: "Notebook", price: 2500, quantity: 1 },
    { id: "P2", name: "Mouse", price: 50, quantity: 2 }
  ],
  status: "pending"
};

console.log(calculateOrderTotal(order)); // Esperado: 2600
```

<details>
<summary>Solução</summary>

```typescript
type Product = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type Customer = {
  name: string;
  email: string;
};

type OrderStatus = "pending" | "paid" | "shipped" | "delivered";

type Order = {
  id: string;
  customer: Customer;
  products: Product[];
  status: OrderStatus;
};

function calculateOrderTotal(order: Order): number {
  return order.products.reduce((total, product) => {
    return total + (product.price * product.quantity);
  }, 0);
}
```

</details>

### Exercício 1.2: Generics

Implemente uma função genérica de busca:

```typescript
// TODO: Implemente função genérica que busca em array
function findItem<T>(items: T[], predicate: (item: T) => boolean): T | null {
  return null; // Implemente
}

// Teste
interface User {
  id: number;
  name: string;
  email: string;
}

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" },
  { id: 3, name: "Charlie", email: "charlie@example.com" }
];

const user = findItem(users, u => u.id === 2);
console.log(user?.name); // Esperado: "Bob"
```

<details>
<summary>Solução</summary>

```typescript
function findItem<T>(items: T[], predicate: (item: T) => boolean): T | null {
  for (const item of items) {
    if (predicate(item)) {
      return item;
    }
  }
  return null;
}
```

</details>

---

## Módulo 2: Integração de APIs

### Exercício 2.1: Cliente HTTP Simples

Implemente um cliente HTTP com retry:

```typescript
// TODO: Implemente cliente HTTP com retry
class HttpClient {
  async get<T>(url: string, retries = 3): Promise<T> {
    // 1. Tenta fetch
    // 2. Se falhar e ainda tem retries, espera e tenta de novo
    // 3. Use exponential backoff: 100ms, 200ms, 400ms...
    throw new Error("Implemente");
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Teste
const client = new HttpClient();
const data = await client.get("https://api.github.com/users/github");
console.log(data.login); // Esperado: "github"
```

<details>
<summary>Solução</summary>

```typescript
class HttpClient {
  async get<T>(url: string, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        if (attempt === retries - 1) {
          throw error; // Última tentativa falhou
        }
        const backoffMs = 100 * Math.pow(2, attempt);
        await this.sleep(backoffMs);
      }
    }
    throw new Error("Max retries exceeded");
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

</details>

### Exercício 2.2: Parser de Dados

Implemente parser para múltiplos formatos de data:

```typescript
// TODO: Implemente parser que aceita múltiplos formatos
function parseDate(input: unknown): Date | null {
  // Aceita:
  // 1. ISO string: "2024-01-15T10:30:00Z"
  // 2. Timestamp em ms: 1705316400000
  // 3. Objeto { year, month, day }: { year: 2024, month: 1, day: 15 }
  // 4. null ou undefined → retorna null
  return null; // Implemente
}

// Testes
console.log(parseDate("2024-01-15T10:30:00Z")); // Date válida
console.log(parseDate(1705316400000)); // Date válida
console.log(parseDate({ year: 2024, month: 1, day: 15 })); // Date válida
console.log(parseDate(null)); // null
console.log(parseDate("inválido")); // null
```

<details>
<summary>Solução</summary>

```typescript
function parseDate(input: unknown): Date | null {
  if (input === null || input === undefined) {
    return null;
  }

  // ISO string
  if (typeof input === "string") {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  // Timestamp em ms
  if (typeof input === "number") {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  // Objeto { year, month, day }
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>;
    if ("year" in obj && "month" in obj && "day" in obj) {
      return new Date(
        Number(obj.year),
        Number(obj.month) - 1,
        Number(obj.day)
      );
    }
  }

  return null;
}
```

</details>

---

## Módulo 3: WebSocket

### Exercício 3.1: Cliente WebSocket com Reconexão

Implemente cliente WebSocket com reconexão automática:

```typescript
// TODO: Implemente cliente WS com reconexão
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxAttempts = 5;

  connect(url: string) {
    // 1. Cria conexão WebSocket
    // 2. Se fechar, reconecta com exponential backoff
    // 3. Para após maxAttempts
  }

  send(data: string) {
    // Envia se conectado, senão lança erro
  }

  close() {
    // Fecha conexão e para reconexões
  }
}
```

<details>
<summary>Solução</summary>

```typescript
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxAttempts = 5;
  private closed = false;

  connect(url: string) {
    this.closed = false;
    this.doConnect(url);
  }

  private doConnect(url: string) {
    this.ws = new WebSocket(url);

    this.ws.addEventListener("open", () => {
      console.log("Conectado!");
      this.reconnectAttempts = 0;
    });

    this.ws.addEventListener("close", () => {
      if (this.closed) return;

      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxAttempts) {
        const backoff = 1000 * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconectando em ${backoff}ms...`);
        setTimeout(() => this.doConnect(url), backoff);
      } else {
        console.error("Max reconexões atingido");
      }
    });
  }

  send(data: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket não conectado");
    }
    this.ws.send(data);
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}
```

</details>

---

## Módulo 4: Rate Limiting

### Exercício 4.1: Implemente Token Bucket

```typescript
// TODO: Implemente algoritmo Token Bucket
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens por segundo
    private refillInterval: number // ms
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1): Promise<boolean> {
    // 1. Refill tokens baseado no tempo passado
    // 2. Se tem tokens suficientes, consome e retorna true
    // 3. Senão, retorna false
    return false; // Implemente
  }

  private refill() {
    // Calcula tokens para adicionar baseado no tempo
  }
}
```

<details>
<summary>Solução</summary>

```typescript
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number,
    private refillInterval: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1): Promise<boolean> {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.refillInterval) {
      const intervals = Math.floor(elapsed / this.refillInterval);
      const tokensToAdd = intervals * this.refillRate;

      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}
```

</details>

---

## Módulo 5: Interface de Terminal

### Exercício 5.1: Tabela Formatada

Implemente função que formata tabela em ASCII:

```typescript
// TODO: Formata array de objetos em tabela ASCII
function formatTable<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[]
): string {
  // 1. Calcula largura de cada coluna
  // 2. Cria linha de cabeçalho
  // 3. Cria linhas de dados
  // 4. Retorna tabela completa
  return ""; // Implemente
}

// Teste
const users = [
  { name: "Alice", age: 30, city: "SP" },
  { name: "Bob", age: 25, city: "RJ" }
];

console.log(formatTable(users, ["name", "age", "city"]));
// Esperado:
// NAME  | AGE | CITY |
// Alice | 30  | SP   |
// Bob   | 25  | RJ   |
```

<details>
<summary>Solução</summary>

```typescript
function formatTable<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[]
): string {
  // Calcula larguras
  const widths = columns.map(col => {
    const header = String(col).length;
    const maxData = Math.max(...data.map(row =>
      String(row[col] ?? "").length
    ));
    return Math.max(header, maxData);
  });

  // Linha de separador
  const separator = widths.map(w => "─".repeat(w + 2)).join("┼");

  // Cabeçalho
  const header = columns.map((col, i) =>
    ` ${String(col).padEnd(widths[i])} `
  ).join("│");

  // Linhas de dados
  const rows = data.map(row =>
    columns.map((col, i) =>
      ` ${String(row[col] ?? "").padEnd(widths[i])} `
    ).join("│")
  );

  return [header, separator, ...rows].join("\n");
}
```

</details>

---

## Módulo 6: Testes

### Exercício 6.1: Teste com Mock

Escreva testes para uma função que depende de API externa:

```typescript
// Código para testar
async function getUserScore(userId: string): Promise<number> {
  const user = await fetchUser(userId);
  return calculateScore(user);
}

function fetchUser(id: string): Promise<User> {
  // Busca de API externa
}

function calculateScore(user: User): number {
  return user.posts.length * 10 + user.followers.length;
}

// TODO: Escreva teste
describe("getUserScore", () => {
  it("deve calcular score corretamente", async () => {
    // Use mock para fetchUser
  });
});
```

<details>
<summary>Solução</summary>

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("getUserScore", () => {
  it("deve calcular score corretamente", async () => {
    // Mock de fetchUser
    const mockFetchUser = mock(async (id: string) => ({
      id,
      name: "Test User",
      posts: [{ id: "1" }, { id: "2" }],
      followers: [{ id: "a" }, { id: "b" }, { id: "c" }]
    }));

    // Substitui função original
    // (em código real, usaria dependency injection)

    const score = await getUserScore("user-123");

    // Score = 2 posts * 10 + 3 followers = 23
    expect(score).toBe(23);
    expect(mockFetchUser).toHaveBeenCalledWith("user-123");
  });
});
```

</details>

---

## Projeto Final: Mini Polymarket

### Objetivo

Crie uma versão simplificada do Polymarket Analyzer com:

1. **CLI** que aceita argumentos
2. **API client** para buscar dados
3. **Rate limiting** para respeitar limites
4. **Output formatado** em tabela

### Requisitos

```typescript
// 1. Parse de argumentos CLI
//    --market <id>     Especifica market ID
//    --limit <n>       Limite de markets (default: 10)
//    --json            Output em JSON
//    --help            Mostra ajuda

// 2. Buscar mercados da API
//    GET https://gamma-api.polymarket.com/markets

// 3. Implementar rate limiting
//    Max 10 requisições por 10 segundos

// 4. Output formatado
//    Se --json: JSON string
//    Senão: Tabela ASCII com nome, preço, volume

// 5. Tratamento de erros
//    Retry com exponential backoff
//    Timeout de 10 segundos
//    Mensagens amigáveis
```

### Estrutura Sugerida

```
mini-polymarket/
├── src/
│   ├── index.ts         # CLI entry point
│   ├── api.ts           # API client
│   ├── rateLimiter.ts   # Token bucket
│   └── formatter.ts     # Output formatting
├── package.json
└── tsconfig.json
```

### Dicas

1. **Comece simples** - Primeiro faça funcionar, depois refatore
2. **Use os módulos do projeto** - `http.ts`, `parsers.ts` como referência
3. **Teste incrementalmente** - Teste cada módulo separadamente
4. **Adicione logging** - Para debugar problemas

---

## Solução do Projeto Final

<details>
<summary>Código Completo</summary>

```typescript
// package.json
{
  "name": "mini-polymarket",
  "scripts": {
    "start": "bun --bun run src/index.ts"
  },
  "dependencies": {}
}

// src/index.ts
#!/usr/bin/env bun
import { fetchMarkets, type MarketInfo } from "./api";
import { formatMarketsAsTable, formatMarketsAsJSON } from "./formatter";

const args = process.argv.slice(2);

// Parse arguments
const options = {
  market: args.find(a => a.startsWith("--market="))?.split("=")[1],
  limit: Number(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "10"),
  json: args.includes("--json"),
  help: args.includes("--help")
};

if (options.help) {
  console.log(`
Usage: bun --bun run src/index.ts [options]

Options:
  --market=<id>     Focus by market ID
  --limit=<n>       Limit results (default: 10)
  --json            Output JSON
  --help            Show help
  `);
  process.exit(0);
}

async function main() {
  try {
    const markets = await fetchMarkets(options.limit);

    if (options.market) {
      const focused = markets.find(m => m.marketId === options.market);
      if (!focused) {
        console.error(`Market ${options.market} not found`);
        process.exit(1);
      }
      markets = [focused];
    }

    if (options.json) {
      console.log(formatMarketsAsJSON(markets));
    } else {
      console.log(formatMarketsAsTable(markets));
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();

// src/api.ts
import { RateLimiter } from "./rateLimiter";

const limiter = new RateLimiter(10, 10000); // 10 req por 10s

export type MarketInfo = {
  marketId?: string;
  question?: string;
  conditionId?: string;
  outcomes: string[];
  clobTokenIds: string[];
};

export async function fetchMarkets(limit: number): Promise<MarketInfo[]> {
  await limiter.consume();

  const url = `https://gamma-api.polymarket.com/markets?limit=${limit}&closed=false&active=true`;

  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  return normalizeMarkets(data);
}

function normalizeMarkets(data: unknown): MarketInfo[] {
  const array = Array.isArray(data) ? data : (data as any).markets ?? (data as any).data ?? [];
  return array.map((m: any) => ({
    marketId: m.id ?? m.marketId,
    question: m.question ?? m.title,
    conditionId: m.conditionId ?? m.condition_id,
    outcomes: m.outcomes ?? ["YES", "NO"],
    clobTokenIds: m.clobTokenIds ?? m.clob_token_ids ?? []
  }));
}

// src/rateLimiter.ts
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(private capacity: number, private windowMs: number) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(): Promise<void> {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return;
    }

    // Aguarda próximo refill
    const waitMs = Math.max(0, this.lastRefill + this.windowMs - Date.now());
    await new Promise(resolve => setTimeout(resolve, waitMs));
    return this.consume();
  }

  private refill() {
    const now = Date.now();
    if (now - this.lastRefill >= this.windowMs) {
      this.tokens = this.capacity;
      this.lastRefill = now;
    }
  }
}

// src/formatter.ts
import type { MarketInfo } from "./api";

export function formatMarketsAsTable(markets: MarketInfo[]): string {
  const rows = [
    ["ID", "Question", "Outcomes"].map(h => h.padEnd(10)),
    ...markets.map(m => [
      (m.marketId ?? "").slice(0, 10).padEnd(10),
      (m.question ?? "").slice(0, 40).padEnd(40),
      m.outcomes.join("/").padEnd(10)
    ])
  ];

  return rows.map(row => row.join(" | ")).join("\n");
}

export function formatMarketsAsJSON(markets: MarketInfo[]): string {
  return JSON.stringify(markets, null, 2);
}
```

</details>

---

## 🟠 Módulo 7: Exercícios Avançados

### Exercício 7.1: Cliente WebSocket com Reconexão Inteligente

**Nível:** 🟠 Avançado
**Pré-requisitos:** Capítulos 03, 04
**Tempo estimado:** 1-2 horas

Implemente um cliente WebSocket com reconexão adaptativa baseada em taxa de sucesso:

```typescript
// TODO: Implemente AdaptiveWebSocketClient
interface ReconnectStrategy {
  getDelay(attempt: number): number;
  onSuccess(): void;
  onFailure(): void;
}

class AdaptiveReconnect implements ReconnectStrategy {
  // Exponential backoff adaptado ao histórico de sucesso/falha
  // - Se muitas falhas: aumenta o delay mais agressivamente
  // - Se muitos sucessos: reduz o baseline delay
  // - Sempre com jitter para evitar thundering herd

  getDelay(attempt: number): number {
    // Implemente
  }

  onSuccess(): void {
    // Reduz baseline delay se tiver muitos sucessos consecutivos
  }

  onFailure(): void {
    // Aumenta baseline delay se tiver muitas falhas consecutivas
  }
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  async connect(url: string, strategy: ReconnectStrategy): Promise<void> {
    // 1. Conecta ao WebSocket
    // 2. Em caso de falha, usa strategy.getDelay() para esperar
    // 3. Tenta reconectar com backoff
    // 4. Reporta sucesso/falha para a estratégia
  }
}

// Teste
const strategy = new AdaptiveReconnect();
const client = new WebSocketClient();
await client.connect("wss://ws.example.com", strategy);
```

**Dicas:**
- Mantenha histórico de últimos N resultados (sucesso/falha)
- Use média móvel para calcular taxa de sucesso
- Ajuste base delay dinamicamente

<details>
<summary>Solução Parcial</summary>

```typescript
class AdaptiveReconnect implements ReconnectStrategy {
  private baseDelay = 500;
  private successCount = 0;
  private failureCount = 0;
  private history: boolean[] = [];

  getDelay(attempt: number): number {
    // Backoff exponencial
    const backoff = Math.min(30000, 500 * Math.pow(2, attempt));

    // Ajuste baseado em taxa de sucesso recente
    const recentSuccessRate = this.getRecentSuccessRate();
    const multiplier = recentSuccessRate > 0.8 ? 0.5 : recentSuccessRate < 0.3 ? 2 : 1;

    // Jitter
    return Math.floor((backoff * multiplier) + Math.random() * 200);
  }

  private getRecentSuccessRate(): number {
    if (this.history.length === 0) return 0.5;
    const recent = this.history.slice(-10);
    return recent.filter(h => h).length / recent.length;
  }

  onSuccess(): void {
    this.successCount++;
    this.history.push(true);
    if (this.history.length > 20) this.history.shift();
  }

  onFailure(): void {
    this.failureCount++;
    this.history.push(false);
    if (this.history.length > 20) this.history.shift();
  }
}
```

</details>

---

### Exercício 7.2: Normalizador de Dados Resiliente

**Nível:** 🟠 Avançado
**Pré-requisitos:** Capítulo 03
**Tempo estimado:** 1-2 horas

Implemente um normalizador de dados que lida com múltiplos formatos de API evolutiva:

```typescript
// TODO: Implemente normalizador resiliente
interface RawMarket {
  [key: string]: unknown;
}

type MarketField = {
  names: string[];  // Todos os nomes possíveis do campo
  transform?: (value: unknown) => unknown;
  required: boolean;
  defaultValue?: unknown;
}

const MARKET_SCHEMA: Record<string, MarketField> = {
  conditionId: {
    names: ["conditionId", "condition_id", "conditionID", "condition-id"],
    required: true
  },
  clobTokenIds: {
    names: ["clobTokenIds", "clob_token_ids", "tokenIds", "tokens"],
    transform: (value) => {
      // Pode ser array, string JSON, ou aninhado
      // Implemente extração resiliente
    },
    required: true,
    defaultValue: []
  },
  volume24hr: {
    names: ["volume24hr", "volume24h", "volume_24h", "volumeUsd"],
    transform: (value) => typeof value === "string" ? parseFloat(value) : value,
    required: false
  },
  // ... adicione outros campos
};

function normalizeMarket(raw: RawMarket): Record<string, unknown> | null {
  // 1. Para cada campo em MARKET_SCHEMA
  // 2. Tenta encontrar valor usando qualquer um dos nomes
  // 3. Aplica transformação se existir
  // 4. Valida campos required
  // 5. Retorna objeto normalizado ou null se inválido
}
```

**Dica:** Use função genérica que tenta múltiplas chaves no objeto.

---

### Exercício 7.3: Sistema de Cache com Invalidação

**Nível:** 🟠 Avançado
**Pré-requisitos:** Capítulos 02, 03
**Tempo estimado:** 1-2 horas

Implemente um sistema de cache com múltiplas estratégias de invalidação:

```typescript
// TODO: Implemente sistema de cache
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  tags: string[];
  version: number;
};

class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttl: number, tags: string[]): void {
    // Implemente com:
    // - TTL (time to live)
    // - Tags para invalidação em grupo
    // - Versioning para stale-while-revalidate
  }

  get(key: string): T | null {
    // Implemente:
    // - Retorna null se expirado
    // - Marca como stale se próximo de expirar (< 10% TTL)
  }

  invalidate(tags: string[]): void {
    // Invalida todos os entries com qualquer das tags
  }

  getStaleEntries(): CacheEntry<T>[] {
    // Retorna entries que estão stale mas ainda não expirados
  }

  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[]
  ): Promise<T> {
    // Implemente padrão stale-while-revalidate:
    // 1. Se cache fresco, retorna
    // 2. Se stale, retorna stale MAS async refresca
    // 3. Se miss, busca e cacheia
  }
}

// Uso prático
const cache = new SmartCache<MarketInfo[]>();

// Busca (com stale-while-revalidate)
const markets = await cache.getOrFetch(
  "markets:active",
  () => fetchMarkets(10),
  60_000,  // 1 minuto TTL
  ["markets", "gamma"]
);

// Invalidação por tag
cache.invalidate(["gamma"]);  // Invalida tudo taggeado com "gamma"
```

---

## 🔴 Módulo 8: Desafios Mestre

### Exercício 8.1: Mini Polymarket Completo

**Nível:** 🔴 Mestre
**Pré-requisitos:** Todos os capítulos
**Tempo estimado:** 3-5 horas

Construa um **mini clone** do Polymarket Analyzer com:

1. **CLI completa** com múltiplos comandos:
   - `markets` - Lista mercados
   - `market <id>` - Detalhes de um mercado
   - `watch <id>` - Modo watch em tempo real (WebSocket)
   - `export <id>` - Exporta snapshot JSON

2. **Rate limiting** configurável por endpoint

3. **WebSocket** com reconexão automática

4. **TUI** (opcional) ou output formatado em tabela

5. **Configuração** via arquivo de config

6. **Logs** estruturados

**Requisitos mínimos:**
- [ ] Pelo menos 3 comandos funcionais
- [ ] Tratamento de erros robusto
- [ ] Testes para funções críticas
- [ ] README com instruções de uso

**Critérios de sucesso:**
- Funciona sem crash por 10 minutos
- Recupera de falhas de rede
- Respeita rate limits da Polymarket

**Entrega:**
- Código em repositório Git
- README documentando
- 1 exemplo de uso de cada comando

<details>
<summary>Dicas de Implementação</summary>

1. **Comece pequeno**: Implemente 1 comando por vez
2. **Use o código do projeto** como referência (mas não copie!)
3. **Teste localmente**: `bun --bun run src/index.ts markets`
4. **Iterate**: Adicione features gradualmente
5. **Documente**: README é tão importante quanto código

</details>

---

### Exercício 8.2: Sistema de Alertas em Tempo Real

**Nível:** 🔴 Mestre
**Pré-requisitos:** Capítulos 04, 05
**Tempo estimado:** 2-4 horas

Implemente um sistema de alertas que notifica o usuário sobre eventos significativos:

```typescript
// TODO: Implemente sistema de alertas
interface AlertRule {
  id: string;
  name: string;
  condition: (update: MarketUpdate) => boolean;
  message: (update: MarketUpdate) => string;
  cooldown: number;  // ms entre notificações
  enabled: boolean;
}

class AlertSystem {
  private rules: AlertRule[] = [];
  private lastAlerted = new Map<string, number>();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  onUpdate(update: MarketUpdate): void {
    // Para cada regra habilitada:
    // 1. Testa condição
    // 2. Verifica cooldown
    // 3. Dispara alerta se aplicável
    // 4. Registra timestamp do alerta
  }
}

// Exemplos de regras:
const priceChangeAlert: AlertRule = {
  id: "price-spike",
  name: "Mudança Brusca de Preço",
  condition: (update) => {
    // Alerta se preço mudou > 5% em 1 minuto
  },
  message: (update) => `🚨 ${update.question}: ${update.priceChange}%`,
  cooldown: 60_000,  // 1 minuto entre alertas
  enabled: true
};

const volumeAlert: AlertRule = {
  id: "volume-surge",
  name: "Aumento de Volume",
  condition: (update) => {
    // Alerta se volume 24h aumentou > 50%
  },
  message: (update) => `📊 ${update.question}: Volume ${update.volumeChange}%`,
  cooldown: 300_000,  // 5 minutos
  enabled: true
};
```

**Features extras (mestre):**
- [ ] Persistência de regras (JSON/YAML)
- [ ] UI para criar/editar regras
- [ ] Notificações multi-canal (console, email, Slack)
- [ ] Histórico de alertas disparados
- [ ] Estatísticas de falsos positivos

---

### Exercício 8.3: Otimizador de Performance

**Nível:** 🔴 Mestre
**Pré-requisitos:** Todos os capítulos + profiling
**Tempo estimado:** 2-4 horas

Analise e otimize o Polymarket Analyzer para:

**Objetivos:**
1. Tempo de inicialização < 2 segundos
2. Uso de memória < 80MB
3. Renderização TUI < 100ms
4. Zero memory leaks

**Ferramentas:**
```bash
# Profile de CPU
bun --prof run src/index.js

# Profile de memória
node --heap-prof run src/index.js

# Análise de bundle
bun build src/index.ts --analyze
```

**Otimizações típicas:**
- Deferir carregamento de módulos pesados
- Pool de conexões HTTP reutilizáveis
- Debounce/throttle de atualizações TUI
- Lazy loading de dados não críticos
- Cache de resultados de parsing

**Entrega:**
1. Relatório de antes/depois
2. Benchmarks medindo melhorias
3. PR com otimizações aplicadas

<details>
<summary>Dicas de Otimização</summary>

**CPU Profile:**
- Funções "quentes" em vermelho = candidatos a otimização
- Procure por loops aninhados, JSON.parse de dados grandes

**Memory Profile:**
- Heap crescendo constantemente = memory leak
- Procure por event listeners não removidos, caches infinitos

**TUI Performance:**
- Renderizar apenas o que mudou (não tela toda)
- Usar `screen.render()` apenas quando necessário
- Evitar alocações em hot path de renderização

</details>

---

## Próximos Passos Após Completar

1. **Refatore** - Aplique princípios DRY, SRP
2. **Adicione testes** - Cobertura >80%
3. **Melhore output** - Cores, progress bars
4. **Adicione features** - WebSocket, histórico
5. **Documente** - README, API docs

---

**Parabéns por chegar até aqui!** 🎉

Você agora tem conhecimento prático de:
- ✅ TypeScript avançado
- ✅ Integração de APIs
- ✅ WebSocket e tempo real
- ✅ Rate limiting
- ✅ Interface de terminal
- ✅ Tratamento de erros
- ✅ Estratégias de teste

Continue praticando e construindo!

---

**Próximo Capítulo:** Próximos Passos e Melhorias

[Continue para o Capítulo 9](./09-proximos-passos.md)
