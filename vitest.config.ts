import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', 'node_modules/**', '.next/**'],
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      // Mock Next.js server-only guard so server utilities can be imported in jsdom tests.
      // The guard is a no-op in test environments — real enforcement happens at Next build time.
      'server-only': path.resolve(__dirname, './tests/__mocks__/server-only.ts'),
    },
  },
})
