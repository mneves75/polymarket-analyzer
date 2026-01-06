export type RateLimitRule = {
  key: string;
  limit: number;
  windowMs: number;
};

type Bucket = {
  tokens: number;
  resetAt: number;
};

export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  async take(rule: RateLimitRule): Promise<void> {
    const now = Date.now();
    let bucket = this.buckets.get(rule.key);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { tokens: rule.limit, resetAt: now + rule.windowMs };
      this.buckets.set(rule.key, bucket);
    }

    if (bucket.tokens > 0) {
      bucket.tokens -= 1;
      return;
    }

    const waitMs = Math.max(0, bucket.resetAt - now) + jitter(20, 120);
    await sleep(waitMs);
    return this.take(rule);
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}
