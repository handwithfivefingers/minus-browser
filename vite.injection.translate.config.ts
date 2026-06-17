import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
export default defineConfig({
  plugins: [tailwindcss()],
  root: "src/features/translate/overlay",
  build: {
    outDir: "../../../../.vite/renderer/translate_injection",
  },
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
