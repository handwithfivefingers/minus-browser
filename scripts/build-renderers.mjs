import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

const renderers = [
  { name: "main_window", config: "vite.renderer.config.ts", outDir: ".vite/renderer/main_window" },
  { name: "spotlight_window", config: "vite.spotlight.renderer.config.ts" },
  { name: "translate_injection", config: "vite.injection.translate.config.ts" },
  { name: "vault_injection", config: "vite.injection.vault.config.ts" },
  { name: "userscript_injection", config: "vite.injection.userscript.config.ts" },
];

for (const { name, config, outDir } of renderers) {
  console.log(`\nBuilding ${name}...`);
  const flag = outDir ? `--outDir "${outDir}"` : "";
  execSync(`npx vite build --config "${config}" ${flag}`, { cwd: projectRoot, stdio: "inherit" });
  console.log(`  Done`);
}
console.log("\nAll renderers built successfully");
