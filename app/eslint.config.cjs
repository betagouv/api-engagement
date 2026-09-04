const js = require("@eslint/js");
const importPlugin = require("eslint-plugin-import-x");
const jsxA11y = require("eslint-plugin-jsx-a11y");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/", "dist/", "server/", "public/", "eslint.config.*"],
  },

  js.configs.recommended,

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
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "jsx-a11y/no-redundant-roles": "off",
      "import/prefer-default-export": "off",
      "no-console": "off",
      "no-control-regex": "off",
      curly: "off",

      // Enforce @/ alias instead of relative parent imports
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["../*"],
              message: "Use @/ alias instead of relative parent imports (e.g. @/components/Foo).",
            },
          ],
        },
      ],

      "import/no-extraneous-dependencies": "off",
      "no-unused-vars": "off",
    },
  },
];
