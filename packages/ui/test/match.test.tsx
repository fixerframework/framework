import { signal } from "@preact/signals-core";
import { afterEach, describe, expect, it } from "vitest";
import { Match } from "../src/state/match.tsx";
import { cleanup, flush, mount } from "./helpers.ts";

afterEach(() => cleanup());

describe("Match", () => {
  it("renders matching case", () => {
    const el = mount(
      <Match value={"success" as "pending" | "success" | "error"}>
        {{
          pending: () => <span>p</span>,
          success: () => <span>s</span>,
          error: () => <span>e</span>,
        }}
      </Match>,
    );
    expect(el.textContent).toBe("s");
  });

  it("tracks signal and uses fallback", async () => {
    const status = signal<"idle" | "ready">("idle");
    const el = mount(
      <Match value={status}>
        {{
          ready: () => <span>ready</span>,
          _: () => <span>other</span>,
        }}
      </Match>,
    );
    expect(el.textContent).toBe("other");
    status.value = "ready";
    await flush();
    expect(el.textContent).toBe("ready");
  });
});
