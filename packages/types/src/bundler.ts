import type { UserConfig } from "vite";
import type { ViteUserConfig } from "vitest/config";

export type BuildMode = "lib" | "app" | "server";

export type CliOptions = {
  mode: BuildMode;
  cwd: string;
  format: boolean;
  lint: boolean;
  typecheck: boolean;
  test: boolean;
  build: boolean;
  formatCheck: boolean;
  watch: boolean;
  config?: string;
};

/** Relative path(s) from package root. Object keys become dist file basenames (may include `/`). */
export type LibEntry = string | Record<string, string>;

export type CopyAsset = {
  /** Source path relative to package cwd */
  from: string;
  /** Destination path relative to outDir (or absolute under outDir) */
  to: string;
};

export type LibConfigOptions = {
  entry?: LibEntry;
  outDir?: string;
  cwd?: string;
  /** Static files to copy into outDir after the JS build (e.g. theme.css). */
  copy?: CopyAsset[];
  /**
   * Entry name that should get a Node shebang banner (e.g. `"cli"`).
   * Only applied when that entry is present in a multi-entry map.
   */
  binEntry?: string;
} & UserConfig;

export type AppConfigOptions = {
  outDir?: string;
  cwd?: string;
} & UserConfig;

export type ServerConfigOptions = {
  entry?: string;
  outDir?: string;
  cwd?: string;
} & UserConfig;

export type VitestConfigOptions = ViteUserConfig;
