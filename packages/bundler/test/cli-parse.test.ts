import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseArgs } from "../src/cli.ts";

describe("parseArgs", () => {
  it("requires --mode", () => {
    const result = parseArgs(["--cwd", "/tmp"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(2);
      expect(result.message).toMatch(/mode/i);
    }
  });

  it("rejects invalid mode", () => {
    const result = parseArgs(["--mode", "wasm"]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.exitCode).toBe(2);
  });

  it("parses defaults and skip flags", () => {
    const result = parseArgs([
      "--mode",
      "lib",
      "--cwd",
      "/pkg",
      "--no-format",
      "--no-build",
      "--format-check",
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.options.mode).toBe("lib");
      expect(result.options.cwd).toBe(resolve("/pkg"));
      expect(result.options.format).toBe(false);
      expect(result.options.build).toBe(false);
      expect(result.options.formatCheck).toBe(true);
      expect(result.options.lint).toBe(true);
      expect(result.options.typecheck).toBe(true);
      expect(result.options.test).toBe(true);
      expect(result.options.watch).toBe(false);
    }
  });

  it("parses app and server modes and --config", () => {
    const app = parseArgs(["--mode", "app", "--config", "./vite.config.ts"]);
    expect(app.ok).toBe(true);
    if (app.ok) {
      expect(app.options.mode).toBe("app");
      expect(app.options.config).toBe(resolve(process.cwd(), "./vite.config.ts"));
    }
    const server = parseArgs(["--mode", "server"]);
    expect(server.ok).toBe(true);
    if (server.ok) expect(server.options.mode).toBe("server");
  });

  it("rejects NUL bytes in --cwd", () => {
    const result = parseArgs(["--mode", "lib", "--cwd", "/tmp/bad\0path"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(2);
      expect(result.message).toMatch(/cwd|NUL|null|invalid path/i);
    }
  });

  it("rejects NUL bytes in --config", () => {
    const result = parseArgs(["--mode", "lib", "--config", "./vite\0.config.ts"]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.exitCode).toBe(2);
      expect(result.message).toMatch(/config|NUL|null|invalid path/i);
    }
  });
});
