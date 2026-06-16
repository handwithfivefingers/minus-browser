import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/userscript/overlay",
  build: {
    outDir: "../../../../.vite/renderer/userscript_injection",
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
