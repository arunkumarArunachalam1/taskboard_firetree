import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    cors: true,
    origin: 'http://127.0.0.1:5173',
    proxy: {
      '/CORE': 'http://localhost:8500',
      '/Taskboard': 'http://localhost:8500',
    }
  }
})
