import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    proxy: {
      // Proxy API requests to local C# backend (avoids CORS issues)
      "/api": {
        target: "https://localhost:7194",
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        ws: false,
      },
      // Proxy authentication requests to local C# backend
      "/account": {
        target: "https://localhost:7194",
        changeOrigin: true,
        secure: false, // Allow self-signed certificates
        ws: false,
      }
    },
    // Optimize HMR for better dev performance
    hmr: {
      overlay: true,
    },
    // Reduce watcher overhead
    watch: {
      // Ignore large data files that don't need hot reload
      ignored: ['**/node_modules/**', '**/dist/**', '**/public/**/*.json']
    }
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false, // Disable source maps in production to protect code structure
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.* statements in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['html2pdf.js', 'html2canvas']
        }
      },
      // Explicitly exclude server-only API files from client bundle
      external: (id) => {
        // Exclude api/ directory files from client bundle
        if (id.includes('/api/') || id.includes('\\api\\')) {
          return true;
        }
        return false;
      }
    },
    chunkSizeWarningLimit: 600
  },
});
