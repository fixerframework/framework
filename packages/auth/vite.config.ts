import { defineLibConfig } from "@fixerframework/bundler/vite/lib";

export default defineLibConfig({
  entry: {
    index: "./index.ts",
    server: "./server.ts",
  },
});
