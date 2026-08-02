import { defineConfig } from 'vite-plus';

export default defineConfig({
  optimizeDeps: {
    force: true, // ✅ 正确：强制重新预构建依赖
  },
  pack: [
    {
      entry: 'src/index.ts',
      outDir: 'dist',
      format: ['esm', 'umd'],
      globalName: 'jui',
      target: 'es2020',
      platform: 'browser',
      minify: true,
      clean: true,
      css: {
        minify: true,
      },
      outputOptions: {
        globals: {
          'vanilla-signal': 'vanillaSignal',
          'vanilla-signal-i18n': 'vanillaSignalI18n',
        },
      },
      outExtensions({ format }) {
        return {
          js: format === 'es' ? '.js' : '.js',
        };
      },
      dts: true,
      exports: true,
      sourcemap: false,
    },
  ],

  test: {
    include: ['tests/**/*.test.ts'],
    exclude: [''],
  },

  lint: {
    ignorePatterns: ['dist/**', 'node_modules/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },

  fmt: {
    ignorePatterns: ['dist/**'],
    sortPackageJson: true,
    sortImports: true,
    sortTailwindcss: true,
    semi: true,
    singleQuote: true,
    tabWidth: 2,
    useTabs: false,
    printWidth: 80,
    trailingComma: 'es5',
    arrowParens: 'always',
    bracketSameLine: false,
    bracketSpacing: true,
    embeddedLanguageFormatting: 'auto',
    endOfLine: 'lf',
    htmlWhitespaceSensitivity: 'css',
    insertFinalNewline: true,
  },
});
