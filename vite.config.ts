import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: {
    // The lazy-loaded 3D chunk (three + react-three-fiber + drei) is ~970 kB by design; warn above 1 MB.
    chunkSizeWarningLimit: 1000,
  },
  test: { include: ['tests/**/*.test.ts', 'src/**/*.test.ts'], testTimeout: 60000 },
})
