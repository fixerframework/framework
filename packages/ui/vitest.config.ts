import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest 4 uses oxc; set jsx for Preact
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "preact",
    },
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
