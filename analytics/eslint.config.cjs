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

      // Proper API rules
      // We should fix code and activate each rule
      "no-underscore-dangle": "off",
      "@typescript-eslint/dot-notation": "off",
      "@typescript-eslint/no-shadow": "off",
      "@typescript-eslint/no-use-before-define": "off",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-this-alias": "off",
      "no-self-assign": "off",
      "no-constant-condition": "off",
      "no-import-assign": "off",
      "no-empty": "off",
      "no-undef": "off",
      "no-useless-escape": "off",
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
