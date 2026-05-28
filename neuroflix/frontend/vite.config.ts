/**
 * vite.config.ts - Vite Build & Dev Server Configuration
 *
 * Configures the Vite toolchain for the NeuroFlix frontend:
 *  - React fast-refresh via @vitejs/plugin-react
 *  - Path alias so "@/..." resolves to "src/..."
 *  - Local dev server with API proxy to the Node backend
 *  - Production build optimisations (vendor chunking, no source maps)
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  // ── Plugins ──────────────────────────────────────────────────────────────
  // Enable React with Babel-based fast refresh during development.
  plugins: [react()],

  // ── Module resolution ────────────────────────────────────────────────────
  // Map the "@" shorthand to the "src" directory so imports like
  // `import Foo from '@/components/Foo'` work everywhere.
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  // ── Development server ───────────────────────────────────────────────────
  server: {
    port: 5173,   // Default Vite port; change if already in use.
    open: true,   // Automatically open the browser on `vite dev`.
    proxy: {
      // Forward all /api/* requests to the Express backend so the browser
      // never encounters CORS issues during local development.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  // ── Production build ─────────────────────────────────────────────────────
  build: {
    outDir: 'dist',      // Output directory for compiled assets.
    sourcemap: false,    // Omit source maps in production to reduce bundle size.
    rollupOptions: {
      output: {
        // Split third-party libraries into separate cacheable chunks so that
        // a code change in the app doesn't bust the vendor cache.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'hls-vendor': ['hls.js'],
        },
      },
    },
  },

  // ── Dependency pre-bundling ──────────────────────────────────────────────
  // Pre-bundle these CJS/ESM packages during `vite dev` startup so they are
  // served as single files, speeding up initial page load in development.
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'hls.js'],
  },
})
