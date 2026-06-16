import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/vault/overlay",
  build: {
    outDir: "../../../../.vite/renderer/vault_injection",
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
