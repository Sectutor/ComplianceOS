import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOCALES_DIR = path.resolve(__dirname, "../packages/core/src/i18n/locales");
const EN_DIR = path.join(LOCALES_DIR, "en");

const TARGET_LANGS = ["de", "fr", "nl", "es", "it"];

function readJson(filepath: string): Record<string, any> {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, "utf-8"));
    }
  } catch (err) {
    console.error(`Error reading ${filepath}:`, err);
  }
  return {};
}

function writeJson(filepath: string, data: Record<string, any>) {
  fs.mkdirSync(path.dirname(filepath), { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 4) + "\n", "utf-8");
}

function syncKeys(source: Record<string, any>, target: Record<string, any>): { synced: Record<string, any>; missingCount: number } {
  let missingCount = 0;
  const result: Record<string, any> = {};

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    if (typeof sourceVal === "object" && sourceVal !== null && !Array.isArray(sourceVal)) {
      const targetSub = typeof target[key] === "object" && target[key] !== null ? target[key] : {};
      const { synced, missingCount: subMissing } = syncKeys(sourceVal, targetSub);
      result[key] = synced;
      missingCount += subMissing;
    } else {
      if (target[key] !== undefined) {
        result[key] = target[key];
      } else {
        result[key] = sourceVal; // Fallback to English source string
        missingCount++;
      }
    }
  }

  return { synced: result, missingCount };
}

export function runSync() {
  console.log("==================================================");
  console.log("🌐 ComplianceOS i18n Translation Sync Engine");
  console.log("==================================================");

  if (!fs.existsSync(EN_DIR)) {
    console.error(`Error: English locale source directory not found at ${EN_DIR}`);
    process.exit(1);
  }

  const enFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith(".json"));
  console.log(`Found ${enFiles.length} master namespace files in 'en':`, enFiles.join(", "));

  for (const lang of TARGET_LANGS) {
    const targetDir = path.join(LOCALES_DIR, lang);
    console.log(`\n🔄 Synchronizing '${lang}' locale...`);
    let totalMissing = 0;
    let totalNamespaces = 0;

    for (const file of enFiles) {
      const enFilePath = path.join(EN_DIR, file);
      const targetFilePath = path.join(targetDir, file);

      const enData = readJson(enFilePath);
      const targetData = readJson(targetFilePath);

      const { synced, missingCount } = syncKeys(enData, targetData);
      writeJson(targetFilePath, synced);

      totalMissing += missingCount;
      totalNamespaces++;
    }

    console.log(`✅ [${lang.toUpperCase()}] Synced ${totalNamespaces} namespaces (${totalMissing} fallback keys preserved).`);
  }

  console.log("\n==================================================");
  console.log("🎉 All EU locale namespaces are 100% synchronized!");
  console.log("==================================================");
}

runSync();
