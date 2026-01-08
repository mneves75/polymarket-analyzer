# Chapter 07: Testing Strategies

> **"Tests don't guarantee there are no bugs, but they allow you to sleep peacefully knowing where to look for them."**
> — Anonymous

---

## 1. Introduction to Testing

### 1.1 Why Test?

```
WITHOUT TESTS:
────────────────────────────────────────────────────────────
Code -> Production -> Bug in production -> Angry user
  OK       FAIL            CRASH              ANGRY

WITH TESTS:
────────────────────────────────────────────────────────────
Code -> Tests -> Bug found -> Fixed -> Production OK
  OK      OK       BUG        FIX       HAPPY
```

### 1.1 Types of Tests

```
┌─────────────────────────────────────────────────────────────┐
│                    TEST PYRAMID                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ▲                                         │
│                   / \     E2E Tests                         │
│                  /───\    (Few, slow)                        │
│                 /     \                                      │
│                /───────\ Integration Tests                   │
│               /─────────\ (Some, medium)                     │
│              /───────────\                                   │
│             /─────────────\ Unit Tests                       │
│            /───────────────\(Many, fast)                     │
│           /─────────────────\                                │
│                                                              │
│  More unit tests, fewer E2E                                  │
│  Fast tests -> Fast feedback -> Fast development             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Bun Test Runner

### 2.1 What is Bun Test?

**Bun Test** is Bun's built-in test runner, similar to Jest or Vitest, but faster.

**Features:**
- Faster than Jest/Vitest
- Built-in (no installation needed)
- Same syntax as Jest
- Watch mode
- Integrated coverage

### 2.2 Writing Your First Test

```typescript
// src/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// tests/math.test.ts
import { describe, it, expect } from "bun:test";
import { add } from "../src/math";

describe("add", () => {
  it("adds two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("adds negative numbers", () => {
    expect(add(-2, -3)).toBe(-5);
  });

  it("adds zero", () => {
    expect(add(0, 0)).toBe(0);
  });
});
```

**Run:**
```bash
bun test tests/math.test.ts
```

### 2.3 Common Matchers

```typescript
// Equality
expect(value).toBe(5);              // ===
expect(value).toEqual({ a: 1 });    // deep equality

// Truthy/Falsy
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Numbers
expect(value).toBeGreaterThan(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.1, 2);   // 2 decimal places

// Strings
expect(text).toMatch(/regex/);
expect(text).toContain("substring");

// Arrays
expect(array).toContain(item);
expect(array).toHaveLength(3);

// Exceptions
expect(() => func()).toThrow();
expect(() => func()).toThrow("message");
```

---

## 3. Tests in the Polymarket Project

### 3.1 Test Structure

```
tests/
├── api.test.ts       # API normalization tests
├── cli.test.ts       # CLI smoke tests
├── parsers.test.ts   # Data parsing tests
└── ws.test.ts        # WebSocket tests
```

### 3.2 Market Normalization Test

See `tests/api.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { normalizeMarket } from "../src/api";

const market = {
  conditionId: "COND1",
  clobTokenIds: ["T1", "T2"],
  question: "Will it rain?"
};

describe("normalizeMarket", () => {
  it("defaults outcomes when missing", () => {
    const normalized = normalizeMarket(market, undefined);
    expect(normalized?.outcomes).toEqual(["YES", "NO"]);
  });

  it("parses outcomes and clobTokenIds from json strings", () => {
    const marketWithStrings = {
      conditionId: "COND2",
      clobTokenIds: "[\"A\",\"B\"]",  // JSON String!
      outcomes: "[\"Yes\",\"No\"]"    // JSON String!
    };
    const normalized = normalizeMarket(marketWithStrings, undefined);
    expect(normalized?.clobTokenIds).toEqual(["A", "B"]);
    expect(normalized?.outcomes).toEqual(["Yes", "No"]);
  });
});
```

**What's Being Tested:**

1. **Default outcomes** - If API doesn't return outcomes, uses ["YES", "NO"]
2. **JSON string parsing** - API can return array or JSON string

### 3.3 Parser Tests

See `tests/parsers.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { normalizeOrderbook, extractHistory } from "../src/parsers";

const book = {
  bids: [["0.4", "100"], ["0.39", "50"]],  // String numbers!
  asks: [["0.41", "120"]],
  min_order_size: "1",
  tick_size: "0.01",
  neg_risk: false
};

describe("parsers", () => {
  it("normalizes orderbook", () => {
    const ob = normalizeOrderbook(book);

    expect(ob.bids.length).toBe(2);
    expect(ob.asks.length).toBe(1);
    expect(ob.tickSize).toBeCloseTo(0.01);
  });

  it("extracts history points", () => {
    const history = { history: [{ p: "0.1" }, { p: "0.2" }] };
    const series = extractHistory(history);

    expect(series).toEqual([0.1, 0.2]);
  });
});
```

**What's Being Tested:**

1. **Order book normalization** - 2D arrays with strings
2. **History extraction** - "p" field for "price"

---

## 4. Writing Good Tests

### 4.1 AAA Tests (Arrange-Act-Assert)

```typescript
describe("functionX", () => {
  it("does X when Y", () => {
    // ARRANGE - Set up the scenario
    const input = { value: 10 };
    const expected = 20;

    // ACT - Execute the code under test
    const result = functionX(input);

    // ASSERT - Verify the result
    expect(result).toBe(expected);
  });
});
```

### 4.2 Isolated Tests

```typescript
// BAD - Tests depend on each other
let counter = 0;

it("increments", () => {
  counter++;
  expect(counter).toBe(1);
});

it("increments again", () => {
  counter++;
  expect(counter).toBe(2);  // Fails if run alone!
});

// GOOD - Each test is independent
it("increments from 0 to 1", () => {
  const c = new Counter(0);
  c.increment();
  expect(c.value).toBe(1);
});

it("increments from 5 to 6", () => {
  const c = new Counter(5);
  c.increment();
  expect(c.value).toBe(6);
});
```

### 4.3 Descriptive Names

```typescript
// BAD
it("works", () => { });

// GOOD
it("returns error when conditionId is missing", () => { });

// BETTER (should-style)
it("should return error when conditionId is missing", () => { });
```

---

## 5. Mocks and Spies

### 5.1 Function Mocks

```typescript
import { describe, expect, it, mock } from "bun:test";

describe("with mock", () => {
  it("mocks external function", () => {
    // Mock fetch
    const mockFetch = mock(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: "test" })
    }));

    // Use mock
    const result = await fetchData();

    expect(result).toEqual({ data: "test" });
    expect(mockFetch).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
```

### 5.2 Function Spies

```typescript
it("spy calls original function", () => {
  const spy = mock(() => originalFunction);

  // Spy calls original function
  spy.mockImplementation((...args) => originalFunction(...args));

  const result = spy("argument");

  expect(spy).toHaveBeenCalledWith("argument");
});
```

---

## 6. Integration Tests

### 6.1 Testing API Integration

```typescript
describe("API Integration", () => {
  it("fetches and normalizes real market", async () => {
    // Fetch real data from API
    const market = await fetchMarketBySlug("trump-wins-2024");

    // Normalize
    const normalized = normalizeMarket(market, undefined);

    // Verify expected fields
    expect(normalized).toBeDefined();
    expect(normalized?.conditionId).toBeDefined();
    expect(normalized?.clobTokenIds.length).toBeGreaterThan(0);
  });
});
```

### 6.2 Testing WebSocket

```typescript
describe("WebSocket Integration", () => {
  it("connects and receives messages", async (done) => {
    const wsClient = connectMarketWs(["TOKEN_ID"], {
      onUpdate: (update) => {
        expect(update.assetId).toBe("TOKEN_ID");
        wsClient.close();
        done();
      }
    });
  });
});
```

---

## 7. Coverage

### 7.1 Generating Coverage Report

```bash
# With coverage
bun test --coverage

# Output:
# src/api.ts: 85% coverage (45/53 lines)
# src/parsers.ts: 92% coverage (24/26 lines)
# src/ws.ts: 67% coverage (120/180 lines)
```

### 7.2 Coverage Goals

```
┌─────────────────────────────────────────────────────────────┐
│  EXCELLENT:  > 80% coverage                                  │
│  GOOD:       60-80% coverage                                 │
│  ACCEPTABLE: 40-60% coverage                                 │
│  POOR:       < 40% coverage                                  │
└─────────────────────────────────────────────────────────────┘
```

**Don't aim for 100% coverage!** UI code, errors, edge cases are hard to test.

---

## 8. Practical Exercises

### Exercise 1: Filter Test

```typescript
// Code
function filterMarkets(markets: MarketInfo[], filter: string): MarketInfo[] {
  return markets.filter(m =>
    m.question?.toLowerCase().includes(filter.toLowerCase())
  );
}

// Test
describe("filterMarkets", () => {
  it("should filter by name", () => {
    // Write test
  });

  it("should be case-insensitive", () => {
    // Write test
  });

  it("should return empty if nothing matches", () => {
    // Write test
  });
});
```

### Exercise 2: Spread Calculator Test

```typescript
// Code
function calculateSpread(bid: number, ask: number): number {
  return ((ask - bid) / ask) * 100;
}

// Test
describe("calculateSpread", () => {
  // Write tests for:
  // - normal spread
  // - zero spread
  // - bid or ask zero or negative
});
```

### Exercise 3: Test with Mock

```typescript
// Test that mocks fetchJson
describe("with mock", () => {
  it("should use fallback if primary fails", async () => {
    // Mock fetchJson to fail on first call
    // and succeed on second
  });
});
```

---

## 9. Checkpoint

**Test your knowledge before continuing:**

1. **What's the difference between unit test, integration test, and E2E test?**
   - a) There's no difference, they're synonyms
   - b) Unit tests isolated functions, integration tests multiple components together, E2E tests the complete system
   - c) Unit is slow, integration is fast, E2E doesn't exist

   <details>
   <summary>Answer</summary>
   **b)** Unit test: tests an isolated function/class (fast). Integration test: tests multiple integrated components (medium). E2E test: tests the complete system as user would use it (slow).
   </details>

2. **What is the AAA pattern in tests?**
   - a) Always Act Automatically
   - b) Arrange-Act-Assert (Organize-Act-Verify)
   - c) Automatic Application Architecture

   <details>
   <summary>Answer</summary>
   **b)** Arrange: prepare data and mocks. Act: execute the function being tested. Assert: verify the result. Example: `const arr = [1,2,3]; const result = sum(arr); expect(result).toBe(6);`
   </details>

3. **When should you use mocks in tests?**
   - a) Always, in all tests
   - b) Never, always use real dependencies
   - c) When you need to isolate code from slow or unpredictable external dependencies

   <details>
   <summary>Answer</summary>
   **c)** Use mocks for APIs, databases, time, etc. that are slow or unpredictable. Don't mock internal project code (that makes tests fragile).
   </details>

4. **What's a reasonable coverage goal?**
   - a) 100% always
   - b) 80% for business code, lower for UI/boilerplate
   - c) 10% is enough

   <details>
   <summary>Answer</summary>
   **b)** 100% is impractical (UI code is hard to test). 80% is a good balance. Focus on critical business code, not on trivial getters/setters.
   </details>

5. **What is a "flaky" test?**
   - a) A test that fails randomly without code change
   - b) A test that takes too long to run
   - c) A test that's written ugly

   <details>
   <summary>Answer</summary>
   **a)** A flaky test fails sometimes and passes other times without code change. Common causes: time dependency, race conditions, external dependencies, shared data between tests.
   </details>

**Congratulations!** If you answered correctly, you're ready for the next chapter.

---

## 10. Common Pitfalls

### Pitfall 1: Tests That Depend on Order

**Problem:** Tests work when run isolated but fail when run together.

```typescript
// BAD - Test depends on global state
describe("user management", () => {
  it("creates user", () => {
    createUser("alice");
    expect(getUserCount()).toBe(1);  // Assumes previous count = 0
  });

  it("deletes user", () => {
    deleteUser("alice");
    expect(getUserCount()).toBe(0);  // Fails if "creates user" didn't run first
  });
});
// Problem: If you run only "deletes user", it fails because alice doesn't exist

// GOOD - Each test is independent
describe("user management", () => {
  beforeEach(() => {
    // Clear state before EACH test
    clearAllUsers();
  });

  it("creates user", () => {
    createUser("alice");
    expect(getUserCount()).toBe(1);
  });

  it("deletes user", () => {
    createUser("alice");  // Create in the test itself
    deleteUser("alice");
    expect(getUserCount()).toBe(0);
  }
});
```

---

### Pitfall 2: Fragile Tests with Mocks

**Problem:** Internal implementation change breaks tests even if behavior didn't change.

```typescript
// BAD - Mocks internal implementation
import { fetchData } from "./api";

test("fetches data", async () => {
  const spy = mock(fetchData);  // Mocks the function being tested!
  spy.mockResolvedValue({ data: "test" });
  // ...
});

// GOOD - Mock external dependencies only
test("fetches data from API", async () => {
  // Mock fetch (external dependency), not the project function
  global.fetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: "test" })
  }));

  const result = await fetchData();
  expect(result).toEqual({ data: "test" });
});
```

---

### Pitfall 3: Tests That Are Too Slow

**Problem:** Test suite takes 10+ minutes, nobody wants to run it.

```typescript
// BAD - Slow tests
test("integration test", async () => {
  // 1. Create real database
  await db.create();

  // 2. Make 100 real HTTP requests
  for (let i = 0; i < 100; i++) {
    await fetch(`https://api.example.com/item/${i}`);
  }

  // 3. Wait 5 seconds for processing
  await sleep(5000);

  // Test takes 30 seconds!
});

// GOOD - Fast tests with mocks
test("unit test", () => {
  // Everything is mocked, runs in <10ms
  const mockDb = createMockDatabase();
  const mockFetch = mockFetch();

  const service = new Service(mockDb, mockFetch);
  service.processItems(100);

  expect(mockFetch).toHaveBeenCalledTimes(100);
});
```

**General rule:** Entire suite should run in <30 seconds.

---

### Pitfall 4: Vague Assertions

**Problem:** Tests pass but don't test what they should.

```typescript
// BAD - Very vague assertion
test("parses market data", () => {
  const result = parseMarket(apiResponse);
  expect(result).toBeTruthy();  // Passes if result isn't null/undefined
  // Doesn't verify if data is correct!
});

// GOOD - Specific assertions
test("parses market data", () => {
  const result = parseMarket(apiResponse);
  expect(result).toEqual({
    conditionId: "0x123...",
    question: "Trump will win?",
    outcomes: ["YES", "NO"],
    clobTokenIds: ["0xabc...", "0xdef..."]
  });
});
```

---

### Pitfall 5: Tests That Test the Framework

**Problem:** Testing that the framework works, not your code.

```typescript
// BAD - Tests that TypeScript compiles
test("MarketInfo type exists", () => {
  const market: MarketInfo = {};
  expect(market).toBeDefined();
  // This doesn't test ANYTHING of your code!
});

// GOOD - Tests your code
test("normalizes market data", () => {
  const rawMarket = {
    condition_id: "0x123",  // underscore
    outcomes: '["YES","NO"]'  // JSON string
  };
  const normalized = normalizeMarket(rawMarket);
  expect(normalized.conditionId).toBe("0x123");  // camelCase
  expect(normalized.outcomes).toEqual(["YES", "NO"]);  // array
});
```

---

### Pitfall 6: Ignoring Error Branches

**Problem:** Testing only the happy path, ignoring errors.

```typescript
// BAD - Tests only success
test("calculates spread", () => {
  expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
  // What if bid/ask is zero? Negative? Undefined?
});

// GOOD - Tests all cases
describe("calcSpread", () => {
  it("calculates normal spread", () => {
    expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
  });

  it("returns 0 for equal prices", () => {
    expect(calcSpread(0.60, 0.60)).toBe(0);
  });

  it("throws on zero ask", () => {
    expect(() => calcSpread(0.50, 0)).toThrow("Ask cannot be zero");
  });

  it("throws on negative prices", () => {
    expect(() => calcSpread(-0.50, 0.60)).toThrow("Price cannot be negative");
  });
});
```

---

### Pitfall 7: Hardcoded Complex Data

**Problem:** Test data so complex it's hard to maintain.

```typescript
// BAD - Huge data copied from production
test("processes market", () => {
  const hugeMarket = {
    // 100 lines of real data copied from API
    id: "0x123abc...",
    // ...99 more lines
  };
  // Hard to know what's being tested
});

// GOOD - Minimal and focused data
test("processes market question", () => {
  const minimalMarket = {
    question: "Will it rain?",
    outcomes: ["YES", "NO"]
  };
  const result = processQuestion(minimalMarket);
  expect(result).toBe("WILL IT RAIN?");  // Tests specific transformation
});
```

---

## 11. Troubleshooting

### Issue: Test Passes Locally But Fails in CI

**Symptoms:**
- `bun test` works on your machine
- CI fails with same test

**Diagnosis:**
1. Environment difference (Node vs Bun)
2. Timezone/time difference
3. Local files not committed
4. Race condition more likely in CI

**Solutions:**

```typescript
// 1. Use mocks for environment dependencies
beforeEach(() => {
  // Mock timezone, locale, etc.
  mockTimeZone("UTC");
});

// 2. Don't depend on file system
test("reads config", () => {
  // BAD - depends on local file
  const config = readConfig("./config.json");

  // GOOD - mock fs or use object
  const mockFs = { readFile: () => JSON.stringify({ key: "value" }) };
});

// 3. Add retry for flaky tests
test("flaky test", async () => {
  // Bun doesn't have native retry, so:
  let attempts = 0;
  while (attempts < 3) {
    try {
      await runTest();
      return;  // Success
    } catch {
      attempts++;
      if (attempts >= 3) throw;
    }
  }
});

// 4. Use appropriate timeouts
test("slow operation", async () => {
  // CI can be slower
  const result = await slowOperation(10000);  // 10s timeout
}, { timeout: 15000 });  // 15s timeout for the test
```

---

### Issue: Mock Doesn't Work

**Symptoms:**
- Mock created but real function is still called
- `expect().toHaveBeenCalled()` fails

**Diagnosis:**
1. Wrong import (mocked function is not the same instance)
2. Mock created after import
3. Function can't be mocked (builtin, etc.)

**Solutions:**

```typescript
// BAD - Imports before mock
import { fetchData } from "./api";
mock(fetchData);  // Too late!

// GOOD - Dynamic import inside test
test("with mock", async () => {
  const { fetchData } = await import("./api");
  mock(fetchData);
  // Now it works
});

// BETTER - Use dependency injection
class Service {
  constructor(private fetcher: Fetcher = new RealFetcher()) {}
}

test("with injection", () => {
  const mockFetcher = createMockFetcher();
  const service = new Service(mockFetcher);  // Inject mock
  // Now you control the dependency
});
```

---

### Issue: Low Coverage Won't Go Up

**Symptoms:**
- Code changed but coverage stays at 0%

**Diagnosis:**
1. Test files not found
2. Wrong name pattern
3. Code executed but not measured

**Solutions:**

```bash
# 1. Check file pattern
bun test --coverage "**/*.test.ts"

# 2. Check that tests are running
bun test --verbose

# 3. In package.json
{
  "scripts": {
    "test": "bun test **/*.test.ts --coverage"
  }
}

# 4. Check coverage report
bun test --coverage
# Should see something like:
# src/api.ts     85% (34/40 lines)
# src/http.ts    92% (48/52 lines)
# src/tui.ts     45% (200/444 lines)  <- Low coverage in UI is common
```

---

### Issue: Test Says "Cannot find module"

**Symptoms:**
```
Error: Cannot find module "./src/api"
```

**Diagnosis:**
1. Wrong relative path
2. Test running from wrong directory
3. tsconfig not configured

**Solutions:**

```bash
# 1. Check relative path
# If test is in tests/api.test.ts and code in src/api.ts
import { fetchMarkets } from "../src/api";  # Go up one level

# 2. Use absolute path if confused
import { fetchMarkets } from "${import.meta.dir}/../src/api";

# 3. Configure tsconfig paths
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Now you can use:
import { fetchMarkets } from "@/api";
```

---

### Issue: Test Passes But Code Is Broken

**Symptoms:**
- Test passes
- Code clearly buggy when inspected

**Diagnosis:**
Test isn't covering the bug.

**Solutions:**

```typescript
// BAD - Test checks nothing
test("formatPrice", () => {
  formatPrice(0.12345);
  // No assert! Test always passes even if function returns garbage
});

// GOOD - Test verifies result
test("formatPrice", () => {
  const result = formatPrice(0.12345);
  expect(result).toBe("12.35c");  // Verifies correct formatting
});

// BETTER - Tests edge cases
describe("formatPrice", () => {
  it("formats normal price", () => {
    expect(formatPrice(0.12345)).toBe("12.35c");
  });

  it("handles zero", () => {
    expect(formatPrice(0)).toBe("0c");
  });

  it("handles very small", () => {
    expect(formatPrice(0.001)).toBe("0.1c");
  });

  it("rounds correctly", () => {
    expect(formatPrice(0.999)).toBe("99.9c");  // Not 100c!
  });
});
```

---

## 12. Design Decisions

### Decision 1: Why Bun Test Instead of Jest/Vitest?

**Alternatives:**

| Framework | Setup | Speed | Compatibility | Size |
|-----------|-------|-------|---------------|------|
| **Jest** | npm install | Slow | Maximum | Large |
| **Vitest** | npm install | Fast | Good | Medium |
| **Bun Test** | Zero (built-in) | Fastest | Good | Zero |

**Why Bun Test was chosen:**

1. **Speed:** 100x faster than Jest
2. **Zero setup:** Already comes with Bun, no installation needed
3. **Compatibility:** Project already uses Bun
4. **Concurrency:** Runs tests in parallel by default
5. **Snapshot testing:** Supports snapshots like Jest
6. **Watch mode:** `bun test --watch` for development

**Performance comparison (artificial):**
```bash
# Jest (1000 tests)
jest                               12.4s user 3.2s system

# Vitest (1000 tests)
vitest                              4.1s user 1.1s system

# Bun Test (1000 tests)
bun test                            1.2s user 0.3s system

# Bun is ~10x faster than Vitest, ~100x faster than Jest
```

**When to use alternatives:**
- **Jest:** Legacy Node.js project already using Jest
- **Vitest:** Vite + React/Next.js project
- **Bun Test:** New Bun project (our case)

---

### Decision 2: Integration Tests with Real APIs or Mocks?

**Strategy:**

| Test Type | Uses | When |
|-----------|------|------|
| **Unit** | 100% mocks | Always |
| **Integration** | Real APIs if possible | When API is stable and fast |
| **E2E** | Always real APIs | Always |

**Why this strategy:**

1. **Unit tests (100% mocks):**
   - Fast (<1ms per test)
   - Isolated (doesn't depend on internet)
   - Repeatable (always same result)

```typescript
// Unit test with mocks
test("fetchMarkets parses response", () => {
  const mockFetch = mock(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([{ id: "1", question: "Test?" }])
  }));

  const markets = fetchMarkets(10);
  expect(markets).toHaveLength(1);
  expect(markets[0].question).toBe("Test?");
});
```

2. **Integration tests (real APIs when possible):**
   - Tests real integration with Polymarket API
   - More reliable than mocks
   - Slower (100-500ms per test)

```typescript
// Integration test with real API
test("integration: fetch real Polymarket markets", async () => {
  // If API is available, use real
  // If not, use recorded mock
  const markets = await fetchMarkets(5);

  expect(markets.length).toBeGreaterThan(0);
  expect(markets[0]).toHaveProperty("question");
  expect(markets[0]).toHaveProperty("conditionId");
}, { timeout: 5000 });  // 5s timeout
```

3. **E2E tests (always real APIs):**
   - Tests complete flow
   - Slower (1-10s per test)
   - Fewer tests, but more valuable

```typescript
// E2E test: complete flow
test("E2E: user views market in TUI", async () => {
  // 1. Start application
  // 2. Connect real WebSocket
  // 3. Send keyboard commands
  // 4. Verify terminal output

  // Don't mock anything! Real flow.
}, { timeout: 30000 });
```

---

### Decision 3: Coverage Target: 80%, 90%, or 100%?

**Goals:**

| Coverage | Goal | Reason |
|----------|------|--------|
| **100%** | No | Impractical, bad cost/benefit |
| **90%** | Optional | For critical code only |
| **80%** | Yes | Good balance between quality and effort |

**Why 80%:**

1. **UI code is hard to test:**
   - TUI rendering requires complex visual tests
   - Relative layout is hard to assert
   - Event handlers need complex setup

2. **Type safety already prevents many bugs:**
   - TypeScript catches errors at compile time
   - Don't need to test if type is correct

3. **Focus on critical code:**
   - API layer: 90%+ coverage
   - Business logic: 85%+ coverage
   - UI/rendering: 60%+ coverage acceptable

**Example coverage report:**
```
File           | Statements | Branch | Functions | Lines |
---------------|------------|--------|-----------|-------|
All files      |    82.34   |  75.12 |    86.21  | 83.45 |
 src/api.ts    |    94.12   |  90.00 |    100.00 | 94.44 |
 src/http.ts   |    89.47   |  85.71 |     90.00 | 90.00 |
 src/rateLimiter.ts | 100.00 | 100.00 |    100.00 | 100.00 |
 src/tui.ts    |    65.23   |  55.00 |     70.00 | 66.67 |
 src/utils.ts  |    78.95   |  70.00 |     80.00 | 80.00 |

Legend: >=80% target, 60-79% acceptable, <60% needs work
```

---

### Decision 4: TDD or Test-After?

**Approaches:**

| Method | Description | When to use |
|--------|-------------|-------------|
| **TDD** | Write test before code | New code, APIs |
| **Test-After** | Write test after code | Bug fixes, existing code |
| **Test-During** | Write test while developing | Refactoring |

**What we do in practice:**

1. **New code (TDD ideal):**
```typescript
// 1. Write failing test
test("calculates spread", () => {
  expect(calcSpread(0.60, 0.61)).toBeCloseTo(1.64, 2);
});

// 2. Run test (fails)
// bun test -> FAIL: calcSpread is not defined

// 3. Implement minimum to pass
function calcSpread(bid: number, ask: number): number {
  return ((ask - bid) / ask) * 100;
}

// 4. Test passes!
// bun test -> PASS
```

2. **Existing code (Test-After):**
```typescript
// Code already exists, add tests afterwards
// Tests as protection against future regressions
test("existing normalizeMarket function", () => {
  // ...
});
```

3. **Bug fixes (Regression test):**
```typescript
// 1. Bug report: "normalizeMarket fails with empty outcomes"
// 2. Write test that reproduces bug
test("handles empty outcomes", () => {
  const market = { outcomes: [] };
  expect(() => normalizeMarket(market)).not.toThrow();
});

// 3. Fix bug
// 4. Test passes and prevents regression
```

---

## 13. Further Reading

### Official Documentation

- **Bun Test Documentation**: https://bun.sh/docs/test
- **Bun Test Mocking**: https://bun.sh/docs/test/mocking
- **Testing Best Practices**: https://github.com/goldbergyoni/javascript-testing-best-practices

### Books

- **Test-Driven Development** (Kent Beck) - The classic TDD book
- **Working Effectively with Legacy Code** (Michael Feathers) - Testing existing code
- **xUnit Test Patterns** (Gerard Meszaros) - Test patterns

### Articles

- **The Bulletproof Test Suite**: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Testing Philosophy**: https://martinfowler.com/bliki/TestPyramid.html
- **Why Most Unit Testing is Waste**: https://www.methodsandtools.com/archive/archivearchive.aspx?aid=79

### Videos

- **Testing JavaScript** (Kent C. Dodds) - YouTube
- **Test-Driven Development** (Kent Beck) - Talks

### Tools

- **Istanbul/NYC** (Coverage): `bun install -g c8` (already built-in to Bun)
- **MSW** (Mock Service Worker): For mocking APIs
- **Faker** (Fake data): `bun add faker` to generate test data

### Community

- **Reddit**: r/javascript, r/testing
- **Discord**: Bun, Jest servers

---

## 14. Summary

- **Unit tests** = Fast, isolated, many
- **Integration tests** = Medium, real, some
- **E2E tests** = Slow, complete, few
- **Bun test** = Built-in runner, fast
- **AAA** = Arrange-Act-Assert pattern
- **Mocks** = Simulate external dependencies
- **Coverage** = % of tested code (goal: >80%)

---

**Next Chapter:** Complete Practical Exercises

[Continue to Chapter 8](./08-complete-exercises.md)

---

**Version:** 1.0.0
**Last Updated:** January 2026
