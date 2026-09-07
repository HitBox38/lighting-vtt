import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";
import tailwindcss from "@tailwindcss/vite";

const vendorChunks: ReadonlyArray<readonly [packagePath: string, chunkName: string]> = [
  ["/node_modules/pixi.js/", "pixi"],
  ["/node_modules/@pixi/react/", "@pixi/react"],
  ["/node_modules/lucide-react/", "lucide-react"],
  ["/node_modules/radix-ui/", "radix-ui"],
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: vendorChunks.map(([packagePath, name]) => ({
            name,
            test: (id: string) => id.replaceAll("\\", "/").includes(packagePath),
          })),
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@shared": path.resolve(import.meta.dirname, "./shared"),
    },
  },
});
