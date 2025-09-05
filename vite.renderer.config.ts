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
    //   {
    //     find: "@tabler/icons-react",
    //     replacement: "@tabler/icons-react/dist/esm/icons/index.mjs",
    //   },
    ],
  },
});
