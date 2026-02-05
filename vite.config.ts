import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const sipDomain = env.VITE_SIP_DOMAIN || 'webclienttest';

  return {
    plugins: [react()],
    base: '/TestPhone/',
    server: {
      proxy: {
        // Proxy for provisioning and realtime API
        '/proxy': {
          target: `https://${sipDomain}.ringotel.co`,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (path) => path.replace(/^\/proxy\/[^/]+/, '')
        }
      }
    }
  }
})
