import tsPlugin from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';

export default tsPlugin.config(
  {
    ignores: ['dist/**', 'node_modules/**', '.github/**', 'public/**', 'package-lock.json']
  },
  ...tsPlugin.configs.recommended,
  ...sveltePlugin.configs['flat/recommended'],
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: tsPlugin.parser
      }
    }
  }
);
