import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environmentMatchGlobs: [
      ['src/**', 'jsdom'],
      ['electron/**', 'node'],
    ],
    setupFiles: ['src/setupTests.ts'],
    alias: {
      '@': resolve(__dirname, './src')
    },
    exclude: ['node_modules', 'e2e/**'],
    globals: true,
  }
})
