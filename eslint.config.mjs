import eslint from '@eslint/js';
import eslintImport from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    {
        ignores: ['dist/', 'eslint-plugin-import.d.ts', 'eslint.config.mjs'],
    },

    // ESLint
    eslint.configs.recommended,

    // TypeScript ESLint
    /* eslint-disable import/no-named-as-default-member */
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    /* eslint-enable import/no-named-as-default-member */
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
            },
        },
        rules: {
            '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
            '@typescript-eslint/consistent-type-exports': [
                'error',
                {
                    fixMixedExportsWithInlineTypeSpecifier: true,
                },
            ],
            '@typescript-eslint/consistent-type-imports': [
                'error',
                {
                    fixStyle: 'inline-type-imports',
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    destructuredArrayIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            '@typescript-eslint/non-nullable-type-assertion-style': 'off',
            '@typescript-eslint/restrict-template-expressions': [
                'error',
                {
                    allowNumber: true,
                },
            ],
        },
    },

    // Import
    eslintImport.flatConfigs.recommended,
    eslintImport.flatConfigs.typescript,
    {
        settings: {
            'import/internal-regex': '^~/',
            'import/resolver': {
                node: {
                    extensions: ['.ts', '.tsx'],
                },
                typescript: {
                    alwaysTryTypes: true,
                },
            },
        },
        rules: {
            'import/namespace': ['error', { allowComputed: true }],
            // TypeScript alreadys checks imports.
            'import/no-unresolved': 'off',
        },
    },
);
