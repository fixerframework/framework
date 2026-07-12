#!/usr/bin/env bun
/**
 * Dev workspace entry: runs TypeScript sources via Bun.
 * Published bin is dist/cli.js (built). Prefer `fixer-bundle` after `bun run build`.
 */
import { main } from "../src/cli.ts";

const code = await main(process.argv.slice(2));
process.exit(code);
