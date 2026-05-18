import { defineConfig } from "vite";
import tailwindcss from "./node_modules/@tailwindcss/vite/dist/index.mjs";
// https://vitejs.dev/config
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
  build: {
    rollupOptions: {
      input: {
        main_window: "./index.html", // path to your main html
        userscript: "./src/features/userscript/overlay/index.html",
        translate: "./src/features/translate/overlay/index.html",
        vault: "./src/features/vault/overlay/index.html",
      },
    },
  },
});

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
