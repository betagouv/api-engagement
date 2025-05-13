/**
 * ESLint configuration for widget-benevolat
 * Currently only linting test files and configuration files
 *
 * TODO: Extend linting to the entire widget directory
 */
module.exports = {
  extends: ["../.eslintrc.base.js"],
  ignorePatterns: [
    // Ignore everything except tests and config files for now
    "node_modules/",
    ".next/",
    "public/",
    "out/",
    "src/",
  ],
  overrides: [
    {
      files: ["tests/**/*.ts", "playwright.config.ts"],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      env: {
        browser: true,
        node: true,
        es6: true,
      },
      rules: {
        // Allow console logs in tests
        "no-console": "off",
        // Allow test files to use dev dependencies
        "import/no-extraneous-dependencies": "off",
        // Disable TypeScript-specific rules that are too strict for tests
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
  ],
};
