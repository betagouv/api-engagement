module.exports = {
  extends: [
    'airbnb-typescript/base',
    'prettier',
    '../.eslintrc.base.js',
  ],
  parserOptions: {
    project: './tsconfig.json',
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
    '@typescript-eslint/no-redeclare': 'off', // TODO: fix code and activate
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_|next$',
      varsIgnorePattern: '^_'
    }],
    
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
