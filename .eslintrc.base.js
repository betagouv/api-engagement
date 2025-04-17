module.exports = {
  // Ne pas inclure les plugins ou les extensions ici
  // Seulement les règles communes que tous les sous-projets peuvent utiliser
  rules: {
    'import/prefer-default-export': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  env: {
    node: true,
    es6: true,
  },
};
