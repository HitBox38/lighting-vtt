import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const vendorChunks: ReadonlyArray<readonly [packagePath: string, chunkName: string]> = [
  ["/node_modules/pixi.js/", "pixi"],
  ["/node_modules/@pixi/react/", "@pixi/react"],
  ["/node_modules/lucide-react/", "lucide-react"],
  ["/node_modules/radix-ui/", "radix-ui"],
];

function manualChunks(id: string) {
  const normalizedId = id.replaceAll("\\", "/");

  for (const [packagePath, chunkName] of vendorChunks) {
    if (normalizedId.includes(packagePath)) {
      return chunkName;
    }
  }

  return undefined;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
