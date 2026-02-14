import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'remove-crossorigin',
      transformIndexHtml(html) {
        return html
          .replace(/ crossorigin/g, "")
          .replace('<head>', '<head><script>document.documentElement.style.backgroundColor = "purple"; console.log("Diagnostic start");</script>')
          .replace('</head>', '<script>window.addEventListener("load", () => { document.body.style.backgroundColor = "orange"; console.log("Window loaded"); });</script></head>');
      }
    }
  ],
  base: './',
  build: {
    modulePreload: false
  }
})
