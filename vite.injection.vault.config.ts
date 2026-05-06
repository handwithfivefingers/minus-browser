import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/injection/apps/vault",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
