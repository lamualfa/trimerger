import { defineConfig } from 'tsup'

export default defineConfig({
  format: 'esm',
  splitting: false,
  entry: ['src/index.ts'],
  clean: true,
  minify: true,
})
