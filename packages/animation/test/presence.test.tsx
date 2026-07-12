import { afterEach, describe, expect, it } from "vitest";
import { useState } from "preact/hooks";
import { AnimatePresence } from "../src/presence/animate-presence.tsx";
import { motion } from "../src/preact/motion-proxy.ts";
import { __setReducedMotionOverride } from "../src/core/reduced-motion.ts";
import { advanceFrames, cleanup, flush, mount } from "./helpers.ts";

function PresenceHarness({ startOpen = true }: { startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div>
      <button type="button" data-testid="toggle" onClick={() => setOpen((o) => !o)}>
        toggle
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="panel"
            data-testid="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "tween", duration: 0.05 }}
          >
            panel
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

afterEach(() => cleanup());

describe("AnimatePresence", () => {
  it("keeps exiting node until exit completes", async () => {
    __setReducedMotionOverride(false);
    const root = mount(<PresenceHarness />);
    await flush();
    expect(root.querySelector("[data-testid=panel]")).not.toBeNull();

    (root.querySelector("[data-testid=toggle]") as HTMLButtonElement).click();
    await flush();
    // still present while exiting
    expect(root.querySelector("[data-testid=panel]")).not.toBeNull();

    advanceFrames(80);
    await flush();
    await flush();
    const panel = root.querySelector("[data-testid=panel]") as HTMLElement | null;
    if (panel) {
      expect(Number(panel.style.opacity)).toBeLessThanOrEqual(0.15);
    } else {
      expect(panel).toBeNull();
    }
  });

  it("removes immediately under reduced motion", async () => {
    __setReducedMotionOverride(true);
    const root = mount(<PresenceHarness />);
    await flush();
    (root.querySelector("[data-testid=toggle]") as HTMLButtonElement).click();
    await flush();
    advanceFrames(5);
    await flush();
    expect(root.querySelector("[data-testid=panel]")).toBeNull();
  });
});
