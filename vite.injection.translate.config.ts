import { defineConfig } from "vite";

export default defineConfig({
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
