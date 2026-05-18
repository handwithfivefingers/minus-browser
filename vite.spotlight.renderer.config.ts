import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
// https://vitejs.dev/config
export default defineConfig({
  root: "src/features/spotlight",
  plugins: [tailwindcss()],
});

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
