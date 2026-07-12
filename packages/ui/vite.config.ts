import { defineLibConfig } from "@fixerframework/bundler/vite/lib";

export default defineLibConfig({
  copy: [{ from: "src/styles/theme.css", to: "theme.css" }],
});
