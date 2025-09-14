import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // For Node.js native modules
    conditions: ["node"], // this is the change
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
  plugins: [
    {
      name: "restart",
      closeBundle() {
        process.stdin.emit("data", "rs");
      },
    },
  ],
  define: {
    "process.platform": JSON.stringify(process.platform),
    ELECTRON_DISABLE_GPU: JSON.stringify(process.env.ELECTRON_DISABLE_GPU),
  },
});
