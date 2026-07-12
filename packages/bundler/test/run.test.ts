import { describe, expect, it, vi } from "vitest";
import { runCommand } from "../src/run.ts";

describe("runCommand", () => {
  it("returns exit code 0 for a successful command", async () => {
    const result = await runCommand({
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(0);
  });

  it("returns non-zero exit code on failure", async () => {
    const result = await runCommand({
      command: process.execPath,
      args: ["-e", "process.exit(7)"],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(7);
  });

  it("logs and returns code 1 when spawn fails for a missing allowlisted bin", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    // Basename must pass the allowlist so we exercise the spawn error path
    const result = await runCommand({
      command: "/nonexistent/oxfmt",
      args: [],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/failed to spawn .*oxfmt/));
    errSpy.mockRestore();
  });

  it("rejects absolute paths whose basename is not allowlisted", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runCommand({
      command: "/usr/bin/curl",
      args: [],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/allowlist|refusing/i));
    errSpy.mockRestore();
  });

  it("rejects relative command paths", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runCommand({
      command: "oxfmt",
      args: ["--version"],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringMatching(/absolute|refusing|invalid command/i),
    );
    errSpy.mockRestore();
  });

  it("rejects NUL bytes in command", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runCommand({
      command: `/tmp/evil\0cmd`,
      args: [],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it("rejects NUL bytes in args", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runCommand({
      command: process.execPath,
      args: ["-e", "process.exit(0)", "bad\0arg"],
      cwd: process.cwd(),
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/NUL|null byte|invalid arg/i));
    errSpy.mockRestore();
  });

  it("rejects NUL bytes in cwd", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await runCommand({
      command: process.execPath,
      args: ["-e", "process.exit(0)"],
      cwd: `/tmp/bad\0cwd`,
    });
    expect(result.code).toBe(1);
    expect(errSpy).toHaveBeenCalledWith(expect.stringMatching(/cwd|NUL|null byte|invalid/i));
    errSpy.mockRestore();
  });
});
