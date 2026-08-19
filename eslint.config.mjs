import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
  globalIgnores(["dist/**", ".turbo/**", "node_modules/**", "generated/**"]),
]);

export default eslintConfig;
