import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function isReactCoreModule(id) {
  return /node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id);
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Rollup's CommonJS interop helper is shared by React and Recharts; left
          // unassigned it lands in "charts" and makes React import (and preload) it.
          if (id.includes("commonjsHelpers")) {
            return "react-vendor";
          }

          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("recharts")) {
            return "charts";
          }

          if (id.includes("react-router")) {
            return "router";
          }

          if (isReactCoreModule(id)) {
            return "react-vendor";
          }

          // No catch-all vendor chunk: it would pull Recharts' own dependencies
          // (d3, redux, ...) into the initial load. Rollup places them with the
          // lazily loaded chunks that use them.
          return undefined;
        },
      },
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
