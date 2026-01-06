import { beforeEach, describe, expect, it } from "bun:test";
import { RateLimiter, type RateLimitRule } from "../src/rateLimiter";

describe("RateLimiter", () => {
	let limiter: RateLimiter;

	beforeEach(() => {
		limiter = new RateLimiter();
	});

	describe("token bucket behavior", () => {
		it("allows requests up to the limit", async () => {
			const rule: RateLimitRule = { key: "test", limit: 5, windowMs: 10000 };

			const start = Date.now();
			for (let i = 0; i < 5; i++) {
				await limiter.take(rule);
			}
			const duration = Date.now() - start;

			// All requests should proceed immediately without waiting
			expect(duration).toBeLessThan(100);
		});

		it("blocks request when bucket is empty", async () => {
			const rule: RateLimitRule = { key: "test", limit: 2, windowMs: 100 };

			const start = Date.now();
			// Use all tokens
			await limiter.take(rule);
			await limiter.take(rule);
			// This one should wait for refill
			await limiter.take(rule);
			const duration = Date.now() - start;

			// Should have waited at least windowMs + jitter
			expect(duration).toBeGreaterThanOrEqual(100);
		});

		it("refills bucket after window expires", async () => {
			const rule: RateLimitRule = { key: "test", limit: 2, windowMs: 150 };

			// Use all tokens
			await limiter.take(rule);
			await limiter.take(rule);

			// Wait for refill
			await new Promise((resolve) => setTimeout(resolve, 200));

			// Should have tokens available again
			const start = Date.now();
			await limiter.take(rule);
			await limiter.take(rule);
			const duration = Date.now() - start;

			// Should proceed immediately (no wait)
			expect(duration).toBeLessThan(50);
		});
	});

	describe("window reset", () => {
		it("resets bucket on first request after window expires", async () => {
			const rule: RateLimitRule = { key: "test", limit: 5, windowMs: 200 };

			// Use all tokens
			for (let i = 0; i < 5; i++) {
				await limiter.take(rule);
			}

			// Wait for window to expire
			await new Promise((resolve) => setTimeout(resolve, 250));

			// Bucket should be refilled
			const start = Date.now();
			await limiter.take(rule);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(50);
		});

		it("extends window on subsequent requests within window", async () => {
			const rule: RateLimitRule = { key: "test", limit: 100, windowMs: 100 };

			// First request
			await limiter.take(rule);

			// Wait half the window
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Second request should still be within window
			await limiter.take(rule);

			// Third request right after should still not wait
			const start = Date.now();
			await limiter.take(rule);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(50);
		});
	});

	describe("concurrent requests", () => {
		it("handles concurrent requests correctly with short window", async () => {
			const rule: RateLimitRule = { key: "test", limit: 3, windowMs: 50 };

			// Launch concurrent requests
			const promises = [
				limiter.take(rule),
				limiter.take(rule),
				limiter.take(rule),
				limiter.take(rule), // This one will wait
			];

			const start = Date.now();
			await Promise.all(promises);
			const duration = Date.now() - start;

			// Should wait for refill (last request)
			expect(duration).toBeGreaterThanOrEqual(50);
		});

		it("preserves token count across concurrent requests", async () => {
			const rule: RateLimitRule = { key: "test", limit: 5, windowMs: 50 };

			// Fire 5 concurrent requests
			await Promise.all([
				limiter.take(rule),
				limiter.take(rule),
				limiter.take(rule),
				limiter.take(rule),
				limiter.take(rule),
			]);

			// All should complete quickly (no waiting)
			// Bucket should be empty now
			const start = Date.now();
			await limiter.take(rule);
			const duration = Date.now() - start;

			expect(duration).toBeGreaterThanOrEqual(50);
		});
	});

	describe("multiple rate limit rules", () => {
		it("maintains separate buckets for different keys", async () => {
			const rule1: RateLimitRule = { key: "api1", limit: 2, windowMs: 10000 };
			const rule2: RateLimitRule = { key: "api2", limit: 2, windowMs: 10000 };

			// Exhaust api1
			await limiter.take(rule1);
			await limiter.take(rule1);

			// api2 should still have tokens
			const start = Date.now();
			await limiter.take(rule2);
			await limiter.take(rule2);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100);
		});

		it("handles multiple rules concurrently with short window", async () => {
			const rule1: RateLimitRule = { key: "api1", limit: 1, windowMs: 50 };
			const rule2: RateLimitRule = { key: "api2", limit: 1, windowMs: 50 };

			// Use tokens from both
			await limiter.take(rule1);
			await limiter.take(rule2);

			// Both should wait for refill
			const start = Date.now();
			await Promise.all([limiter.take(rule1), limiter.take(rule2)]);
			const duration = Date.now() - start;

			// Both waited for refill
			expect(duration).toBeGreaterThanOrEqual(50);
		});

		it("respects different limits for different keys", async () => {
			const ruleLow: RateLimitRule = { key: "low", limit: 2, windowMs: 10000 };
			const ruleHigh: RateLimitRule = {
				key: "high",
				limit: 10,
				windowMs: 10000,
			};

			// Exhaust low limit
			await limiter.take(ruleLow);
			await limiter.take(ruleLow);

			// High limit should still have tokens
			const start = Date.now();
			for (let i = 0; i < 10; i++) {
				await limiter.take(ruleHigh);
			}
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});

	describe("jitter calculation", () => {
		it("adds random jitter to wait time", async () => {
			const rule: RateLimitRule = { key: "test", limit: 1, windowMs: 100 };

			await limiter.take(rule); // Use token

			// Measure wait time multiple times
			const waitTimes: number[] = [];
			for (let i = 0; i < 5; i++) {
				const start = Date.now();
				await limiter.take(rule);
				const wait = Date.now() - start;
				waitTimes.push(wait);
				// Use token for next iteration
				await limiter.take(rule);
			}

			// Wait times should vary due to jitter
			const uniqueTimes = new Set(waitTimes);
			expect(uniqueTimes.size).toBeGreaterThan(1);
		});

		it("jitter is within expected range", async () => {
			const rule: RateLimitRule = { key: "test", limit: 1, windowMs: 100 };

			await limiter.take(rule); // Use token

			const start = Date.now();
			await limiter.take(rule);
			const wait = Date.now() - start;

			// Wait should be windowMs (100) + jitter (20-120ms)
			expect(wait).toBeGreaterThanOrEqual(120);
			expect(wait).toBeLessThan(250);
		});
	});

	describe("edge cases", () => {
		it("handles limit of 1", async () => {
			const rule: RateLimitRule = { key: "test", limit: 1, windowMs: 100 };

			const start = Date.now();
			await limiter.take(rule); // First succeeds immediately
			await limiter.take(rule); // Second waits for refill
			const duration = Date.now() - start;

			expect(duration).toBeGreaterThanOrEqual(100);
		});

		it("handles large limits", async () => {
			const rule: RateLimitRule = {
				key: "test",
				limit: 10000,
				windowMs: 10000,
			};

			// Should handle large limit without issues
			const start = Date.now();
			for (let i = 0; i < 100; i++) {
				await limiter.take(rule);
			}
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(1000);
		});

		it("handles very short windows", async () => {
			const rule: RateLimitRule = { key: "test", limit: 1, windowMs: 10 };

			await limiter.take(rule);

			const start = Date.now();
			await limiter.take(rule);
			const duration = Date.now() - start;

			expect(duration).toBeGreaterThanOrEqual(10);
		});
	});

	describe("behavioral verification", () => {
		it("consumes exactly one token per request with short window", async () => {
			const rule: RateLimitRule = { key: "test", limit: 5, windowMs: 100 };

			// Use 3 tokens
			await limiter.take(rule);
			await limiter.take(rule);
			await limiter.take(rule);

			// Should have 2 tokens left
			const start = Date.now();
			await limiter.take(rule);
			await limiter.take(rule);
			const duration = Date.now() - start;

			// Should proceed immediately (tokens available)
			expect(duration).toBeLessThan(100);

			// Next one should wait
			const waitStart = Date.now();
			await limiter.take(rule);
			const waitDuration = Date.now() - waitStart;

			expect(waitDuration).toBeGreaterThanOrEqual(100);
		});

		it("treats each key independently", async () => {
			const ruleA: RateLimitRule = { key: "A", limit: 1, windowMs: 10000 };
			const ruleB: RateLimitRule = { key: "B", limit: 1, windowMs: 10000 };

			// Both proceed immediately
			const start = Date.now();
			await Promise.all([limiter.take(ruleA), limiter.take(ruleB)]);
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100);
		});
	});
});
