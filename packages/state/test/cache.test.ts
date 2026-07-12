import { describe, expect, it } from "vitest";
import { serializeKey, keyMatchesPrefix } from "../src/core/serialize-key.ts";
import { createState } from "../src/create-state.ts";
import { deferred, flush } from "./helpers.ts";

describe("serializeKey", () => {
  it("is order-independent for object keys", () => {
    expect(serializeKey([{ a: 1, b: 2 }])).toBe(serializeKey([{ b: 2, a: 1 }]));
  });

  it("distinguishes different keys", () => {
    expect(serializeKey(["projects"])).not.toBe(serializeKey(["tasks"]));
    expect(serializeKey(["projects", 1])).not.toBe(serializeKey(["projects", 2]));
  });

  it("prefix matching works element-wise", () => {
    expect(keyMatchesPrefix(["projects", 1], ["projects"])).toBe(true);
    expect(keyMatchesPrefix(["projects"], ["projects", 1])).toBe(false);
    expect(keyMatchesPrefix(["tasks", 1], ["projects"])).toBe(false);
  });
});

describe("query cache", () => {
  it("dedupes in-flight fetches for the same key", async () => {
    const state = createState();
    let calls = 0;
    const d = deferred<string>();

    const fetch = async () => {
      calls += 1;
      return d.promise;
    };

    const q1 = state.query({ key: ["projects"], fetch });
    const q2 = state.query({ key: ["projects"], fetch });

    expect(q1.data).toBe(q2.data);
    await flush();
    expect(calls).toBe(1);

    d.resolve("ok");
    await flush();
    expect(q1.data.value).toBe("ok");
    expect(q2.data.value).toBe("ok");
    expect(q1.status.value).toBe("success");
  });

  it("respects staleAfter and refetches when stale", async () => {
    const state = createState({ staleAfter: 10 });
    let calls = 0;
    const q = state.query({
      key: ["stale"],
      staleAfter: 10,
      fetch: async () => {
        calls += 1;
        return calls;
      },
    });

    await flush();
    expect(q.data.value).toBe(1);
    expect(q.isStale.value).toBe(false);

    // Fresh: invalidate forces stale + refetch
    state.invalidate(["stale"]);
    await flush();
    expect(calls).toBe(2);
    expect(q.data.value).toBe(2);
  });
});
