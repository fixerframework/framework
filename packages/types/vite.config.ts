import { defineLibConfig } from "@fixerframework/bundler/vite/lib";

export default defineLibConfig({
  entry: {
    index: "./index.ts",
    auth: "./src/auth.ts",
    "auth-server": "./src/auth-server.ts",
    state: "./src/state.ts",
    db: "./src/db.ts",
    "db-drivers": "./src/db-drivers.ts",
    router: "./src/router.ts",
    animation: "./src/animation.ts",
    adapters: "./src/adapters.ts",
    ui: "./src/ui.ts",
    utils: "./src/utils.ts",
    bundler: "./src/bundler.ts",
  },
});
