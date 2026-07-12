/**
 * Token-bucket rate limiter for auth flows.
 *
 * Each key (e.g. IP, userId, email) gets an independent bucket. Tokens refill
 * continuously at `refillRate` per second up to `capacity`, allowing short
 * bursts while capping sustained throughput — the right shape for gating
 * sign-in attempts, token verification, and webhook ingestion.
 *
 * Pure and deterministic: time is injected via `now()` so tests don't sleep.
 */

import type {
  RateLimitConfig,
  RateLimitDecision,
  RateLimiter,
} from "@fixerframework/types/auth/server";

interface Bucket {
  tokens: number;
  /** ms timestamp of the last refill. */
  updated: number;
}

export function createRateLimiter(config: RateLimitConfig): RateLimiter {
  if (config.capacity <= 0) throw new RangeError("capacity must be > 0");
  if (config.refillRate <= 0) throw new RangeError("refillRate must be > 0");

  const now = config.now ?? (() => Date.now());
  const maxKeys = config.maxKeys ?? 10_000;
  const buckets = new Map<string, Bucket>();

  const refill = (bucket: Bucket): void => {
    const t = now();
    const elapsedSec = (t - bucket.updated) / 1000;
    if (elapsedSec <= 0) return;
    bucket.tokens = Math.min(config.capacity, bucket.tokens + elapsedSec * config.refillRate);
    bucket.updated = t;
  };

  return {
    check(key: string): RateLimitDecision {
      let bucket = buckets.get(key);
      if (!bucket) {
        if (buckets.size >= maxKeys) {
          const oldest = buckets.keys().next().value;
          if (oldest !== undefined) buckets.delete(oldest);
        }
        bucket = { tokens: config.capacity, updated: now() };
        buckets.set(key, bucket);
      } else {
        refill(bucket);
        // Re-insert to move to end of Map iteration order (LRU eviction),
        // so hot keys are never evicted before cold ones.
        buckets.delete(key);
        buckets.set(key, bucket);
      }

      if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
      }
      const deficit = 1 - bucket.tokens;
      const retryAfterMs = Math.ceil((deficit / config.refillRate) * 1000);
      return { allowed: false, remaining: 0, retryAfterMs: Math.max(retryAfterMs, 1) };
    },

    reset(key: string): void {
      buckets.delete(key);
    },

    remaining(key: string): number {
      const bucket = buckets.get(key);
      if (!bucket) return config.capacity;
      // Compute without mutating — check() will do the actual refill.
      const t = now();
      const elapsedSec = (t - bucket.updated) / 1000;
      if (elapsedSec <= 0) return bucket.tokens;
      return Math.min(config.capacity, bucket.tokens + elapsedSec * config.refillRate);
    },
  };
}
