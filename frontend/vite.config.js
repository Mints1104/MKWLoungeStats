import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/weather": "http://localhost:3000",
      "/pokemon": "http://localhost:3000",
      "/posts": "http://localhost:3000",
      "/people": "http://localhost:3000",
      "/api/player/leaderboard": "http://localhost:3000",
      "/api/player/details": "http://localhost:3000",
    },
  },
});
