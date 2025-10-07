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
        manualChunks: {
          'vendor-charts': ['recharts'],
          'vendor-pdf': ['html2pdf.js', 'html2canvas']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
});
