import { describe, expect, it } from "vitest";
import { createState } from "../src/create-state.ts";
import { flush } from "./helpers.ts";

describe("mutate", () => {
  it("applies optimistic update and keeps result on success", async () => {
    const state = createState();
    const q = state.query({
      key: ["task", 1],
      fetch: async () => ({ id: 1, done: false }),
    });
    await flush();
    expect(q.data.value).toEqual({ id: 1, done: false });

    const result = await state.mutate({
      key: ["task", 1],
      optimistic: (t) => ({ ...t!, done: true }),
      commit: async () => ({ id: 1, done: true }),
    });

    expect(result).toEqual({ id: 1, done: true });
    expect(q.data.value).toEqual({ id: 1, done: true });
  });

  it("rolls back optimistic update on failure", async () => {
    const state = createState();
    const q = state.query({
      key: ["task", 2],
      fetch: async () => ({ id: 2, done: false }),
    });
    await flush();

    await expect(
      state.mutate({
        key: ["task", 2],
        optimistic: (t) => ({ ...t!, done: true }),
        commit: async () => {
          throw new Error("network");
        },
      }),
    ).rejects.toThrow("network");

    expect(q.data.value).toEqual({ id: 2, done: false });
  });

  it("creates cache entry when mutating without prior query", async () => {
    const state = createState();
    const result = await state.mutate({
      key: ["new", 1],
      optimistic: () => ({ id: 1, done: true }),
      commit: async () => ({ id: 1, done: true }),
    });
    expect(result).toEqual({ id: 1, done: true });

    // Subsequent query with same key should see the data
    const q = state.query({
      key: ["new", 1],
      fetch: async () => ({ id: 1, done: false }),
    });
    // Already success from mutate — may not refetch if not stale
    expect(q.data.value).toEqual({ id: 1, done: true });
  });

  it("invalidates related keys after success", async () => {
    const state = createState();
    let listCalls = 0;
    const list = state.query({
      key: ["tasks"],
      fetch: async () => {
        listCalls += 1;
        return [{ id: 1 }];
      },
    });
    await flush();
    expect(listCalls).toBe(1);

    await state.mutate({
      key: ["task", 1],
      commit: async () => ({ id: 1, done: true }),
      invalidate: [["tasks"]],
    });
    await flush();
    expect(listCalls).toBe(2);
    expect(list.data.value).toEqual([{ id: 1 }]);
  });
});
