import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/translate/overlay",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
