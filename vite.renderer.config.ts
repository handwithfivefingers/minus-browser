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
  envPrefix: ["VITE_", "GROQ_AI_"],
  // build: {
  //   rollupOptions: {
  //     input: {
  //       main_window: "./index.html", // path to your main html
  //       userscript: "./index.html",
  //       translate: "./index.html",
  //       vault: "./index.html",
  //       spotlight: "./index.html",
  //     },
  //   },
  // },
});

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
