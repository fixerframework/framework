import { describe, expect, it } from "vitest";
import { createState } from "../src/create-state.ts";
import { deferred, flush } from "./helpers.ts";

describe("query", () => {
  it("transitions idle → pending → success", async () => {
    const state = createState();
    const d = deferred<number>();
    const q = state.query({
      key: ["n"],
      fetch: async () => d.promise,
    });

    expect(q.status.value).toBe("pending");
    expect(q.isFetching.value).toBe(true);

    d.resolve(42);
    await flush();
    expect(q.status.value).toBe("success");
    expect(q.data.value).toBe(42);
    expect(q.isFetching.value).toBe(false);
    expect(q.isStale.value).toBe(false);
  });

  it("sets error status and recovers on refetch", async () => {
    const state = createState();
    let fail = true;
    const q = state.query({
      key: ["err"],
      fetch: async () => {
        if (fail) throw new Error("boom");
        return "ok";
      },
    });

    await flush();
    expect(q.status.value).toBe("error");
    expect((q.error.value as Error).message).toBe("boom");

    fail = false;
    await q.refetch();
    expect(q.status.value).toBe("success");
    expect(q.data.value).toBe("ok");
  });

  it("respects enabled gating", async () => {
    const state = createState();
    let enabled = false;
    let calls = 0;
    const q = state.query({
      key: ["dep"],
      enabled: () => enabled,
      fetch: async () => {
        calls += 1;
        return "data";
      },
    });

    await flush();
    expect(calls).toBe(0);
    expect(q.status.value).toBe("idle");

    enabled = true;
    await q.refetch();
    expect(calls).toBe(1);
    expect(q.data.value).toBe("data");
  });

  it("keeps previous data while refetching after success", async () => {
    const state = createState();
    const d = deferred<string>();
    let n = 0;
    const q = state.query({
      key: ["keep"],
      fetch: async () => {
        n += 1;
        if (n === 1) return "first";
        return d.promise;
      },
    });

    await flush();
    expect(q.data.value).toBe("first");

    const p = q.refetch();
    await flush();
    expect(q.data.value).toBe("first");
    expect(q.isFetching.value).toBe(true);
    expect(q.status.value).toBe("success");

    d.resolve("second");
    await p;
    expect(q.data.value).toBe("second");
  });
});
