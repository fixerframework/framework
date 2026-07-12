import { describe, it, expect } from "vitest";
import { createRateLimiter } from "../src/server/rate-limit.ts";

function limiterWithClock(capacity: number, refillRate: number) {
  let t = 1_000_000;
  const clock = () => t;
  const limiter = createRateLimiter({ capacity, refillRate, now: clock });
  return {
    limiter,
    advance: (ms: number) => {
      t += ms;
    },
    set: (ms: number) => {
      t = ms;
    },
  };
}

describe("createRateLimiter", () => {
  it("rejects invalid config", () => {
    expect(() => createRateLimiter({ capacity: 0, refillRate: 1 })).toThrow(RangeError);
    expect(() => createRateLimiter({ capacity: 1, refillRate: 0 })).toThrow(RangeError);
  });

  it("allows up to capacity in an initial burst", () => {
    const { limiter } = limiterWithClock(3, 1);
    expect(limiter.check("ip")).toEqual({ allowed: true, remaining: 2, retryAfterMs: 0 });
    expect(limiter.check("ip")).toEqual({ allowed: true, remaining: 1, retryAfterMs: 0 });
    expect(limiter.check("ip")).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
    const denied = limiter.check("ip");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks keys independently", () => {
    const { limiter } = limiterWithClock(1, 1);
    expect(limiter.check("a").allowed).toBe(true);
    expect(limiter.check("b").allowed).toBe(true);
    expect(limiter.check("a").allowed).toBe(false);
    expect(limiter.check("b").allowed).toBe(false);
  });

  it("refills tokens over time up to capacity", () => {
    const { limiter, advance } = limiterWithClock(2, 2);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(false);
    advance(500); // 0.5s * 2/s = 1 token
    expect(limiter.check("k")).toEqual({ allowed: true, remaining: 0, retryAfterMs: 0 });
    advance(5000); // would overfill to ~10, capped at 2
    expect(limiter.remaining("k")).toBe(2);
  });

  it("retryAfterMs reflects time until the next token", () => {
    const { limiter, advance } = limiterWithClock(1, 2); // 2 tokens/sec → 500ms each
    limiter.check("k");
    const denied = limiter.check("k");
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterMs).toBeGreaterThanOrEqual(490);
    expect(denied.retryAfterMs).toBeLessThanOrEqual(500);
    advance(denied.retryAfterMs);
    expect(limiter.check("k").allowed).toBe(true);
  });

  it("reset clears a key's bucket to full capacity", () => {
    const { limiter } = limiterWithClock(1, 1);
    expect(limiter.check("k").allowed).toBe(true);
    expect(limiter.check("k").allowed).toBe(false);
    limiter.reset("k");
    expect(limiter.check("k").allowed).toBe(true);
  });

  it("never goes negative and reports remaining >= 0", () => {
    const { limiter } = limiterWithClock(1, 1);
    limiter.check("k");
    const d = limiter.check("k");
    expect(d.remaining).toBe(0);
    expect(limiter.remaining("k")).toBeGreaterThanOrEqual(0);
  });

  it("evicts the oldest key when maxKeys is exceeded", () => {
    const limiter = createRateLimiter({ capacity: 1, refillRate: 1, now: () => 1000, maxKeys: 2 });
    limiter.check("a"); // map: {a}
    limiter.check("b"); // map: {a, b}
    limiter.check("c"); // map: {b, c} — "a" evicted
    // "a" was evicted → re-checking gets a fresh full bucket.
    // Re-adding "a" evicts "b" (now the oldest), so map becomes {c, a}.
    expect(limiter.check("a").allowed).toBe(true);
    // "c" is still in the map and was exhausted → denied.
    expect(limiter.check("c").allowed).toBe(false);
  });

  it("remaining() does not mutate the bucket", () => {
    const { limiter, advance } = limiterWithClock(2, 1);
    limiter.check("k");
    limiter.check("k");
    expect(limiter.remaining("k")).toBe(0);
    advance(1000); // 1 token refilled
    // remaining() should see the refilled token but not consume it
    expect(limiter.remaining("k")).toBe(1);
    // check() should still see that token (remaining() didn't consume it)
    expect(limiter.check("k").allowed).toBe(true);
  });
});
