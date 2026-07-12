import { describe, expect, it } from "vitest";
import { createState } from "../src/create-state.ts";
import { createMockAuth, flush } from "./helpers.ts";

describe("auth scope", () => {
  it("does not fetch user-scoped queries until auth is loaded and signed in", async () => {
    const auth = createMockAuth({ isLoaded: false, userId: null });
    const state = createState({ auth });
    let calls = 0;
    const q = state.query({
      key: ["projects"],
      scope: "user",
      fetch: async ({ token }) => {
        calls += 1;
        return { token, items: [] };
      },
    });

    await flush();
    expect(calls).toBe(0);
    expect(q.status.value).toBe("idle");

    auth.setLoaded(true);
    await flush();
    expect(calls).toBe(0);

    auth.setUserId("user_1");
    await flush();
    expect(calls).toBe(1);
    expect(q.data.value).toEqual({ token: "test-token", items: [] });
    expect(q.status.value).toBe("success");
  });

  it("passes token from getToken into fetch context", async () => {
    const auth = createMockAuth({ isLoaded: true, userId: "u", token: "abc" });
    const state = createState({ auth });
    let seen: string | null = null;
    state.query({
      key: ["t"],
      scope: "user",
      fetch: async ({ token }) => {
        seen = token;
        return 1;
      },
    });
    await flush();
    expect(seen).toBe("abc");
  });

  it("clears user-scoped cache on sign-out", async () => {
    const auth = createMockAuth({ isLoaded: true, userId: "u1" });
    const state = createState({ auth });
    const q = state.query({
      key: ["me"],
      scope: "user",
      fetch: async () => ({ name: "Ada" }),
    });
    await flush();
    expect(q.data.value).toEqual({ name: "Ada" });

    auth.setUserId(null);
    await flush();
    expect(q.data.value).toBeUndefined();
    expect(q.status.value).toBe("idle");
  });

  it("invalidates and clears data when switching users", async () => {
    const auth = createMockAuth({ isLoaded: true, userId: "u1", token: "t1" });
    const state = createState({ auth });
    let calls = 0;
    const q = state.query({
      key: ["profile"],
      scope: "user",
      fetch: async ({ token }) => {
        calls += 1;
        return { token, n: calls };
      },
    });
    await flush();
    expect(q.data.value).toEqual({ token: "t1", n: 1 });

    auth.setToken("t2");
    auth.setUserId("u2");
    await flush();
    expect(calls).toBe(2);
    expect(q.data.value).toEqual({ token: "t2", n: 2 });
  });
});
