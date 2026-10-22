import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: { globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.recommended.rules, 'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z]', argsIgnorePattern: '^[A-Z]' }] },
  },
  { files: ['vite.config.js'], languageOptions: { globals: globals.node } },
];
