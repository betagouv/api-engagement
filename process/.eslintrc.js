module.exports = {
  extends: [
    'airbnb-typescript/base',
    'prettier',
    '../.eslintrc.base.js',
  ],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  rules: {
    'no-underscore-dangle': 'off',
    '@typescript-eslint/dot-notation': 'off',
    '@typescript-eslint/no-shadow': 'off', // TODO: fix code and activate
    '@typescript-eslint/no-use-before-define': 'off', // TODO: fix code and activate
    '@typescript-eslint/no-throw-literal': 'off', // TODO: fix code and activate
    '@typescript-eslint/no-unused-vars': 'off', // TODO: fix code and activate
    '@typescript-eslint/naming-convention': 'off', // TODO: fix code and activate
    '@typescript-eslint/no-loop-func': 'off', // TODO: fix code and activate
    'import/extensions': 'off',
    'import/no-extraneous-dependencies': 'off',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
};
