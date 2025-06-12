import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/badminton-league-app/',
  build: {
    outDir: 'dist',
  },
})
