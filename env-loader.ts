import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Manually load .env.local first to override/augment .env
// This is necessary because standard dotenv.config() doesn't load .env.local automatically
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
    console.log('[Server] Loading .env.local overrides');
    const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

// Load default .env (does not overwrite existing keys by default, but we already set .env.local ones)
dotenv.config();

// ── Production hardening: encryption key ────────────────────────────────────
// Compose files have shipped placeholder ENCRYPTION_KEY / APP_ENCRYPTION_KEY
// defaults. A publicly known placeholder means data "encrypted at rest" is
// readable by anyone. In production, a missing or placeholder key is replaced
// once with a strong generated key persisted in the app data dir (so stored
// credentials stay decryptable across restarts). Dev keeps current behavior.
const WEAK_ENCRYPTION_KEYS = new Set(['change-me-to-a-random-32-char-key']);

if (process.env.NODE_ENV === 'production') {
    const currentKey = process.env.APP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || '';
    if (!currentKey || WEAK_ENCRYPTION_KEYS.has(currentKey)) {
        const dataDir = process.env.COMPLIANCEOS_DATA_DIR
            || path.join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.complianceos');
        const keyPath = path.join(dataDir, '.encryption-key');
        try {
            if (fs.existsSync(keyPath)) {
                const persisted = fs.readFileSync(keyPath, 'utf-8').trim();
                if (persisted) {
                    process.env.APP_ENCRYPTION_KEY = persisted;
                    process.env.ENCRYPTION_KEY = persisted;
                    console.log('[EnvLoader] Restored persisted APP_ENCRYPTION_KEY from ' + keyPath);
                }
            }
            const stillWeak = !process.env.APP_ENCRYPTION_KEY
                || WEAK_ENCRYPTION_KEYS.has(process.env.APP_ENCRYPTION_KEY);
            if (stillWeak) {
                const generated = crypto.randomBytes(32).toString('hex');
                fs.mkdirSync(dataDir, { recursive: true });
                fs.writeFileSync(keyPath, generated, { mode: 0o600 });
                process.env.APP_ENCRYPTION_KEY = generated;
                process.env.ENCRYPTION_KEY = generated;
                console.warn(
                    '[EnvLoader] APP_ENCRYPTION_KEY was missing or a known placeholder — ' +
                    'generated a strong key and persisted it to ' + keyPath
                );
            }
        } catch (e) {
            console.warn(
                '[EnvLoader] Could not persist a generated encryption key (' +
                (e instanceof Error ? e.message : String(e)) + ') — ' +
                'credentials may be stored without AES-256 protection.'
            );
        }
    }
}
