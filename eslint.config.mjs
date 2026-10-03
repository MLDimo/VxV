import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import nextVitals from "eslint-config-next/core-web-vitals";
import globals from "globals";
import tseslint from "typescript-eslint";

const WEB_FILES = ["apps/web/**/*.{ts,tsx}"];

// Next.js rules (React, hooks, accessibility, Core Web Vitals) for the web app only.
// TypeScript rules come from typescript-eslint strict below, so Next's own TypeScript preset is skipped.
// Next's parser is dropped as well: the typescript-eslint parser understands type-only imports.
const nextRules = nextVitals
  .filter((config) => config.name === "next" || config.name === "next/core-web-vitals")
  .map((config) => {
    const languageOptions = { ...config.languageOptions };
    delete languageOptions.parser;
    return {
      ...config,
      languageOptions,
      files: WEB_FILES,
      settings: { ...config.settings, next: { rootDir: "apps/web" } },
    };
  });

export default tseslint.config(
  {
    ignores: ["**/node_modules/", "dist/", ".vercel/", "tools/VXV_Probe/", "apps/web/.next/", "apps/web/next-env.d.ts"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...nextRules,
  // Clean architecture: the domain depends on nothing, use cases only know ports (tests wire real adapters).
  {
    files: ["packages/server/src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["**/application/**", "**/infrastructure/**", "pg"], message: "The domain depends on nothing." },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/server/src/application/**/*.ts"],
    ignores: ["**/*.test.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [{ group: ["**/infrastructure/**", "pg"], message: "Use cases only depend on ports." }] },
      ],
    },
  },
  {
    files: ["tools/probe-harness/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  prettier,
);
