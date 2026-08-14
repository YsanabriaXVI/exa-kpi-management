import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import autoprefixer from 'autoprefixer'

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    base: '/',
    build: {
      outDir: 'build',
      cssCodeSplit: false,
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}),
        ],
      },
    },
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: 'src/',
          replacement: `${path.resolve(__dirname, 'src')}/`,
        },
      ],
      extensions: ['.mjs', '.mts', '.js', '.ts', '.jsx', '.tsx', '.json', '.scss'],
    },
    server: {
      allowedHosts: ['ems.exasa.net', 'ems2.exasa.net', 'exa.exasa.net', 'localhost'],
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://host.docker.internal:8080',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('host', 'ems2.exasa.net')
            })
            proxy.on('error', (err) => {
              console.error('Proxy error:', err.message)
            })
          },
        },
      },
    },
    preview: {
      port: 3000,
    },
  }
})