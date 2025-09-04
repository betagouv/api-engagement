const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import");
const reactPlugin = require("eslint-plugin-react");
const reactHooksPlugin = require("eslint-plugin-react-hooks");
const jsxA11yPlugin = require("eslint-plugin-jsx-a11y");
const tsParser = require("@typescript-eslint/parser");
const globals = require("globals");
const nextPlugin = require("@next/eslint-plugin-next");

module.exports = [
  {
    ignores: ["node_modules/", ".next/", "out/", "public/", "next.config.js", "coverage/", "eslint.config.*", ".eslintrc.*"],
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

  // Base JS/JSX config
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    rules: {
      // From project base config
      "import/prefer-default-export": "off",
      "no-console": "off",
      "no-control-regex": "off",
      curly: ["error", "all"],

      // Relax rules (code should be fixed and rules activated)
      "import/no-extraneous-dependencies": "off",
      "no-unused-vars": "off",
    },
    settings: {
      react: { version: "detect" },
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
