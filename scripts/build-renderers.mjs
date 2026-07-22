import { execSync } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

const renderers = [
  { name: 'main_window', config: 'vite.renderer.config.ts', outDir: '.vite/renderer/main_window' },
  { name: 'sub_window', config: 'vite.sub-window.renderer.config.ts' },
  { name: 'youtube_embed', config: 'vite.youtube-embed.renderer.config.ts' },
]

for (const { name, config, outDir } of renderers) {
  console.log(`\nBuilding ${name}...`)
  const flag = outDir ? `--outDir "${outDir}"` : ''
  execSync(`npx vite build --config "${config}" ${flag}`, { cwd: projectRoot, stdio: 'inherit' })
  console.log(`  Done`)
}
console.log('\nAll renderers built successfully')
