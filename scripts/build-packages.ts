/**
 * Topological build of @fixerframework/* packages (dist-only exports).
 * Order: bundler → types → utils → independents → state → ui
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");

const stages: string[][] = [
  ["@fixerframework/bundler"],
  ["@fixerframework/types"],
  ["@fixerframework/utils"],
  [
    "@fixerframework/animation",
    "@fixerframework/router",
    "@fixerframework/adapters",
    "@fixerframework/auth",
    "@fixerframework/db",
  ],
  ["@fixerframework/state"],
  ["@fixerframework/ui"],
];

function run(filter: string): number {
  console.log(`\n[build] ${filter}`);
  const result = spawnSync(
    "bun",
    ["run", "--filter", filter, "build"],
    { cwd: root, stdio: "inherit", shell: false },
  );
  return result.status ?? 1;
}

for (const stage of stages) {
  // Sequential within stage is simpler and avoids filter quirks; parallelize only independents.
  if (stage.length === 1) {
    const code = run(stage[0]!);
    if (code !== 0) process.exit(code);
    continue;
  }

  const results = await Promise.all(
    stage.map(
      (name) =>
        new Promise<number>((resolve) => {
          console.log(`\n[build] ${name}`);
          const child = spawnSync("bun", ["run", "--filter", name, "build"], {
            cwd: root,
            stdio: "inherit",
            shell: false,
          });
          resolve(child.status ?? 1);
        }),
    ),
  );
  const failed = results.find((c) => c !== 0);
  if (failed !== undefined) process.exit(failed);
}

console.log("\n[build] all packages ok");
