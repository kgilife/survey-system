import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'inject-build-time',
      transformIndexHtml(html) {
        return html.replace(
          '</head>',
          `  <meta name="build-time" content="${new Date().toISOString()}" />\n  </head>`
        )
      }
    }
  ],
  base: '/survey-system/',
})
