import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const cfServerUrl = env.VITE_CF_SERVER || 'http://127.0.0.1:8080';

  const proxyConfig = {
    target: cfServerUrl,
    changeOrigin: true,
    cookieDomainRewrite: { '*': '' },
    cookiePathRewrite: '/'
  };

  return {
    base: command === 'serve' ? '/' : '/fw/taskboard-react/dist/',
    plugins: [
      react(),
      tailwindcss(),
    ],
    build: {
      rollupOptions: {
        output: {
          format: 'iife',
          entryFileNames: 'assets/dashboard-bundle.js',
          assetFileNames: 'assets/dashboard-bundle.[ext]',
        }
      },
      cssCodeSplit: false
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      cors: true,
      origin: 'http://127.0.0.1:5173',
      proxy: {
        '/CORE': proxyConfig,
        '/Taskboard': proxyConfig,
        '/ReactTaskBoard': proxyConfig,
        '/Home': proxyConfig,
      }
    }
  };
})
