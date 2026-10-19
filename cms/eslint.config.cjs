const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import-x");

module.exports = [
  { ignores: ["node_modules", "dist", "build", ".strapi", ".tmp", ".cache", "public", "types/generated", "database", "eslint.config.*"] },

  js.configs.recommended,

  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: ["./tsconfig.json"], tsconfigRootDir: __dirname, ecmaVersion: 2020, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tsPlugin, import: importPlugin },
    rules: {
      "no-console": "off",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      curly: ["error", "all"],
    },
  },
];
