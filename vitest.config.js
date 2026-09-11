import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Keep in sync with the "@/*" path mapping in jsconfig.json.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Every module under test is pure, so jsdom is unnecessary. A future
    // component test needs jsdom and @vitejs/plugin-react added first.
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,jsx,ts,tsx}", "base44/**/*.{test,spec}.ts"],
  },
});
