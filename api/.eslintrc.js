module.exports = {
  extends: ["airbnb-typescript/base", "prettier", "../.eslintrc.base.js"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "import"],
  rules: {
    "no-underscore-dangle": "off",
    "@typescript-eslint/dot-notation": "off",
    "@typescript-eslint/no-shadow": "off", // TODO: fix code and activate
    "@typescript-eslint/no-use-before-define": "off", // TODO: fix code and activate
    "@typescript-eslint/no-redeclare": "off", // TODO: fix code and activate
    "@typescript-eslint/no-unused-vars": "off", // TODO: fix code and activate
    "@typescript-eslint/no-explicit-any": "off", // TODO: fix code and activate
    "@typescript-eslint/no-this-alias": "off", // TODO: fix code and activate
    "no-self-assign": "off", // TODO: fix code and activate
    "no-constant-condition": "off", // TODO: fix code and activate
    "no-empty": "off", // TODO: fix code and activate
    "no-useless-escape": "off", // TODO: fix code and activate

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
};
