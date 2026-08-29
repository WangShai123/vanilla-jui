import { defineConfig } from 'vite-plus';
import type { OxfmtConfig } from 'oxfmt';

import fmtConfig from './.oxfmtrc.json' with { type: 'json' };

const externalPackages = [
  'vanilla-signal',
  'vanilla-signal-i18n',
  'vanilla-create-storage',
];

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
  },

  optimizeDeps: {
    force: true,
  },

  pack: [
    {
      entry: 'src/index.ts',
      outDir: 'dist',
      format: ['esm', 'umd'],
      globalName: 'jui',
      target: 'es2022',
      platform: 'browser',
      minify: true,
      clean: true,
      deps: {
        neverBundle: externalPackages,
      },
      css: {
        minify: true,
      },
      outputOptions: {
        globals: {
          'vanilla-signal': 'vanillaSignal',
          'vanilla-signal-i18n': 'vanillaSignalI18n',
          'vanilla-create-storage': 'vanillaStorage',
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

  fmt: fmtConfig as OxfmtConfig,
});
