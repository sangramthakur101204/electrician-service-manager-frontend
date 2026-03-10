import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // mobile se access ke liye — 0.0.0.0 pe listen karega
    port: 5173,
  }
})
