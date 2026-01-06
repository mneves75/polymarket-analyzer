# Capítulo 08: Exercícios Práticos Completos

> **"A única maneira de aprender uma nova linguagem de programação é escrevendo programas nela."**
> — Dennis Ritchie

---

## Introdução

Este capítulo contém **exercícios práticos completos** que cobrem todos os conceitos aprendidos. Cada exercício inclui:

1. **Descrição** do que deve ser implementado
2. **Dicas** para guiar sua solução
3. **Solução exemplo** (não olhe antes de tentar!)

---

## Módulo 1: TypeScript Básico

### Exercício 1.1: Tipos e Interfaces

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
    "start": "bun run src/index.ts"
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
Usage: bun run src/index.ts [options]

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
