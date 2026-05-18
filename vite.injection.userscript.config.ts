import { defineConfig } from "vite";

export default defineConfig({
  root: "src/features/userscript/overlay",
  resolve: {
    alias: [
      {
        find: "~",
        replacement: "/src",
      },
    ],
  },
});
