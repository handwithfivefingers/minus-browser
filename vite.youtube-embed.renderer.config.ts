import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "node:path";
// https://vitejs.dev/config
export default defineConfig({
  root: "src/features/youtubeEmbed/overlay",
  build: {
    outDir: "../../../../.vite/renderer/youtube_embeded",
  },
  plugins: [tailwindcss()],
  base: "",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
});

