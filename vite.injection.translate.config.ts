import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/injection/apps/translate",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
