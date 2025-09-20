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
    ],
  },
  build: {
    lib: {
      entry: "./src/features/ui/components/sidebar/index.tsx",
      name: "SidebarComponent",
      fileName: () => "sidebar.js",
      formats: ["umd"], // makes it accessible as <script>
    },
    rollupOptions: {
      external: ["react", "react-dom"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
        },
      },
    },
  },
});
