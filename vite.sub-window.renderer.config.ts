import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "node:path";

export default defineConfig({
  plugins: [tailwindcss()],
  base: "",
  root: "src/renderer/sub-window",
  cacheDir: "node_modules/.vite_subwindow",
  build: {
    outDir: "../../../.vite/renderer/sub_window",
  },
  resolve: {
    alias: [
      {
        find: "~",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
});
