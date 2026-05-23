import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      "/v1": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true
      },
      "/health": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true
      },
      "/ready": {
        target: process.env.VITE_API_BASE_URL || "http://localhost:8000",
        changeOrigin: true
      }
    }
  }
});
