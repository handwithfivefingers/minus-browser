import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/injection/apps/userscript",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
