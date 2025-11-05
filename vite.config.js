import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Plugin to remove console.log statements in production builds
const removeConsolePlugin = () => {
  return {
    name: 'remove-console',
    transform(code, id) {
      // Only process client-side code (not node_modules or API files)
      if (process.env.NODE_ENV === 'production' && 
          !id.includes('node_modules') && 
          !id.includes('/api/') && 
          !id.includes('\\api\\')) {
        // Remove console.log and console.debug statements
        code = code.replace(/console\.(log|debug)\([^)]*\);?/g, '');
        // Remove console.log with multiple arguments
        code = code.replace(/console\.(log|debug)\([^;]*\)/g, '');
      }
      return { code, map: null };
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV === 'production' ? [removeConsolePlugin()] : [])
  ],
  server: {
    proxy: {
      "/api": "http://localhost:3001", // your Express server (for npm run dev)
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false, // Disable source maps in production to protect code structure
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
