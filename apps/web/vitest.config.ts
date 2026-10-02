import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const serverOnlyDirectory = dirname(createRequire(import.meta.url).resolve("server-only"));

export default defineConfig({
  // End-to-end specs run with Playwright, not Vitest.
  test: { exclude: [...configDefaults.exclude, "e2e/**"] },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
      // Tests run on the server: the guard against client-side imports is replaced by its empty variant.
      "server-only": join(serverOnlyDirectory, "empty.js"),
    },
  },
});
