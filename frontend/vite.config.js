import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("react-router")) {
            return "router";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    proxy: {
      "/weather": "http://localhost:3000",
      "/pokemon": "http://localhost:3000",
      "/posts": "http://localhost:3000",
      "/people": "http://localhost:3000",
      "/api": "http://localhost:3000",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
