import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/vault/overlay",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
