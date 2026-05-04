import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/domain/**', 'src/application/**', 'src/shared/**'],
    },
  },
  resolve: {
    alias: {
      '@domain':         path.resolve(__dirname, './src/domain'),
      '@application':    path.resolve(__dirname, './src/application'),
      '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
      '@shared':         path.resolve(__dirname, './src/shared'),
    },
  },
})
