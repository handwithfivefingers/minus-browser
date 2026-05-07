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
    // lib: {
    //   entry: "./src/features/ui/components/sidebar/index.tsx",
    //   name: "SidebarComponent",
    //   fileName: () => "sidebar.js",
    //   formats: ["umd"], // makes it accessible as <script>
    // },
    // lib: {
    //   entry: "./src/features/ui/components/sidebar/index.tsx",
    //   name: "SidebarComponent",
    //   fileName: () => "sidebar.js",
    //   formats: ["umd"], // makes it accessible as <script>
    // },
    rollupOptions: {
      input: {
        main_window: "./index.html", // path to your main html
        userscript: "./src/features/injection/apps/userscript/index.html", // ADD THIS
        // vault: "./src/features/injection/apps/vault/index.html", // ADD THIS
      },
    },
  },
});

// debug: npx asar list ./out/MinusBrowser-darwin-arm64/MinusBrowser.app/Contents/Resources/app.asar
