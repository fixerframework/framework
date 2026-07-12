import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the browser SDK: the package's own signal/listener logic is what we test.
const clerkListeners = new Set<() => void>();
const mockClerk = {
  user: null as { id: string } | null,
  session: { getToken: vi.fn() } as { getToken: () => Promise<string | null> },
  load: vi.fn(async () => {
    for (const cb of clerkListeners) cb();
  }),
  addListener: vi.fn((cb: () => void) => {
    clerkListeners.add(cb);
    return () => clerkListeners.delete(cb);
  }),
};

vi.mock("@clerk/clerk-js", () => ({
  Clerk: vi.fn(function Clerk() {
    return mockClerk;
  }),
}));

import { createClerkAuth } from "../src/clerk-auth.ts";

beforeEach(() => {
  clerkListeners.clear();
  mockClerk.user = null;
  mockClerk.session.getToken = vi.fn(async () => "session-jwt");
  mockClerk.load.mockClear();
  mockClerk.addListener.mockClear();
});

describe("createClerkAuth", () => {
  it("starts unloaded with no identity, then loads and syncs the user id", async () => {
    mockClerk.user = { id: "user_7" };
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });

    expect(auth.isLoaded.value).toBe(false);
    expect(auth.userId.value).toBeNull();

    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(auth.userId.value).toBe("user_7");
  });

  it("reports null identity when Clerk loads without a session", async () => {
    mockClerk.user = null;
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(auth.userId.value).toBeNull();
  });

  it("getToken returns null when there is no session token available", async () => {
    mockClerk.session = { getToken: async () => null };
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(await auth.getToken()).toBeNull();
  });

  it("getToken surfaces the Clerk session token", async () => {
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(await auth.getToken()).toBe("session-jwt");
  });

  it("onChange fires with prev/next only when the identity actually changes", async () => {
    mockClerk.user = { id: "u1" };
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    const events: Array<[string | null, string | null]> = [];
    auth.onChange((prev, next) => events.push([prev, next]));

    await vi.waitFor(() => expect(auth.userId.value).toBe("u1"));
    // First sync fires null -> u1.
    expect(events).toEqual([[null, "u1"]]);

    // Simulate Clerk emitting a user change to the same id — no event.
    mockClerk.user = { id: "u1" };
    for (const cb of clerkListeners) cb();
    expect(events).toHaveLength(1);

    // Now change to a new user.
    mockClerk.user = { id: "u2" };
    for (const cb of clerkListeners) cb();
    expect(events).toEqual([
      [null, "u1"],
      ["u1", "u2"],
    ]);
  });

  it("onChange unsubscribe stops further callbacks", async () => {
    mockClerk.user = { id: "u1" };
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    let calls = 0;
    const off = auth.onChange(() => {
      calls++;
    });
    await vi.waitFor(() => expect(calls).toBe(1));
    off();

    mockClerk.user = { id: "u2" };
    for (const cb of clerkListeners) cb();
    expect(calls).toBe(1);
  });

  it("forwards loadOptions to Clerk.load", async () => {
    const auth = createClerkAuth({ publishableKey: "pk_test_x", loadOptions: { afterSignOutUrl: "/bye" } });
    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(mockClerk.load).toHaveBeenCalledWith({ afterSignOutUrl: "/bye" });
  });

  it("marks loaded and clears identity when Clerk.load rejects", async () => {
    mockClerk.load.mockRejectedValueOnce(new Error("network"));
    const auth = createClerkAuth({ publishableKey: "pk_test_x" });
    await vi.waitFor(() => expect(auth.isLoaded.value).toBe(true));
    expect(auth.userId.value).toBeNull();
  });
});
