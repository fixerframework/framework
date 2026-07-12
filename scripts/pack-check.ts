/**
 * Pack every publishable package with Bun (rewrites workspace:/catalog: to versions)
 * and delete the resulting tarballs. Fails if pack fails or packed deps still use
 * workspace:/catalog: protocols.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, rmSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const packagesDir = join(import.meta.dirname, "..", "packages");
const dirs = readdirSync(packagesDir).filter((name) =>
  statSync(join(packagesDir, name)).isDirectory(),
);

let failed = 0;

for (const name of dirs) {
  const cwd = join(packagesDir, name);
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
    name?: string;
    version?: string;
  };
  if (!pkg.name || !pkg.version) {
    console.error(`[pack:check] skip ${name}: missing name/version`);
    failed = 1;
    continue;
  }

  console.log(`\n[pack:check] ${pkg.name}@${pkg.version}`);
  const result = spawnSync("bun", ["pm", "pack"], {
    cwd,
    stdio: "inherit",
    shell: false,
  });
  if ((result.status ?? 1) !== 0) {
    failed = 1;
    console.error(`[pack:check] pack failed: ${name}`);
    continue;
  }

  // tarball name: @scope/name → scope-name-version.tgz (no @)
  const tarball = `${pkg.name.replace(/^@/, "").replace("/", "-")}-${pkg.version}.tgz`;
  const tarballPath = join(cwd, tarball);
  if (!existsSync(tarballPath)) {
    // try alternate naming
    const found = readdirSync(cwd).find((f) => f.endsWith(".tgz"));
    if (!found) {
      console.error(`[pack:check] no tarball produced for ${name}`);
      failed = 1;
      continue;
    }
    const alt = join(cwd, found);
    const check = inspectPackedJson(alt, pkg.name);
    if (!check.ok) {
      failed = 1;
      console.error(`[pack:check] ${check.error}`);
    }
    rmSync(alt);
    continue;
  }

  const check = inspectPackedJson(tarballPath, pkg.name);
  if (!check.ok) {
    failed = 1;
    console.error(`[pack:check] ${check.error}`);
  }
  rmSync(tarballPath);
}

process.exit(failed);

function inspectPackedJson(
  tarballPath: string,
  packageName: string,
): { ok: true } | { ok: false; error: string } {
  const extracted = spawnSync("tar", ["-xOf", tarballPath, "package/package.json"], {
    encoding: "utf8",
    shell: false,
  });
  if ((extracted.status ?? 1) !== 0 || !extracted.stdout) {
    return { ok: false, error: `${packageName}: could not read packed package.json` };
  }
  let packed: {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  try {
    packed = JSON.parse(extracted.stdout);
  } catch {
    return { ok: false, error: `${packageName}: invalid packed package.json` };
  }

  for (const [field, deps] of [
    ["dependencies", packed.dependencies],
    ["peerDependencies", packed.peerDependencies],
  ] as const) {
    if (!deps) continue;
    for (const [dep, ver] of Object.entries(deps)) {
      if (ver.startsWith("workspace:") || ver.startsWith("catalog:")) {
        return {
          ok: false,
          error: `${packageName}: ${field}.${dep} still has protocol dep "${ver}" (use bun publish / bun pm pack with workspace:*)`,
        };
      }
    }
  }
  return { ok: true };
}
