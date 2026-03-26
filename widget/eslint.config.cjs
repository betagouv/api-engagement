const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import-x");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const nextPlugin = require("@next/eslint-plugin-next");

module.exports = [
  {
    ignores: ["node_modules/", ".next/", "out/", "public/", "next.config.js", "postcss.config.js", "instrumentation-node.js", "coverage/", "eslint.config.*", ".eslintrc.*"],
  },

  // Apply @eslint/js recommended (and override rules)
  js.configs.recommended,

  // Next.js config
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  // Playwright test files (TS)
  {
    files: ["tests/**/*.ts", "playwright.config.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
    },
    rules: {
      "no-console": "off",
      "import/no-extraneous-dependencies": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-unused-vars": "off",
    },
  },
];
