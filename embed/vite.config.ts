import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
    viteSingleFile(),
  ],
  build: {
    // Ensure assets are inlined
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
  },
})
