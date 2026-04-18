import { copyFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const DEFAULT_VAULT =
  "C:\\Users\\leedonwoo\\Documents\\Obsidian Vault";
const VAULT = process.env.OBSIDIAN_VAULT || DEFAULT_VAULT;
const PLUGIN_ID = "seedling";
const TARGET_DIR = join(VAULT, ".obsidian", "plugins", PLUGIN_ID);

const FILES = ["main.js", "manifest.json", "styles.css"];

async function main() {
  if (!existsSync(VAULT)) {
    console.error(`❌ Vault not found: ${VAULT}`);
    console.error(`   Set OBSIDIAN_VAULT env var or edit scripts/deploy.mjs`);
    process.exit(1);
  }

  await mkdir(TARGET_DIR, { recursive: true });

  for (const name of FILES) {
    const src = join(ROOT, name);
    if (!existsSync(src)) {
      console.error(`⚠️  Skipping missing file: ${name}`);
      continue;
    }
    const dst = join(TARGET_DIR, name);
    await copyFile(src, dst);
    const s = await stat(src);
    console.log(`✓ ${name} (${s.size} bytes) → ${dst}`);
  }

  console.log(`\n🌱 Deployed to: ${TARGET_DIR}`);
  console.log(`   Restart Obsidian or toggle the plugin off/on to reload.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
