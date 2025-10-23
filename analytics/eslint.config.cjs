const js = require("@eslint/js");
const tsPlugin = require("@typescript-eslint/eslint-plugin");
const tsParser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");

module.exports = [
  // Ignores
  {
    ignores: ["node_modules", "dist", "scripts", "src/static", "coverage", ".github", "*.js.map", "*.d.ts", "eslint.config.*", ".eslintrc.*"],
  },

  // Base JS recommended
  js.configs.recommended,

  // TypeScript-specific configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: __dirname,
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      import: importPlugin,
    },
    rules: {
      // Base rules
      "import/prefer-default-export": "off",
      "no-console": "off",
      "no-control-regex": "off",
      curly: ["error", "all"],
      "no-undef": "off",
      "no-unused-vars": "off",

      // Import plugin adjustments
      "import/extensions": "off",
      "import/no-extraneous-dependencies": "off",
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".jsx", ".ts", ".tsx"],
        },
      },
    },
  },
];
