import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001", // your Express server (for npm run dev)
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('html2pdf') || id.includes('html2canvas')) return 'vendor-pdf';
            return 'vendor';
          }
          // Code-split MDS lookup data into separate chunk
          if (id.includes('mds_item_lookup.json') || id.includes('mds_section_names.json')) {
            return 'mds-lookup';
          }
        }
      },
      // Exclude server-only files from client bundle
      external: (id) => {
        // Exclude server utilities from bundling
        if (id.includes('/server/') || id.includes('\\server\\')) {
          return true;
        }
        // Exclude server-side data imports
        if (id.includes('/api/data/coefficients') || 
            id.includes('/api/data/icdToHcc') ||
            id.includes('/api/data/end-score-coefficients')) {
          return true;
        }
        return false;
      }
    },
    chunkSizeWarningLimit: 600
  },
});
