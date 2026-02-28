// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier";

export default withNuxt(
  // Disable ESLint rules that conflict with Prettier (must be last)
  eslintConfigPrettier
);
