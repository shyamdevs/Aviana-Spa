import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
  server: {
    // Local development: forward API calls and uploaded files to the Express server so the
    // browser sees a single origin (same behaviour as the Vercel rewrite in production).
    proxy: {
      '/api': { target: 'http://localhost:5000', changeOrigin: false },
      // Seed images ship inside /public; anything else under /uploads is a runtime upload.
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: false,
        bypass: (req) => (/^\/uploads\/(services|therapists)-seed\//.test(req.url || '') ? req.url : undefined),
      },
    },
  },
})
