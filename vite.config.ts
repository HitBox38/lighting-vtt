import { defineConfig, loadEnv } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { validateProductionEndpoints } from "./scripts/validate-endpoints.ts";

const vendorChunks: ReadonlyArray<readonly [packagePath: string, chunkName: string]> = [
  ["/node_modules/pixi.js/", "pixi"],
  ["/node_modules/@pixi/react/", "@pixi/react"],
  ["/node_modules/lucide-react/", "lucide-react"],
  ["/node_modules/radix-ui/", "radix-ui"],
];

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === "build") {
    validateProductionEndpoints(loadEnv(mode, process.cwd(), "VITE_"));
  }

  return {
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
    ],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [{
              // Vite injects this helper into dynamic imports, including Pixi's.
              // It must stay shared instead of pulling Pixi into every lazy route.
              name: "preload-helper",
              priority: 200,
              test: (id: string) => id.replaceAll("\\", "/").includes("vite/preload-helper"),
            }, {
              // React is needed by every route. Keep it out of Pixi's recursive
              // vendor group while preserving Pixi's renderer initialization order.
              name: "react-core",
              priority: 100,
              test: (id: string) => /\/node_modules\/(?:react|react-dom|scheduler)\//.test(id.replaceAll("\\", "/")),
            }, ...vendorChunks.map(([packagePath, name]) => ({
              name,
              test: (id: string) => id.replaceAll("\\", "/").includes(packagePath),
            }))],
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
  };
});
