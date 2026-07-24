import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split heavyweight libraries into their own cacheable chunks so the
        // main app bundle stays small and vendor code caches across deploys
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('monaco-editor')) return 'monaco'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('firebase')) return 'firebase'
          if (
            id.includes('react-syntax-highlighter') ||
            id.includes('highlight.js') ||
            id.includes('refractor') ||
            id.includes('lowlight')
          )
            return 'highlight'
          return 'vendor'
        },
      },
    },
  },
})
