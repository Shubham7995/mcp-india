import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@mcp-india/shared": path.resolve(__dirname, "../shared/src/index.ts"),
    },
  },
  test: {
    globals: false,
  },
});
