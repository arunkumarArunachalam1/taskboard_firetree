import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/fw/taskboard-react/dist/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    cors: true,
    origin: 'http://127.0.0.1:5173',
    proxy: {
      '/CORE': 'http://127.0.0.1:8080',
      '/Taskboard': 'http://127.0.0.1:8080',
      '/ReactTaskBoard': 'http://127.0.0.1:8080',
      '/Home': 'http://127.0.0.1:8080',
    }
  }
}))
