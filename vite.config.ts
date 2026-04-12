import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Vite's transform middleware treats requests with Sec-Fetch-Dest: script as JS.
 * For /index.html that makes import-analysis parse the file as JavaScript and
 * fail at </script>. Vercel dev (and some proxies) forward that header on HTML.
 *
 * This runs first in the middleware stack so the header is normalized before any
 * Vite handler runs. apply: 'serve' keeps production builds unchanged.
 */
function htmlFetchDestForDocumentPlugin(): Plugin {
  const patch: Connect.NextHandleFunction = (req, _res, next) => {
    const pathOnly = req.url?.split(/[?#]/)[0] ?? ''
    if (pathOnly.endsWith('.html') && req.headers['sec-fetch-dest'] === 'script') {
      req.headers['sec-fetch-dest'] = 'document'
    }
    next()
  }

  const prepend = (middlewares: Connect.Server) => {
    middlewares.stack.unshift({ route: '', handle: patch })
  }

  return {
    name: 'html-fetch-dest-document',
    apply: 'serve',
    enforce: 'pre',
    configureServer(server) {
      prepend(server.middlewares)
    },
    configurePreviewServer(server) {
      prepend(server.middlewares)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [htmlFetchDestForDocumentPlugin(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
})
