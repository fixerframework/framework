import { describe, it, expect } from "vitest";
import { deferred, sleep, withTimeout } from "../index.ts";

describe("deferred", () => {
  it("resolves when resolve() is called", async () => {
    const d = deferred<string>();
    d.resolve("done");
    expect(await d.promise).toBe("done");
  });

  it("rejects when reject() is called", async () => {
    const d = deferred();
    d.reject(new Error("fail"));
    await expect(d.promise).rejects.toThrow("fail");
  });

  it("defaults to void", () => {
    const d = deferred();
    d.resolve();
    return expect(d.promise).resolves.toBeUndefined();
  });
});

describe("sleep", () => {
  it("resolves after the given delay", async () => {
    const start = Date.now();
    await sleep(20);
    expect(Date.now() - start).toBeGreaterThanOrEqual(15);
  });
});

describe("withTimeout", () => {
  it("returns the value if the promise settles in time", async () => {
    const result = await withTimeout(Promise.resolve("ok"), 1000);
    expect(result).toBe("ok");
  });

  it("rejects with a timeout error when the promise is too slow", async () => {
    const slow = sleep(500);
    await expect(withTimeout(slow, 30)).rejects.toThrow("timed out");
  });

  it("uses a custom error message", async () => {
    await expect(
      withTimeout(sleep(500), 10, "custom timeout"),
    ).rejects.toThrow("custom timeout");
  });

  it("propagates the original rejection if it comes first", async () => {
    const failing = Promise.reject(new Error("original"));
    await expect(withTimeout(failing, 1000)).rejects.toThrow("original");
  });
});
