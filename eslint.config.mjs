import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/", "dist/", "tools/VXV_Probe/"] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    files: ["tools/probe-harness/**/*.js"],
    languageOptions: { sourceType: "commonjs", globals: globals.node },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  prettier,
);
