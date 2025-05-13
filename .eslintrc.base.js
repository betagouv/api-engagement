module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:import/typescript", "prettier"],
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "import/prefer-default-export": "off",
    "no-console": "off",
    curly: ["error", "all"],
  },
  env: {
    node: true,
    es6: true,
  },
};
