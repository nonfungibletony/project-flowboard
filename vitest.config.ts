import { defineConfig } from 'vitest/config'
import * as path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['apps/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@group/shared': path.resolve(__dirname, 'packages/shared/src'),
      '@group/db': path.resolve(__dirname, 'packages/db/src'),
      '@group/web': path.resolve(__dirname, 'apps/web/src'),
      '@group/api': path.resolve(__dirname, 'apps/api/src'),
    },
  },
})