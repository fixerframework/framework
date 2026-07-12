import { describe, expect, it } from "vitest";
import { KNOWN_BINS, resolveBin } from "../src/resolve-bin.ts";
import { isTsPlatformShim } from "../src/steps/typecheck.ts";

describe("resolveBin", () => {
  it("resolves vitest from trusted package roots (no user cwd)", () => {
    const bin = resolveBin("vitest");
    expect(bin).toBeTruthy();
    expect(bin!.startsWith("/")).toBe(true);
  });

  it("resolves tsc from typescript package", () => {
    const bin = resolveBin("tsc");
    expect(bin).toBeTruthy();
    expect(bin!.startsWith("/")).toBe(true);
  });

  it("resolves oxfmt, oxlint, and vite from package deps", () => {
    for (const name of ["oxfmt", "oxlint", "vite"] as const) {
      const bin = resolveBin(name);
      expect(bin, name).toBeTruthy();
      expect(bin!.startsWith("/")).toBe(true);
    }
  });

  it("resolves tsgo from native-preview when present", () => {
    const bin = resolveBin("tsgo");
    // may be present via bundler package deps
    expect(bin === null || (typeof bin === "string" && bin.startsWith("/"))).toBe(true);
  });

  it("returns null for unknown tool names", () => {
    expect(resolveBin("curl")).toBeNull();
    expect(resolveBin("bash")).toBeNull();
    expect(resolveBin("node_modules/.bin/evil")).toBeNull();
    expect(resolveBin("")).toBeNull();
  });

  it("exposes a fixed allowlist of known bins", () => {
    expect(KNOWN_BINS.has("oxfmt")).toBe(true);
    expect(KNOWN_BINS.has("curl")).toBe(false);
  });
});

describe("isTsPlatformShim", () => {
  it("detects TypeScript 7 tsc platform shim when present", () => {
    const tsc = resolveBin("tsc");
    expect(tsc).toBeTruthy();
    if (!tsc) return;
    // Workspace uses TypeScript 7 — bin/tsc is the getExePath shim
    expect(isTsPlatformShim(tsc)).toBe(true);
  });
});
