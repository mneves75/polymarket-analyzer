# Chapter 06: Error Handling and Rate Limiting

> **"It's not a matter of if something will go wrong, but WHEN it will go wrong."**
> — Murphy's Law for Programmers

---

## 1. Introduction to Error Handling

### 1.1 Why is Error Handling Important?

**Distributed systems fail.**

```
BEST CASE:
------------------------------------------------------------
Client -> API -> Data
  OK      OK      OK

REAL CASE:
------------------------------------------------------------
Client -> API (fails!) -> Data
  FAIL    FAIL           FAIL

Possible failures:
- API is down
- Network timeout
- Rate limit exceeded
- Malformed data
- CORS blocked
- SSL expired
```

### 1.2 Pillars of Resilience

```
+-------------------------------------------------------------+
|  RESILIENCE = System recovers from failures                 |
+-------------------------------------------------------------+
|                                                             |
|  1. RETRY          Tries again after failure                |
|  2. TIMEOUT        Does not wait forever                    |
|  3. FALLBACK       Uses alternative if primary fails        |
|  4. CIRCUIT BREAKER Stops trying if failing too much        |
|  5. RATE LIMIT     Respects server limits                   |
|  6. GRACEFUL DEGRADATION Works even with errors             |
|                                                             |
+-------------------------------------------------------------+
```

---

## 2. Error Handling in Code

### 2.1 Try-Catch-Finally

```typescript
// Basic structure
try {
  // Code that may fail
  const data = await fetch(url);
  return await data.json();
} catch (error) {
  // Handle error
  console.error("Failed to fetch data:", error);
  return null;  // Default value
} finally {
  // Always executes (success or error)
  console.log("Request finished");
}
```

### 2.2 Types of Errors

```typescript
// Network error (fetch failed)
try {
  const res = await fetch(url);
} catch (err) {
  if (err instanceof TypeError) {
    // Network error: no connection, DNS failed, etc.
    console.error("Network error:", err.message);
  }
}

// HTTP error (response with 4xx or 5xx status)
const res = await fetch(url);
if (!res.ok) {
  // res.status: 400, 401, 403, 404, 429, 500, 502, etc.
  throw new Error(`HTTP ${res.status}: ${res.statusText}`);
}

// Parsing error (invalid JSON)
try {
  const data = JSON.parse(jsonString);
} catch (err) {
  // SyntaxError if JSON is malformed
  console.error("Invalid JSON:", err);
}
```

### 2.3 Retry with Exponential Backoff

See `src/http.ts:42-77`:

```typescript
async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { retries = 2 } = options;
  let attempt = 0;

  while (true) {
    try {
      // Attempt request
      const res = await fetch(url, { ... });

      if (!res.ok) {
        const text = await res.text();

        // Check if should retry
        if (shouldRetry(res.status) && attempt < retries) {
          attempt += 1;
          await backoff(attempt);  // Exponential backoff
          continue;  // Try again
        }

        // Should not retry -> throw error
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
      }

      // Success!
      return await res.json();

    } catch (err) {
      // Network or parsing error
      if (attempt < retries) {
        attempt += 1;
        await backoff(attempt);
        continue;  // Try again
      }

      // Last attempt failed -> throw error
      throw err;
    }
  }
}

// Backoff function
async function backoff(attempt: number) {
  // Exponential: 200ms, 400ms, 800ms, 1600ms, ...
  const base = 200 * Math.pow(2, attempt - 1);

  // Random jitter: +0-100ms
  const jitter = Math.floor(Math.random() * 100);

  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}

// Should retry?
function shouldRetry(status: number) {
  // 429 = Too Many Requests
  // 5xx = Server errors
  return status === 429 || status >= 500;
}
```

**Retry Timeline:**

```
Attempt 1: fails -> wait 200ms + jitter ->
Attempt 2: fails -> wait 400ms + jitter ->
Attempt 3: success!

Total: ~600ms + jitter
```

### 2.4 Timeout

```typescript
// src/http.ts:43-44, 75
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(url, {
    signal: controller.signal  // Abort if timeout
  });
  // ...
} catch (err) {
  if (err instanceof Error && err.name === "AbortError") {
    throw new Error(`Timeout after ${timeoutMs}ms`);
  }
  throw err;
} finally {
  clearTimeout(timeout);  // Clear timer
}
```

---

## 3. Rate Limiting

### 3.1 What is Rate Limiting?

**Rate limiting** is the limitation of the request rate that a client can make to an API.

```
WITHOUT RATE LIMIT:
------------------------------------------------------------
Client: [sends 1000 requests/second]
Server: CRASH (overloaded, goes down, blocks client)

WITH RATE LIMIT:
------------------------------------------------------------
Client: [wants to send 1000 req/s]
Rate Limiter: [allows only 100 req/s]
Server: OK (stable, happy)
```

### 3.2 Token Bucket Algorithm

See `src/rateLimiter.ts:12-33`:

```typescript
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  async take(rule: RateLimitRule): Promise<void> {
    const now = Date.now();

    // Get or create bucket
    let bucket = this.buckets.get(rule.key);

    // If doesn't exist or expired, create new
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        tokens: rule.limit,     // Fill the bucket
        resetAt: now + rule.windowMs  // When to reset
      };
      this.buckets.set(rule.key, bucket);
    }

    // If has tokens, consume one
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;  // Can continue immediately
    }

    // Empty bucket -> wait for reset
    const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
    await sleep(waitMs);

    // Recursion after waiting
    return this.take(rule);
  }
}

type Bucket = {
  tokens: number;    // Available tokens
  resetAt: number;   // Reset timestamp
};
```

**Token Bucket Visualization:**

```
Window of 10 seconds, limit of 100 tokens

    0s        2s        4s        6s        8s        10s
    |         |         |         |         |         |
    ######################################################
    100 90 80 70 60 50 40 30 20 10  0  RESET 100 90...

Token = 1 allowed request

Time 0s:   100 tokens available -> can make 100 req
Time 2s:   80 tokens (spent 20) -> can make 80 more
Time 10s:  0 tokens -> WAIT
Time 10s+: RESET -> 100 tokens again
```

### 3.3 Polymarket Rate Limits

See `src/http.ts:12-33`:

```typescript
const RATE_LIMITS = [
  // CLOB API
  { host: "clob.polymarket.com", path: "/book", limit: 1500 },
  { host: "clob.polymarket.com", path: "/price", limit: 1500 },
  { host: "clob.polymarket.com", path: "/midpoint", limit: 1500 },
  { host: "clob.polymarket.com", path: "/prices-history", limit: 1000 },
  // ... more endpoints

  // Gamma API
  { host: "gamma-api.polymarket.com", path: "/events", limit: 500 },
  { host: "gamma-api.polymarket.com", path: "/markets", limit: 300 },

  // Data API
  { host: "data-api.polymarket.com", path: "/holders", limit: 150 },
  { host: "data-api.polymarket.com", path: "/trades", limit: 200 },
];

// Fallback for whole host limits
const HOST_LIMITS = [
  { host: "clob.polymarket.com", limit: 9000 },
  { host: "gamma-api.polymarket.com", limit: 4000 },
  { host: "data-api.polymarket.com", limit: 1000 }
];
```

**Rule Matching:**

```typescript
// src/http.ts:89-105
function matchRateLimit(url: URL) {
  const host = url.host;
  const path = url.pathname;
  let best: { host: string; path: string; limit: number } | undefined;

  // Search for specific endpoint
  for (const rule of RATE_LIMITS) {
    if (rule.host !== host) continue;
    if (path.startsWith(rule.path)) {
      // Get the most specific match (longest path)
      if (!best || rule.path.length > best.path.length) {
        best = rule;
      }
    }
  }

  // If found specific endpoint
  if (best) {
    return {
      key: `${host}${best.path}`,  // Unique identifier
      limit: best.limit,
      windowMs: 10_000  // 10 seconds
    };
  }

  // Fallback to host limit
  const hostRule = HOST_LIMITS.find((rule) => rule.host === host);
  if (hostRule) {
    return {
      key: host,
      limit: hostRule.limit,
      windowMs: 10_000
    };
  }

  // No known limit -> undefined (no rate limiting)
  return undefined;
}
```

**Matching Example:**

```
URL: https://clob.polymarket.com/book?token_id=123

1. host = "clob.polymarket.com"
2. path = "/book"

3. Search in RATE_LIMITS:
   Found: { host: "clob.polymarket.com", path: "/book", limit: 1500 }

4. Result:
   key: "clob.polymarket.com/book"
   limit: 1500 tokens per 10 seconds
   windowMs: 10000ms
```

---

## 4. Error Handling Patterns

### 4.1 Fallback Pattern

```typescript
// Try primary, use fallback if fails
async function getDataWithFallback(id: string) {
  try {
    return await getPrimaryData(id);
  } catch (err) {
    console.warn("Primary failed, using fallback:", err);
    return await getFallbackData(id);
  }
}
```

### 4.2 Circuit Breaker Pattern

```typescript
type CircuitState = "closed" | "open" | "half-open";

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;  // 5 failures -> opens
  private readonly timeout = 60000;  // 60s -> half-open

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Circuit open -> fail fast
    if (this.state === "open") {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = "half-open";  // Try again
      } else {
        throw new Error("Circuit open");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = "closed";
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "open";
    }
  }
}
```

### 4.3 Graceful Degradation

```typescript
// Works even with errors
async function getDataWithDegradation(id: string) {
  // Critical data
  try {
    const critical = await getCriticalData(id);
  } catch (err) {
    // If fails, cannot work without it
    throw err;
  }

  // Optional data
  let optional = null;
  try {
    optional = await getOptionalData(id);
  } catch (err) {
    console.warn("Optional data failed, using defaults");
    optional = getDefaultData();
  }

  return { critical, optional };
}
```

---

## 5. Error Logging

### 5.1 Log Structure

```typescript
// src/logger.ts
interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: "error",
    message,
    context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
  };

  console.error(JSON.stringify(entry));
}
```

### 5.2 Contextual Logging

```typescript
// BAD - No context
console.error("Error fetching data");

// GOOD - With context
console.error("Error fetching data", {
  endpoint: "/markets",
  tokenId: "0x123...",
  attempt: 3,
  error: err.message
});
```

---

## 6. Best Practices

### 6.1 Always Use Timeout

```typescript
// BAD - Can hang forever
const data = await fetch(url);

// GOOD - Timeout protects
const data = await fetch(url, { signal: AbortController.timeout(10000) });
```

### 6.2 Always Clean Up Resources

```typescript
// GOOD: Always cleans timers, connections, etc.
const controller = new AbortController();
try {
  const res = await fetch(url, { signal: controller.signal });
  // ...
} finally {
  controller.abort();  // Clean up
}
```

### 6.3 Don't Swallow Errors

```typescript
// BAD - Silent error
try {
  await riskyOperation();
} catch (err) {
  // Nothing :(
}

// GOOD - Log or propagate
try {
  await riskyOperation();
} catch (err) {
  console.error("Operation failed:", err);
  throw err;  // Propagate to caller
}
```

---

## 7. Exercises

### Exercise 1: Implement Retry Decorator

```typescript
function retry<T>(
  fn: () => Promise<T>,
  options: { retries: number; backoffMs: number }
): Promise<T> {
  // Implement retry logic
}
```

### Exercise 2: Implement Circuit Breaker

```typescript
class CircuitBreaker {
  // Implement complete circuit breaker
}
```

---

## 8. Checkpoint

**Test your knowledge before continuing:**

1. **What is the difference between fixed backoff and exponential backoff retry?**
   - a) Fixed waits the same time always, exponential doubles each attempt
   - b) Fixed doubles each attempt, exponential waits the same time always
   - c) There is no difference

   <details>
   <summary>Answer</summary>
   **a)** Fixed backoff: 100ms, 100ms, 100ms... | Exponential backoff: 100ms, 200ms, 400ms, 800ms...
   </details>

2. **What is jitter and why is it important?**
   - a) A type of error that happens randomly
   - b) A random variation added to wait time to avoid synchronization
   - c) A performance metric

   <details>
   <summary>Answer</summary>
   **b)** Jitter is a random variation added to backoff to prevent multiple clients from synchronizing their retries. Without jitter, if 10 clients fail at the same time, they will all retry at the same time, creating a "storm" of requests.
   </details>

3. **How does the Token Bucket algorithm work for rate limiting?**
   - a) Creates a token for each request and discards after use
   - b) Maintains a bucket with tokens that is refilled periodically; each request consumes one token
   - c) Limits the total number of requests per day

   <details>
   <summary>Answer</summary>
   **b)** Token Bucket: Bucket is filled with N tokens at the start of each window (e.g., 1500 tokens every 10s). Each request consumes 1 token. If bucket is empty, wait until refill. This allows bursts within the limit but prevents excessive continuous use.
   </details>

4. **When should you implement timeout on an HTTP request?**
   - a) Always, on all requests
   - b) Only on external requests
   - c) Never, let the system handle it naturally

   <details>
   <summary>Answer</summary>
   **a)** Always implement timeout. Without timeout, your application can hang indefinitely waiting for a response that will never come. A common value is 5-10 seconds for external APIs.
   </details>

5. **What is the difference between Circuit Breaker and Retry?**
   - a) Retry tries again immediately, Circuit Breaker stops trying temporarily
   - b) Circuit Breaker tries again, Retry stops
   - c) They are the same thing

   <details>
   <summary>Answer</summary>
   **a)** Retry: Tries again after failure (with backoff). Circuit Breaker: After X consecutive failures, stops trying for Y seconds ("open" state) to avoid overloading a service that is already failing.
   </details>

**Congratulations!** If you answered correctly, you are ready for the next chapter.

---

## 9. Common Pitfalls

### Pitfall 1: "Swallowing" Errors (Silent Failures)

**Problem:** Catching errors but not handling them properly.

```typescript
// BAD - Silent error
try {
  await riskyOperation();
} catch (err) {
  // Nothing :(
}

// GOOD - Log or propagate
try {
  await riskyOperation();
} catch (err) {
  logger.error("Operation failed", err);
  throw err;  // Propagate to caller
}

// BETTER - Specific handling
try {
  await riskyOperation();
} catch (err) {
  if (err instanceof NetworkError) {
    return fallbackData;  // Use fallback
  }
  throw err;  // Other errors propagate
}
```

**Why it's bad:** Silent errors are impossible to debug. You will never know that something failed.

---

### Pitfall 2: Infinite Retry

**Problem:** Retry without maximum limit causes infinite loop.

```typescript
// BAD - Never gives up
while (true) {
  try {
    return await fetch(url);
  } catch {
    // Tries forever!
  }
}

// GOOD - Limits attempts
let attempts = 0;
const MAX_RETRIES = 3;
while (attempts < MAX_RETRIES) {
  try {
    return await fetch(url);
  } catch {
    attempts++;
    if (attempts >= MAX_RETRIES) throw;
    await backoff(attempts);
  }
}
```

---

### Pitfall 3: Backoff Without Jitter

**Problem:** Multiple clients synchronize retries causing "thundering herd".

```typescript
// BAD - All synchronized
function backoff(attempt: number) {
  const delay = 200 * Math.pow(2, attempt);
  setTimeout(resolve, delay);  // Predictable!
}

// GOOD - With random jitter
function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 100);  // Random
  setTimeout(resolve, base + jitter);
}
```

**Example timeline WITHOUT jitter:**
```
Client A: fails -> 200ms -> 400ms -> 800ms
Client B: fails -> 200ms -> 400ms -> 800ms
Client C: fails -> 200ms -> 400ms -> 800ms
Result: Synchronized storm on the server!
```

**Timeline WITH jitter:**
```
Client A: fails -> 234ms -> 412ms -> 878ms
Client B: fails -> 189ms -> 456ms -> 801ms
Client C: fails -> 267ms -> 389ms -> 845ms
Result: Distributed requests, server relieved!
```

---

### Pitfall 4: Ignoring Rate Limits

**Problem:** Assuming API has no rate limit.

```typescript
// BAD - No rate limiting
async function fetchMany(urls: string[]) {
  return Promise.all(urls.map(url => fetch(url)));
  // 100 simultaneous requests -> API blocks!
}

// GOOD - With rate limiting
async function fetchMany(urls: string[]) {
  const results = [];
  for (const url of urls) {
    await rateLimiter.take({ key: url, limit: 10, windowMs: 1000 });
    results.push(await fetch(url));
  }
  return results;
}
```

---

### Pitfall 5: Timeout Too Long

**Problem:** 60-second timeout freezes the application.

```typescript
// BAD - Timeout too long
const data = await fetch(url, { timeout: 60000 });
// User waits 1 minute without response!

// GOOD - Short timeout with retry
const data = await fetchJson(url, {
  timeoutMs: 5000,   // 5 seconds
  retries: 3         // Tries up to 3 times = 15s total max
});
```

**General rule:** Timeout should be short (5-10s) with multiple retries instead of long timeout without retry.

---

### Pitfall 6: Not Logging Context

**Problem:** Logs without context make debugging impossible.

```typescript
// BAD - No context
console.error("Error:", err);
// Output: Error: undefined

// GOOD - With rich context
logger.error("Failed to fetch market", err, {
  endpoint: "/markets",
  tokenId: "0x123...",
  attempt: 3,
  timeoutMs: 5000,
  url: "https://gamma-api.polymarket.com/markets?limit=10"
});
// Output: {"level":"error","message":"Failed to fetch market","context":{...}}
```

---

### Pitfall 7: Wrong Exponential Backoff

**Problem:** Grows too fast (2^10 = 1024x) or without cap.

```typescript
// BAD - No maximum limit
async function backoff(attempt: number) {
  const delay = 200 * Math.pow(2, attempt);
  // attempt=1: 200ms
  // attempt=10: 204,800ms = 3.4 minutes!
  // attempt=20: 209,715,200ms = 58 hours!
}

// GOOD - With maximum cap
async function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt);
  const capped = Math.min(base, 30000);  // Maximum 30s
  const jitter = Math.floor(Math.random() * 100);
  await sleep(capped + jitter);
}
```

---

## 10. Troubleshooting

### Issue: "Too Many Requests" (429) Even with Rate Limiting

**Symptoms:**
```
HttpError: 429 Too Many Requests
```

**Diagnosis:**
1. Rate limit configured incorrectly
2. Multiple instances running simultaneously
3. API limit changed

**Solutions:**

```typescript
// 1. Check rate limit configuration
console.log("Rate limits:", RATE_LIMITS);
// Confirm limits are correct

// 2. Add monitoring
const limiter = new RateLimiter();
limiter.on("wait", (waitTime) => {
  logger.warn("Rate limit reached", { waitTime, key });
});

// 3. Check if there are no multiple instances
// Linux/Mac:
ps aux | grep node

// 4. Add aggressive backoff when receiving 429
if (res.status === 429) {
  const retryAfter = res.headers.get("Retry-After");
  const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
  await sleep(waitMs);
}
```

---

### Issue: Requests Get Stuck

**Symptoms:**
- Application hangs
- No response for minutes
- CPU at 0%

**Diagnosis:**
Timeout not implemented or too long.

**Solution:**

```typescript
// 1. Always use timeout
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const res = await fetch(url, { signal: controller.signal });
} catch (err) {
  if (err.name === "AbortError") {
    throw new Error("Timeout after 10 seconds");
  }
  throw err;
} finally {
  clearTimeout(timeout);
}

// 2. Add timeout to EVERY fetch
// Use AbortController.timeout() (Node.js 18+)
const res = await fetch(url, {
  signal: AbortController.timeout(10000)
});
```

---

### Issue: Infinite Reconnect Loop

**Symptoms:**
- WebSocket connects and disconnects constantly
- "reconnecting" messages appear continuously

**Diagnosis:**
1. Incorrect URL
2. Unsupported protocol
3. Missing authentication
4. Server rejecting connection

**Solution:**

```typescript
// 1. Add maximum retries
const MAX_RECONNECT_ATTEMPTS = 10;
let reconnectAttempts = 0;

ws.addEventListener("close", () => {
  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    logger.error("Max reconnect attempts reached");
    ws = null;
    return;  // Give up
  }
  scheduleReconnect();
});

// 2. Add increasing backoff
function scheduleReconnect() {
  const delay = Math.min(
    30000,  // Maximum 30s
    500 * Math.pow(2, reconnectAttempts - 1)  // Exponential
  );
  logger.info(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(connect, delay);
}

// 3. Check URL
console.log("WS URL:", CONFIG.clobWsBase);
// Should be wss:// not https://
```

---

### Issue: Memory Leak with Timers

**Symptoms:**
- Memory usage grows continuously
- Application gets slower over time

**Diagnosis:**
Timers never being cleared.

**Solution:**

```typescript
// 1. Always keep references to timers
const timers: ReturnType<typeof setInterval>[] = [];

// 2. Clear all timers on exit
function cleanup() {
  timers.forEach(t => clearInterval(t));
  timers.length = 0;  // Clear array
}

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

// 3. Use clearInterval after single timer
const timeout = setTimeout(() => {
  doSomethingOnce();
}, 5000);
// No need to clear if it's one-shot

// 4. For intervals, ALWAYS clear
const interval = setInterval(() => {
  doSomethingRepeatedly();
}, 1000);
timers.push(interval);  // Store for later cleanup
```

---

### Issue: Generic Error Messages

**Symptoms:**
- "Error: undefined"
- "Error: Request failed"
- No useful information

**Diagnosis:**
Original error lost or not captured.

**Solution:**

```typescript
// BAD
try {
  await fetch(url);
} catch (err) {
  throw new Error("Request failed");  // Information lost!
}

// GOOD - Preserves original error
try {
  await fetch(url);
} catch (err) {
  throw new Error(`Request failed: ${err.message}`, { cause: err });
}

// BETTER - Adds context
try {
  await fetch(url);
} catch (err) {
  const context = {
    url,
    method: "GET",
    timeout: 5000,
    attempt: 2
  };
  throw new Error(
    `Request to ${url} failed: ${err.message}`,
    { cause: err, context }
  );
}
```

---

### Issue: Fallback Not Working

**Symptoms:**
- Fallback is never used even when primary fails
- Error continues even with fallback implemented

**Diagnosis:**
Error propagating before fallback.

**Solution:**

```typescript
// BAD - Error propagates before fallback
async function getDataWithFallback() {
  try {
    return await getPrimaryData();
  } catch {
    return await getFallbackData();  // Never reaches here
  }
}

// Problem: getPrimaryData has internal try/catch that throws new error

// GOOD - Primary does not swallow error
async function getPrimaryData() {
  // No try/catch - let error propagate
  return await fetch(primaryUrl);
}

// GOOD - Or logs and re-throws
async function getPrimaryData() {
  try {
    return await fetch(primaryUrl);
  } catch (err) {
    logger.warn("Primary failed, trying fallback", { error: err.message });
    throw err;  // Re-throw for caller
  }
}

async function getDataWithFallback() {
  try {
    return await getPrimaryData();
  } catch {
    logger.info("Using fallback data source");
    return await getFallbackData();
  }
}
```

---

## 11. Design Decisions

### Decision 1: Why Exponential Backoff with Jitter?

**Alternatives:**

| Strategy | Advantages | Disadvantages |
|----------|------------|---------------|
| **Fixed backoff** (100ms, 100ms, 100ms...) | Simple | Synchronizes clients |
| **Linear backoff** (100ms, 200ms, 300ms...) | Predictable | Can still synchronize |
| **Exponential without jitter** (100ms, 200ms, 400ms...) | Grows fast | **Synchronizes clients!** |
| **Exponential WITH jitter** (GOOD) | Grows fast + distributes | More complex |

**Why Exponential + Jitter was chosen:**

1. GOOD: **Fast growth:** Doubles each attempt (100ms -> 200ms -> 400ms -> 800ms...)
2. GOOD: **Prevents synchronization:** Random jitter distributes retries over time
3. GOOD: **Balances loads:** Clients don't all try at the same time
4. GOOD: **Graceful recovery:** Server has time to recover

**Visual timeline:**
```
Server fails at t=0
+-- Client A: retry at 234ms, 445ms, 878ms
+-- Client B: retry at 189ms, 412ms, 801ms
+-- Client C: retry at 267ms, 389ms, 845ms
+-- Result: Distributed requests, server not overloaded
```

**Implemented formula:**
```typescript
// src/http.ts:124-127
async function backoff(attempt: number) {
  const base = 200 * Math.pow(2, attempt - 1);  // Exponential
  const jitter = Math.floor(Math.random() * 100);  // 0-100ms random
  await new Promise((resolve) => setTimeout(resolve, base + jitter));
}
```

**Why 200ms base?**
- 200ms is noticeable to user but not annoying
- 200ms -> 400ms -> 800ms -> 1600ms -> 3200ms
- 5 attempts = ~6 seconds total (reasonable)

**Why 0-100ms jitter?**
- Small enough not to add much delay
- Large enough to distribute retries
- 100ms is ~50% of base (200ms), good balance

---

### Decision 2: Why Token Bucket instead of other algorithms?

**Alternatives:**

1. **Fixed Window** - X requests per Y seconds - BAD
2. **Sliding Window Log** - Timestamp log - BAD
3. **Leaky Bucket** - Constant drip rate - BAD
4. **Token Bucket** - GOOD

**Comparison:**

| Criterion | Fixed Window | Sliding Log | Leaky Bucket | **Token Bucket** |
|-----------|--------------|-------------|--------------|------------------|
| **Simplicity** | GOOD: Simple | BAD: Complex | Medium | GOOD: Simple |
| **Burst support** | BAD: No | GOOD: Yes | BAD: No | GOOD: Yes |
| **Memory usage** | GOOD: Low | BAD: High (log) | GOOD: Low | GOOD: Low |
| **Precision** | BAD: Edge bugs | GOOD: Precise | GOOD: Precise | GOOD: Precise |
| **Smoothness** | BAD: Spiky | GOOD: Smooth | GOOD: Smooth | GOOD: Smooth |

**Why Fixed Window is bad:**
```
Window of 10s, limit of 100 req:

t=0s:   100 req (OK)
t=0.1s: 100 req (OK!)  <- PROBLEM: 200 req in 0.1s!
t=9.9s: 0 req
t=10s:  100 req (new window) <- PROBLEM: 200 req in 0.1s!
```

**Why Token Bucket is good:**
```
Bucket with 100 tokens, refills at 10 tokens/s:

t=0s:   Uses 100 tokens -> bucket empty, wait
t=1s:   Gets 10 tokens -> can make 10 req
t=2s:   Gets 10 tokens -> can make 10 req
...
Result: Smooth rate limit, no spikes
```

**Project implementation:**
```typescript
// src/rateLimiter.ts:15-33
async take(rule: RateLimitRule): Promise<void> {
  const now = Date.now();
  let bucket = this.buckets.get(rule.key);

  // If doesn't exist or expired, create new
  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      tokens: rule.limit,     // Fill the bucket
      resetAt: now + rule.windowMs  // When to reset
    };
    this.buckets.set(rule.key, bucket);
  }

  // If has tokens, consume one
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    return;  // Can continue immediately
  }

  // Empty bucket -> wait for reset with jitter
  const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
  await sleep(waitMs);
  return this.take(rule);  // Recursion after waiting
}
```

**Why 20-120ms jitter in rate limiter?**
- Prevents multiple threads from waiting exactly the same time
- 20ms minimum = small overhead
- 120ms maximum = acceptable for rate limit

---

### Decision 3: Retry on which HTTP status codes?

**Project policy:**

| Status | Retry? | Reason |
|--------|--------|--------|
| **2xx (Success)** | No | Success, no retry needed |
| **3xx (Redirect)** | Depends | fetch follows automatically |
| **429 (Rate Limit)** | Yes | Temporary limit, will pass |
| **4xx (Client Error)** | No | Client error, retry won't help |
| **5xx (Server Error)** | Yes | Server may recover |

**Implemented code:**
```typescript
// src/http.ts:130-132
function shouldRetry(status: number): boolean {
  return status === 429 || status >= 500;
}
```

**Why NOT retry on 4xx (except 429):**
- **400 Bad Request:** Malformed request, retry won't fix it
- **401 Unauthorized:** Missing authentication, needs new token
- **403 Forbidden:** No permission, retry won't grant permission
- **404 Not Found:** Resource doesn't exist, retry won't create it
- **422 Unprocessable Entity:** Invalid data, retry won't fix it

**Why YES retry on 429 and 5xx:**
- **429 Too Many Requests:** Temporary rate limit, wait and try again
- **500 Internal Server Error:** Temporary server error
- **502 Bad Gateway:** Upstream server may be recovering
- **503 Service Unavailable:** Server may be back soon
- **504 Gateway Timeout:** Request may work on new attempt

---

### Decision 4: Fallback or Error-Fast?

**Project philosophy:** Graceful Degradation with Error-Fast for critical paths.

**What to use fallback for:**
```typescript
// GOOD: Non-critical data with fallback
async function getMarketExtendedInfo(marketId: string) {
  try {
    return await fetchExtendedInfo(marketId);
  } catch {
    logger.warn("Extended info unavailable, using basic");
    return await fetchBasicInfo(marketId);  // Fallback
  }
}
```

**What NOT to use fallback for:**
```typescript
// Critical data without fallback = fail
async function executeTrade(marketId: string, amount: number) {
  try {
    return await placeOrder(marketId, amount);
  } catch {
    // CANNOT return false or fake data!
    throw err;  // Must fail explicitly
  }
}
```

**Golden rule:**
- **Critical path:** Let it fail (fail-fast)
- **Nice-to-have:** Use fallback (graceful degradation)
- **UI display:** Use defaults if extra data fails

---

## 12. Further Reading

### Articles on Retry and Backoff

- **Exponential Backoff and Jitter**: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- **Retry Strategies in Distributed Systems**: https://blog.fauna.com/retry-strategies-distributed-systems/
- **Google's "Handling Errors" Guide**: https://cloud.google.com/architecture/error-handling-strategies

### Rate Limiting

- **Rate Limiting Algorithms Compared**: https://konghq.com/blog/rate-limiting-algorithms/
- **Token Bucket explained**: https://en.wikipedia.org/wiki/Token_bucket
- **Rate Limiting at Scale**: https://medium.com/@saisathishkumar/rate-limiting-at-scale-bddc1db14cc8

### Circuit Breaker

- **Circuit Breaker Pattern**: https://martinfowler.com/bliki/CircuitBreaker.html
- **Implementing Circuit Breaker**: https://medium.com/@ngd1214/circuit-breaker-pattern-5f749c3b0069

### Resilience Patterns

- **The Eight Fallacies of Distributed Computing**: https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing
- **Release It!** (Michael Nygard) - Book on resilience patterns

### API Documentation

- **Polymarket API Docs**: https://docs.polymarket.com
- **HTTP Status Codes**: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status

### Tools

- **wscat** (WebSocket testing): `bun install -g wscat`
- **curl** (HTTP testing): `curl -v https://api.example.com`
- **hey** (Load testing): `bun install -g hey`

---

## 13. Summary

- **Errors are inevitable** - be prepared
- **Retry with backoff** - try again with increasing wait
- **Timeout** - don't wait forever
- **Rate limiting** - respect API limits
- **Token bucket** - algorithm for rate limiting
- **Fallback** - alternatives if primary fails
- **Structured logging** - record errors with context

---

**Next Chapter:** Testing Strategies

[Continue to Chapter 7](./07-testing.md)

---

**Version:** 1.0.0
**Last Updated:** January 2026
