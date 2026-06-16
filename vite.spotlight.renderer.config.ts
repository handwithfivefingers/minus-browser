import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";

export default defineConfig({
  plugins: [tailwindcss()],
  base: "",
  root: "src/features/spotlight/overlay",
  build: {
    outDir: "../../../../.vite/renderer/spotlight_window",
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

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
