/**
 * Rate limit rule definition.
 *
 * A rate limit rule specifies how many requests can be made within a time window.
 * For example: { key: "api.example.com", limit: 100, windowMs: 10000 }
 * means 100 requests per 10 seconds.
 */
export type RateLimitRule = {
  /** Unique identifier for this rate limit (typically host+path) */
  key: string;
  /** Maximum number of requests allowed within the time window */
  limit: number;
  /** Time window duration in milliseconds */
  windowMs: number;
};

/**
 * Internal state for a token bucket.
 *
 * @private
 */
type Bucket = {
  /** Current number of tokens available in the bucket */
  tokens: number;
  /** Unix timestamp (ms) when the bucket will be refilled */
  resetAt: number;
};

/**
 * Token Bucket Rate Limiter.
 *
 * ## Algorithm Overview
 *
 * The token bucket algorithm works as follows:
 * 1. Each rule has a "bucket" with a maximum number of tokens
 * 2. When a request arrives, it must consume 1 token from the bucket
 * 3. If tokens are available, the request proceeds immediately
 * 4. If the bucket is empty, the request waits until the next refill
 * 5. Buckets are refilled periodically (every windowMs) with the full limit
 *
 * ## Example
 *
 * Rule: { key: "api", limit: 5, windowMs: 10000 }
 *
 * Timeline:
 * - t=0ms:    Bucket created with 5 tokens
 * - t=100ms:  Request 1 → 4 tokens left (proceeds immediately)
 * - t=200ms:  Request 2 → 3 tokens left
 * - t=300ms:  Request 3 → 2 tokens left
 * - t=400ms:  Request 4 → 1 token left
 * - t=500ms:  Request 5 → 0 tokens left
 * - t=600ms:  Request 6 → waits...
 * - t=10000ms: Bucket refilled to 5 tokens, Request 6 proceeds
 *
 * ## Why Token Bucket?
 *
 * Compared to alternatives:
 * - **Fixed Window:** Bursts at boundaries (e.g., 100 requests at t=0, 100 more at t=10)
 * - **Sliding Window Log:** Accurate but memory-intensive (stores all timestamps)
 * - **Token Bucket:** Allows bursts within limit, memory-efficient, smooth rate limiting
 *
 * ## Jitter
 *
 * When waiting for bucket refill, a small random jitter (20-120ms) is added
 * to prevent multiple threads from waiting exactly the same time and creating
 * synchronized request storms.
 *
 * @example
 * const limiter = new RateLimiter();
 *
 * // Make a rate-limited request
 * await limiter.take({ key: "api", limit: 100, windowMs: 10000 });
 * // If bucket has tokens, proceeds immediately
 * // If bucket is empty, waits until refill
 */
export class RateLimiter {
  /** Map of bucket keys to their current state */
  private buckets = new Map<string, Bucket>();

  /**
   * Consume a token from the rate-limited bucket, waiting if necessary.
   *
   * If the bucket has tokens available, consumes 1 token and returns immediately.
   * If the bucket is empty, waits until the next refill and retries.
   *
   * @param rule - Rate limit rule to apply
   * @returns Promise that resolves when token is consumed
   *
   * @example
   * const limiter = new RateLimiter();
   * await limiter.take({ key: "api", limit: 10, windowMs: 1000 });
   * console.log("Request allowed");
   */
  async take(rule: RateLimitRule): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(rule.key);

    // Create new bucket or reset expired bucket
    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        tokens: rule.limit,     // Fill bucket to max
        resetAt: now + rule.windowMs  // Next refill time
      };
      this.buckets.set(rule.key, bucket);
    }

    // If bucket has tokens, consume one and proceed
    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;
    }

    // Bucket is empty - calculate wait time and wait for refill
    const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
    await sleep(waitMs);

    // After waiting, retry (bucket will be refilled by now)
    return this.take(rule);
  }
}

/**
 * Sleep for a specified number of milliseconds.
 *
 * @param ms - Milliseconds to sleep
 * @returns Promise that resolves after sleep
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a random jitter value within a range.
 *
 * Jitter is added to wait times to prevent synchronized retry storms
 * when multiple threads are rate-limited simultaneously.
 *
 * @param min - Minimum jitter in milliseconds
 * @param max - Maximum jitter in milliseconds
 * @returns Random jitter value between min and max (inclusive)
 */
function jitter(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}
