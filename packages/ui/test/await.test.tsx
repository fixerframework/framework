import { signal } from "@preact/signals-core";
import type { Query, QueryStatus } from "@fixerframework/types/state";
import { afterEach, describe, expect, it } from "vitest";
import { Await } from "../src/state/await.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

function mockQuery<T>(partial: { data?: T; status?: QueryStatus; error?: unknown }): Query<T> {
  return {
    data: signal(partial.data),
    status: signal(partial.status ?? "idle"),
    error: signal(partial.error),
    isFetching: signal(false),
    isStale: signal(false),
    refetch: async () => {},
  };
}

afterEach(() => cleanup());

describe("Await", () => {
  it("shows pending when no data", () => {
    const q = mockQuery<string[]>({ status: "pending" });
    const el = mount(
      <Await query={q} pending={() => <span>loading</span>}>
        {(data) => <span>{data.join(",")}</span>}
      </Await>,
    );
    expect(el.textContent).toBe("loading");
  });

  it("shows children when data is present", () => {
    const q = mockQuery({ data: ["a", "b"], status: "success" });
    const el = mount(
      <Await query={q} pending={() => <span>loading</span>}>
        {(data) => <span>{data.join(",")}</span>}
      </Await>,
    );
    expect(el.textContent).toBe("a,b");
  });

  it("shows error branch", () => {
    const q = mockQuery<string>({ status: "error", error: new Error("boom") });
    const el = mount(
      <Await
        query={q}
        error={(e) => <span>{(e as Error).message}</span>}
        pending={() => <span>loading</span>}
      >
        {(data) => <span>{data}</span>}
      </Await>,
    );
    expect(el.textContent).toBe("boom");
  });

  it("keeps data visible while revalidating", () => {
    const q = mockQuery({ data: "stale", status: "pending" });
    const el = mount(
      <Await query={q} pending={() => <span>loading</span>}>
        {(data) => <span>{data}</span>}
      </Await>,
    );
    expect(el.textContent).toBe("stale");
  });

  it("updates when query signals change", async () => {
    const q = mockQuery<string>({ status: "pending" });
    const el = mount(
      <Await query={q} pending={() => <span>loading</span>}>
        {(data) => <span>{data}</span>}
      </Await>,
    );
    expect(el.textContent).toBe("loading");
    q.data.value = "done";
    q.status.value = "success";
    await flush();
    expect(el.textContent).toBe("done");
  });
});
