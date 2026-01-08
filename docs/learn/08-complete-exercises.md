# Chapter 08: Complete Practical Exercises

> **"The only way to learn a new programming language is by writing programs in it."**
> — Dennis Ritchie

---

## Level System

Exercises are classified into 4 difficulty levels:

| Level | Badge | Description | Estimated Time |
|-------|-------|-------------|----------------|
| [BEGINNER] **Beginner** | Easy | Basic concepts, well guided | 15-30 min |
| [INTERMEDIATE] **Intermediate** | Medium | Requires thinking, multiple steps | 30-60 min |
| [ADVANCED] **Advanced** | Hard | Complex problems, less guided | 1-2 hours |
| [MASTER] **Master** | Challenging | Requires research, own architecture | 2+ hours |

---

## Introduction

This chapter contains **complete practical exercises** covering all concepts learned. Each exercise includes:

1. **Difficulty level** (see table above)
2. **Prerequisites** (required knowledge)
3. **Description** of what to implement
4. **Hints** to guide your solution
5. **Example solution** (don't look before trying!)

---

## [BEGINNER] Module 1: Basic TypeScript

### Exercise 1.1: Types and Interfaces

**Level:** [BEGINNER] Beginner
**Prerequisites:** Chapter 01
**Estimated time:** 20 minutes

Implement TypeScript types for an order system:

```typescript
// TODO: Define the types
type Order = unknown;
type Product = unknown;
type Customer = unknown;

// TODO: Implement the function
function calculateOrderTotal(order: Order): number {
  // Sum (price * quantity) for each product
  return 0; // Implement
}

// Test
const order = {
  id: "ORD-001",
  customer: { name: "Maria", email: "maria@example.com" },
  products: [
    { id: "P1", name: "Notebook", price: 2500, quantity: 1 },
    { id: "P2", name: "Mouse", price: 50, quantity: 2 }
  ],
  status: "pending"
};

console.log(calculateOrderTotal(order)); // Expected: 2600
```

<details>
<summary>Solution</summary>

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

### Exercise 1.2: Generics

Implement a generic search function:

```typescript
// TODO: Implement generic function that searches in array
function findItem<T>(items: T[], predicate: (item: T) => boolean): T | null {
  return null; // Implement
}

// Test
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
console.log(user?.name); // Expected: "Bob"
```

<details>
<summary>Solution</summary>

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

## Module 2: API Integration

### Exercise 2.1: Simple HTTP Client

Implement an HTTP client with retry:

```typescript
// TODO: Implement HTTP client with retry
class HttpClient {
  async get<T>(url: string, retries = 3): Promise<T> {
    // 1. Try fetch
    // 2. If fails and still has retries, wait and try again
    // 3. Use exponential backoff: 100ms, 200ms, 400ms...
    throw new Error("Implement");
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Test
const client = new HttpClient();
const data = await client.get("https://api.github.com/users/github");
console.log(data.login); // Expected: "github"
```

<details>
<summary>Solution</summary>

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
          throw error; // Last attempt failed
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

### Exercise 2.2: Data Parser

Implement a parser for multiple date formats:

```typescript
// TODO: Implement parser that accepts multiple formats
function parseDate(input: unknown): Date | null {
  // Accepts:
  // 1. ISO string: "2024-01-15T10:30:00Z"
  // 2. Timestamp in ms: 1705316400000
  // 3. Object { year, month, day }: { year: 2024, month: 1, day: 15 }
  // 4. null or undefined -> returns null
  return null; // Implement
}

// Tests
console.log(parseDate("2024-01-15T10:30:00Z")); // Valid Date
console.log(parseDate(1705316400000)); // Valid Date
console.log(parseDate({ year: 2024, month: 1, day: 15 })); // Valid Date
console.log(parseDate(null)); // null
console.log(parseDate("invalid")); // null
```

<details>
<summary>Solution</summary>

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

  // Timestamp in ms
  if (typeof input === "number") {
    const date = new Date(input);
    return isNaN(date.getTime()) ? null : date;
  }

  // Object { year, month, day }
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

## Module 3: WebSocket

### Exercise 3.1: WebSocket Client with Reconnection

Implement a WebSocket client with automatic reconnection:

```typescript
// TODO: Implement WS client with reconnection
class ReconnectingWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxAttempts = 5;

  connect(url: string) {
    // 1. Create WebSocket connection
    // 2. If closes, reconnect with exponential backoff
    // 3. Stop after maxAttempts
  }

  send(data: string) {
    // Send if connected, otherwise throw error
  }

  close() {
    // Close connection and stop reconnections
  }
}
```

<details>
<summary>Solution</summary>

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
      console.log("Connected!");
      this.reconnectAttempts = 0;
    });

    this.ws.addEventListener("close", () => {
      if (this.closed) return;

      this.reconnectAttempts++;
      if (this.reconnectAttempts <= this.maxAttempts) {
        const backoff = 1000 * Math.pow(2, this.reconnectAttempts - 1);
        console.log(`Reconnecting in ${backoff}ms...`);
        setTimeout(() => this.doConnect(url), backoff);
      } else {
        console.error("Max reconnections reached");
      }
    });
  }

  send(data: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
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

## Module 4: Rate Limiting

### Exercise 4.1: Implement Token Bucket

```typescript
// TODO: Implement Token Bucket algorithm
class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillRate: number, // tokens per second
    private refillInterval: number // ms
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async consume(tokens = 1): Promise<boolean> {
    // 1. Refill tokens based on elapsed time
    // 2. If has enough tokens, consume and return true
    // 3. Otherwise, return false
    return false; // Implement
  }

  private refill() {
    // Calculate tokens to add based on time
  }
}
```

<details>
<summary>Solution</summary>

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

## Module 5: Terminal Interface

### Exercise 5.1: Formatted Table

Implement a function that formats a table in ASCII:

```typescript
// TODO: Format array of objects as ASCII table
function formatTable<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[]
): string {
  // 1. Calculate width of each column
  // 2. Create header row
  // 3. Create data rows
  // 4. Return complete table
  return ""; // Implement
}

// Test
const users = [
  { name: "Alice", age: 30, city: "SP" },
  { name: "Bob", age: 25, city: "RJ" }
];

console.log(formatTable(users, ["name", "age", "city"]));
// Expected:
// NAME  | AGE | CITY |
// Alice | 30  | SP   |
// Bob   | 25  | RJ   |
```

<details>
<summary>Solution</summary>

```typescript
function formatTable<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[]
): string {
  // Calculate widths
  const widths = columns.map(col => {
    const header = String(col).length;
    const maxData = Math.max(...data.map(row =>
      String(row[col] ?? "").length
    ));
    return Math.max(header, maxData);
  });

  // Separator line
  const separator = widths.map(w => "-".repeat(w + 2)).join("+");

  // Header
  const header = columns.map((col, i) =>
    ` ${String(col).padEnd(widths[i])} `
  ).join("|");

  // Data rows
  const rows = data.map(row =>
    columns.map((col, i) =>
      ` ${String(row[col] ?? "").padEnd(widths[i])} `
    ).join("|")
  );

  return [header, separator, ...rows].join("\n");
}
```

</details>

---

## Module 6: Tests

### Exercise 6.1: Test with Mock

Write tests for a function that depends on an external API:

```typescript
// Code to test
async function getUserScore(userId: string): Promise<number> {
  const user = await fetchUser(userId);
  return calculateScore(user);
}

function fetchUser(id: string): Promise<User> {
  // Fetch from external API
}

function calculateScore(user: User): number {
  return user.posts.length * 10 + user.followers.length;
}

// TODO: Write test
describe("getUserScore", () => {
  it("should calculate score correctly", async () => {
    // Use mock for fetchUser
  });
});
```

<details>
<summary>Solution</summary>

```typescript
import { describe, it, expect, mock } from "bun:test";

describe("getUserScore", () => {
  it("should calculate score correctly", async () => {
    // Mock fetchUser
    const mockFetchUser = mock(async (id: string) => ({
      id,
      name: "Test User",
      posts: [{ id: "1" }, { id: "2" }],
      followers: [{ id: "a" }, { id: "b" }, { id: "c" }]
    }));

    // Replace original function
    // (in real code, would use dependency injection)

    const score = await getUserScore("user-123");

    // Score = 2 posts * 10 + 3 followers = 23
    expect(score).toBe(23);
    expect(mockFetchUser).toHaveBeenCalledWith("user-123");
  });
});
```

</details>

---

## Final Project: Mini Polymarket

### Objective

Create a simplified version of Polymarket Analyzer with:

1. **CLI** that accepts arguments
2. **API client** to fetch data
3. **Rate limiting** to respect limits
4. **Formatted output** in table

### Requirements

```typescript
// 1. CLI argument parsing
//    --market <id>     Specify market ID
//    --limit <n>       Limit markets (default: 10)
//    --json            Output as JSON
//    --help            Show help

// 2. Fetch markets from API
//    GET https://gamma-api.polymarket.com/markets

// 3. Implement rate limiting
//    Max 10 requests per 10 seconds

// 4. Formatted output
//    If --json: JSON string
//    Otherwise: ASCII table with name, price, volume

// 5. Error handling
//    Retry with exponential backoff
//    10 second timeout
//    Friendly messages
```

### Suggested Structure

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

### Hints

1. **Start simple** - First make it work, then refactor
2. **Use project modules** - `http.ts`, `parsers.ts` as reference
3. **Test incrementally** - Test each module separately
4. **Add logging** - To debug problems

---

## Final Project Solution

<details>
<summary>Complete Code</summary>

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

const limiter = new RateLimiter(10, 10000); // 10 req per 10s

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

    // Wait for next refill
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

## [ADVANCED] Module 7: Advanced Exercises

### Exercise 7.1: WebSocket Client with Intelligent Reconnection

**Level:** [ADVANCED] Advanced
**Prerequisites:** Chapters 03, 04
**Estimated time:** 1-2 hours

Implement a WebSocket client with adaptive reconnection based on success rate:

```typescript
// TODO: Implement AdaptiveWebSocketClient
interface ReconnectStrategy {
  getDelay(attempt: number): number;
  onSuccess(): void;
  onFailure(): void;
}

class AdaptiveReconnect implements ReconnectStrategy {
  // Exponential backoff adapted to success/failure history
  // - If many failures: increase delay more aggressively
  // - If many successes: reduce baseline delay
  // - Always with jitter to avoid thundering herd

  getDelay(attempt: number): number {
    // Implement
  }

  onSuccess(): void {
    // Reduce baseline delay if many consecutive successes
  }

  onFailure(): void {
    // Increase baseline delay if many consecutive failures
  }
}

class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;

  async connect(url: string, strategy: ReconnectStrategy): Promise<void> {
    // 1. Connect to WebSocket
    // 2. On failure, use strategy.getDelay() to wait
    // 3. Try to reconnect with backoff
    // 4. Report success/failure to strategy
  }
}

// Test
const strategy = new AdaptiveReconnect();
const client = new WebSocketClient();
await client.connect("wss://ws.example.com", strategy);
```

**Hints:**
- Keep history of last N results (success/failure)
- Use moving average to calculate success rate
- Adjust base delay dynamically

<details>
<summary>Partial Solution</summary>

```typescript
class AdaptiveReconnect implements ReconnectStrategy {
  private baseDelay = 500;
  private successCount = 0;
  private failureCount = 0;
  private history: boolean[] = [];

  getDelay(attempt: number): number {
    // Exponential backoff
    const backoff = Math.min(30000, 500 * Math.pow(2, attempt));

    // Adjust based on recent success rate
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

### Exercise 7.2: Resilient Data Normalizer

**Level:** [ADVANCED] Advanced
**Prerequisites:** Chapter 03
**Estimated time:** 1-2 hours

Implement a data normalizer that handles multiple evolving API formats:

```typescript
// TODO: Implement resilient normalizer
interface RawMarket {
  [key: string]: unknown;
}

type MarketField = {
  names: string[];  // All possible field names
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
      // Can be array, JSON string, or nested
      // Implement resilient extraction
    },
    required: true,
    defaultValue: []
  },
  volume24hr: {
    names: ["volume24hr", "volume24h", "volume_24h", "volumeUsd"],
    transform: (value) => typeof value === "string" ? parseFloat(value) : value,
    required: false
  },
  // ... add other fields
};

function normalizeMarket(raw: RawMarket): Record<string, unknown> | null {
  // 1. For each field in MARKET_SCHEMA
  // 2. Try to find value using any of the names
  // 3. Apply transformation if exists
  // 4. Validate required fields
  // 5. Return normalized object or null if invalid
}
```

**Hint:** Use generic function that tries multiple keys on the object.

---

### Exercise 7.3: Cache System with Invalidation

**Level:** [ADVANCED] Advanced
**Prerequisites:** Chapters 02, 03
**Estimated time:** 1-2 hours

Implement a cache system with multiple invalidation strategies:

```typescript
// TODO: Implement cache system
type CacheEntry<T> = {
  data: T;
  expiresAt: number;
  tags: string[];
  version: number;
};

class SmartCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  set(key: string, data: T, ttl: number, tags: string[]): void {
    // Implement with:
    // - TTL (time to live)
    // - Tags for group invalidation
    // - Versioning for stale-while-revalidate
  }

  get(key: string): T | null {
    // Implement:
    // - Return null if expired
    // - Mark as stale if close to expiring (< 10% TTL)
  }

  invalidate(tags: string[]): void {
    // Invalidate all entries with any of the tags
  }

  getStaleEntries(): CacheEntry<T>[] {
    // Return entries that are stale but not yet expired
  }

  async getOrFetch(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number,
    tags: string[]
  ): Promise<T> {
    // Implement stale-while-revalidate pattern:
    // 1. If cache fresh, return
    // 2. If stale, return stale BUT async refresh
    // 3. If miss, fetch and cache
  }
}

// Practical usage
const cache = new SmartCache<MarketInfo[]>();

// Fetch (with stale-while-revalidate)
const markets = await cache.getOrFetch(
  "markets:active",
  () => fetchMarkets(10),
  60_000,  // 1 minute TTL
  ["markets", "gamma"]
);

// Invalidation by tag
cache.invalidate(["gamma"]);  // Invalidate everything tagged with "gamma"
```

---

## [MASTER] Module 8: Master Challenges

### Exercise 8.1: Complete Mini Polymarket

**Level:** [MASTER] Master
**Prerequisites:** All chapters
**Estimated time:** 3-5 hours

Build a **mini clone** of Polymarket Analyzer with:

1. **Complete CLI** with multiple commands:
   - `markets` - List markets
   - `market <id>` - Details of a market
   - `watch <id>` - Real-time watch mode (WebSocket)
   - `export <id>` - Export JSON snapshot

2. **Rate limiting** configurable per endpoint

3. **WebSocket** with automatic reconnection

4. **TUI** (optional) or formatted table output

5. **Configuration** via config file

6. **Structured logs**

**Minimum requirements:**
- [ ] At least 3 functional commands
- [ ] Robust error handling
- [ ] Tests for critical functions
- [ ] README with usage instructions

**Success criteria:**
- Runs without crash for 10 minutes
- Recovers from network failures
- Respects Polymarket rate limits

**Deliverables:**
- Code in Git repository
- Documented README
- 1 usage example for each command

<details>
<summary>Implementation Hints</summary>

1. **Start small**: Implement 1 command at a time
2. **Use project code** as reference (but don't copy!)
3. **Test locally**: `bun --bun run src/index.ts markets`
4. **Iterate**: Add features gradually
5. **Document**: README is as important as code

</details>

---

### Exercise 8.2: Real-Time Alert System

**Level:** [MASTER] Master
**Prerequisites:** Chapters 04, 05
**Estimated time:** 2-4 hours

Implement an alert system that notifies users about significant events:

```typescript
// TODO: Implement alert system
interface AlertRule {
  id: string;
  name: string;
  condition: (update: MarketUpdate) => boolean;
  message: (update: MarketUpdate) => string;
  cooldown: number;  // ms between notifications
  enabled: boolean;
}

class AlertSystem {
  private rules: AlertRule[] = [];
  private lastAlerted = new Map<string, number>();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  onUpdate(update: MarketUpdate): void {
    // For each enabled rule:
    // 1. Test condition
    // 2. Check cooldown
    // 3. Fire alert if applicable
    // 4. Record alert timestamp
  }
}

// Example rules:
const priceChangeAlert: AlertRule = {
  id: "price-spike",
  name: "Sudden Price Change",
  condition: (update) => {
    // Alert if price changed > 5% in 1 minute
  },
  message: (update) => `ALERT: ${update.question}: ${update.priceChange}%`,
  cooldown: 60_000,  // 1 minute between alerts
  enabled: true
};

const volumeAlert: AlertRule = {
  id: "volume-surge",
  name: "Volume Increase",
  condition: (update) => {
    // Alert if 24h volume increased > 50%
  },
  message: (update) => `VOLUME: ${update.question}: Volume ${update.volumeChange}%`,
  cooldown: 300_000,  // 5 minutes
  enabled: true
};
```

**Extra features (master):**
- [ ] Rule persistence (JSON/YAML)
- [ ] UI to create/edit rules
- [ ] Multi-channel notifications (console, email, Slack)
- [ ] History of triggered alerts
- [ ] False positive statistics

---

### Exercise 8.3: Performance Optimizer

**Level:** [MASTER] Master
**Prerequisites:** All chapters + profiling
**Estimated time:** 2-4 hours

Analyze and optimize Polymarket Analyzer for:

**Goals:**
1. Startup time < 2 seconds
2. Memory usage < 80MB
3. TUI rendering < 100ms
4. Zero memory leaks

**Tools:**
```bash
# CPU Profile
bun --prof run src/index.js

# Memory Profile
node --heap-prof run src/index.js

# Bundle analysis
bun build src/index.ts --analyze
```

**Typical optimizations:**
- Defer loading of heavy modules
- Pool of reusable HTTP connections
- Debounce/throttle TUI updates
- Lazy loading of non-critical data
- Cache parsing results

**Deliverables:**
1. Before/after report
2. Benchmarks measuring improvements
3. PR with applied optimizations

<details>
<summary>Optimization Hints</summary>

**CPU Profile:**
- "Hot" functions in red = optimization candidates
- Look for nested loops, JSON.parse of large data

**Memory Profile:**
- Constantly growing heap = memory leak
- Look for unremoved event listeners, infinite caches

**TUI Performance:**
- Render only what changed (not entire screen)
- Use `screen.render()` only when necessary
- Avoid allocations in rendering hot path

</details>

---

## Next Steps After Completion

1. **Refactor** - Apply DRY, SRP principles
2. **Add tests** - >80% coverage
3. **Improve output** - Colors, progress bars
4. **Add features** - WebSocket, history
5. **Document** - README, API docs

---

**Congratulations for making it this far!**

You now have practical knowledge of:
- [DONE] Advanced TypeScript
- [DONE] API Integration
- [DONE] WebSocket and real-time
- [DONE] Rate limiting
- [DONE] Terminal interface
- [DONE] Error handling
- [DONE] Testing strategies

Keep practicing and building!

---

**Next Chapter:** Next Steps and Improvements

[Continue to Chapter 9](./09-next-steps.md)

---

**Version:** 1.0.0
**Last Updated:** January 2026
