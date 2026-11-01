/// <reference types="vitest" />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig(({ mode }) => {
  const isDrizzle = mode === 'drizzle'

  return {
    build: {
      lib: isDrizzle
        ? {
            entry: 'src/drizzle/index.ts',
            name: 'PorthDrizzle',
            fileName: 'drizzle',
            formats: ['es', 'umd']
          }
        : {
            entry: 'src/index.ts',
            name: 'Porth',
            fileName: 'porth',
            formats: ['es', 'umd']
          },
      rollupOptions: {
        external: isDrizzle ? ['drizzle-orm', 'drizzle-orm/sqlite-proxy'] : []
      },
      emptyOutDir: !isDrizzle,
      sourcemap: true
    },
    plugins: [dts({ include: ['src'] })],
    test: {
      environment: 'node'
    }
  }
})
