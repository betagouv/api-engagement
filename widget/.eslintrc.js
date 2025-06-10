/**
 * ESLint configuration for the merged 'widget/' directory
 */
module.exports = {
  extends: ["../.eslintrc.base.js"], // Extends the project's base ESLint config
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "out/",
    "public/",
    "next.config.js", // CommonJS
  ],
  overrides: [
    {
      // Specific configuration for Playwright test files
      files: ["tests/**/*.ts", "playwright.config.ts"],
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module", // Important for ES6 modules in tests
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
        // Disable TypeScript-specific rules that might be too strict for tests
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-explicit-any": "off",
      },
    },
    {
      // Configuration for JavaScript files (e.g., .js, .jsx)
      // This ensures that our React components and pages are parsed correctly.
      files: ["**/*.js", "**/*.jsx"],
      parserOptions: {
        ecmaVersion: "latest", // Use the latest ECMAScript version
        sourceType: "module", // Crucial for 'import' statements
        ecmaFeatures: {
          jsx: true, // Enable JSX parsing
        },
      },
      env: {
        browser: true, // For browser global variables
        node: true, // For Node.js global variables and Node.js scoping.
        es2021: true, // Enables ES2021 globals.
      },
      settings: {
        react: {
          version: "detect", // Automatically detect the React version
        },
      },
    },
  ],
};
