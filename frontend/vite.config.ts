import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  optimizeDeps: {
    exclude: ["@dimforge/rapier3d-compat"], // <- important
  },
  assetsInclude: ["**/*.glb", "**/*.gltf", "**/*.wasm"], // serve WASM & models

  build: {
    outDir: "../backend/dist/public",
  },
  server: {
    port: 4000,
    proxy: {
      "/api": "http://localhost:4001",
    },
  },
});
