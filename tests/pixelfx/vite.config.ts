import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// The bench has its own entry and no application plugins or environment needs.
export default defineConfig({
  root: fileURLToPath(new URL("../../", import.meta.url)),
  appType: "mpa",
  publicDir: false,
  server: {
    host: "127.0.0.1",
    watch: { ignored: ["**/.tmp/**"] },
  },
  build: {
    outDir: ".tmp/pixelfx-dist",
    assetsInlineLimit: 0,
    rollupOptions: { input: "tests/pixelfx-preview.html" },
  },
});
