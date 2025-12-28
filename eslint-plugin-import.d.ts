declare module 'eslint-plugin-import' {
    import type { TSESLint } from '@typescript-eslint/utils';

    const plugin: {
        flatConfigs: {
            recommended: TSESLint.FlatConfig.Config;
            typescript: TSESLint.FlatConfig.Config;
        };
    };

    export default plugin;
}
