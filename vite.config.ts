/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' : les chemins sont relatifs, ce qui permet d'héberger l'appli
// dans un sous-dossier (GitHub Pages : https://pseudo.github.io/echecs/).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  test: {
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
  },
})
