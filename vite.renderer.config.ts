import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
import path from "node:path";
// https://vitejs.dev/config
export default defineConfig({
  plugins: [tailwindcss()],
  root: "src/renderer/main-window",
  base: "",
  build: {
    outDir: "../../../.vite/renderer/main_window",
  },
  resolve: {
    alias: [
      {
        find: "~",
        replacement: path.resolve(__dirname, "src"),
      },
    ],
  },
  envPrefix: ["VITE_", "GROQ_AI_"],
});

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
