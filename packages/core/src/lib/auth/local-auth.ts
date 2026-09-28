/**
 * Local Authentication — bcrypt + JWT (Phase 2.3)
 *
 * Fallback auth provider for self-hosted deployments where Supabase
 * is not available. Used when VITE_SUPABASE_URL is not set.
 *
 * Usage:
 *   import { localAuth } from './lib/auth/local-auth';
 *   const user = await localAuth.login('admin@local', 'password123');
 *   const token = localAuth.issueToken(user);
 */

import { randomBytes, createHash, timingSafeEqual, pbkdf2Sync } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SALT_LENGTH = 32;
// Token lifetime is configurable via AUTH_TOKEN_EXPIRY_HOURS. Long-lived,
// non-revocable JWTs amplify any leak (log exposure, XSS, shared machines),
// so the default is 7 days rather than the previous 30.
const TOKEN_EXPIRY_HOURS = Number(process.env.AUTH_TOKEN_EXPIRY_HOURS) || 168;
// PBKDF2-SHA256 parameters (OWASP-recommended iteration count for SHA-256).
const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_VERSION = 'pbkdf2-v1';

const DATA_DIR = process.env.COMPLIANCEOS_DATA_DIR
  || join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.complianceos');

// Compose files have shipped these as defaults — they are public knowledge and
// must never be used as the actual signing secret.
const WEAK_JWT_DEFAULTS = new Set([
  'complianceos-local-jwt-change-me',
  'change-this-to-a-random-secret',
  'change-me-to-a-secure-secret',
  'change-me-to-a-random-32-char-key',
]);

/**
 * Resolve the JWT signing secret:
 *   1. LOCAL_JWT_SECRET env — unless it is a known weak compose default
 *   2. previously generated secret persisted in $COMPLIANCEOS_DATA_DIR/.jwt-secret
 *   3. freshly generated strong secret (persisted when the data dir is writable)
 * Production refuses to run without one of the above; dev keeps a known default.
 */
function resolveJwtSecret(): string {
  const fromEnv = process.env.LOCAL_JWT_SECRET;
  const envIsUsable = !!fromEnv && !WEAK_JWT_DEFAULTS.has(fromEnv);
  if (envIsUsable) return fromEnv as string;

  if (process.env.NODE_ENV === 'production') {
    try {
      const secretPath = join(DATA_DIR, '.jwt-secret');
      if (existsSync(secretPath)) {
        const persisted = readFileSync(secretPath, 'utf-8').trim();
        if (persisted) return persisted;
      }
      const generated = randomBytes(48).toString('hex');
      if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(secretPath, generated, { mode: 0o600 });
      console.warn(
        '[LocalAuth] LOCAL_JWT_SECRET was unset or a known weak default — generated a strong secret and persisted it to ' +
          secretPath
      );
      return generated;
    } catch (e) {
      console.warn(
        '[LocalAuth] Could not persist a generated JWT secret (' +
          (e instanceof Error ? e.message : String(e)) +
          ') — using an in-memory secret; sessions will reset on restart.'
      );
      return randomBytes(48).toString('hex');
    }
  }

  return fromEnv || 'complianceos-local-jwt-change-me';
}

const TOKEN_SECRET = resolveJwtSecret();

const USER_DB_PATH = join(DATA_DIR, 'local-users.json');

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LocalUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: Omit<LocalUser, 'passwordHash' | 'passwordSalt'>;
  token?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*                                                                    */
/*  Password hashing (PBKDF2-SHA256, versioned; legacy SHA-256         */
/*  hashes are transparently re-hashed on successful login)            */
/*                                                                    */
/* ------------------------------------------------------------------ */

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(SALT_LENGTH).toString('hex');
  const derived = pbkdf2Sync(password, s, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, 'sha256').toString('hex');
  return { hash: `${PBKDF2_VERSION}$${derived}`, salt: s };
}

function isLegacyHash(hash: string): boolean {
  return !hash.startsWith(PBKDF2_VERSION + '$');
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  let computed: Buffer;
  let stored: Buffer;
  if (hash.startsWith(PBKDF2_VERSION + '$')) {
    computed = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, 'sha256');
    // The stored hash is a hex string — decode it as hex, not UTF-8, or the
    // byte lengths never match and every PBKDF2 password fails to verify.
    stored = Buffer.from(hash.slice(PBKDF2_VERSION.length + 1), 'hex');
  } else {
    // Legacy scheme: single unsalted-iteration SHA-256. Kept verifiable so
    // existing accounts can log in; login() upgrades them to PBKDF2 after a
    // successful check.
    computed = Buffer.from(createHash('sha256').update(salt + password).digest('hex'));
    stored = Buffer.from(hash);
  }
  if (computed.length !== stored.length) return false;
  try {
    return timingSafeEqual(computed, stored);
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  JWT-style token (minimal self-contained, no external lib)          */
/* ------------------------------------------------------------------ */

function base64UrlEncode(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf-8');
}

function signToken(payload: string): string {
  return createHash('sha256')
    .update(payload + TOKEN_SECRET)
    .digest('hex');
}

export function issueToken(user: { id: string; email: string; role: string }): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify({
    sub: user.id,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600,
  }));
  const signature = signToken(`${header}.${body}`);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const expectedSig = Buffer.from(signToken(`${parts[0]}.${parts[1]}`));
    const providedSig = Buffer.from(parts[2]);
    // Constant-time signature comparison
    if (expectedSig.length !== providedSig.length || !timingSafeEqual(expectedSig, providedSig)) {
      return null;
    }

    const payload = JSON.parse(base64UrlDecode(parts[1]));

    // Check expiry
    if (payload.exp * 1000 < Date.now()) return null;

    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Password reset tokens (local mode)                                 */
/* ------------------------------------------------------------------ */

const RESET_DB_PATH = join(DATA_DIR, 'password-resets.json');
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

interface PasswordResetEntry {
  token: string;
  email: string;
  expiresAt: string;
  used: boolean;
}

function loadResets(): PasswordResetEntry[] {
  try {
    return JSON.parse(readFileSync(RESET_DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveResets(entries: PasswordResetEntry[]): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(RESET_DB_PATH, JSON.stringify(entries, null, 2), 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  User persistence                                                   */
/* ------------------------------------------------------------------ */

function loadUsers(): LocalUser[] {
  if (!existsSync(USER_DB_PATH)) return [];
  try {
    return JSON.parse(readFileSync(USER_DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users: LocalUser[]): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(USER_DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export const localAuth = {
  /**
   * Initialize with a default admin user if no users exist.
   */
  initDefaultAdmin(email?: string, password?: string): void {
    const users = loadUsers();
    const adminEmail = email || 'admin@local';
    const adminPassword = password || 'admin';

    const existingIndex = users.findIndex((u) => u.email.toLowerCase() === adminEmail.toLowerCase());

    if (existingIndex >= 0) {
      // Admin already exists — never touch the stored hash. The env password
      // is a FIRST-BOOT seeding value only: overwriting the hash here would
      // (a) silently revert any password the operator changed in the UI and
      // (b) turn COMPLIANCE_ADMIN_PASSWORD into a permanent backdoor that
      // outlives password changes.
      return;
    }

    // No users yet — create default admin
    const { hash, salt } = hashPassword(adminPassword);
    const user: LocalUser = {
      id: randomBytes(8).toString('hex'),
      email: adminEmail,
      name: 'Local Admin',
      role: 'admin',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);
    // Never log the password value — container logs are widely readable.
    console.log(`[LocalAuth] Default admin created: ${adminEmail}`);
  },

  /**
   * Authenticate a user by email and password.
   */
  login(email: string, password: string): AuthResult {
    // Authentication always verifies against the stored hash. COMPLIANCE_ADMIN_PASSWORD
    // seeds the admin account on first boot (see initDefaultAdmin) but is never
    // accepted as a live credential — otherwise anyone who reads the container
    // env keeps permanent admin access even after the password is changed.
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return { success: false, error: 'Invalid email or password' };
    }

    // Transparent upgrade: legacy single-SHA-256 hashes are re-hashed with
    // PBKDF2 after a successful password check.
    if (user && isLegacyHash(user.passwordHash)) {
      const { hash, salt } = hashPassword(password);
      user.passwordHash = hash;
      user.passwordSalt = salt;
      saveUsers(users);
    }

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
    const token = issueToken(safe);

    return { success: true, user: safe, token };
  },

  /**
   * Create a new user.
   */
  register(email: string, password: string, name?: string, role?: 'admin' | 'user'): AuthResult {
    const users = loadUsers();

    if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, error: 'Email already registered' };
    }

    const { hash, salt } = hashPassword(password);
    const user: LocalUser = {
      id: randomBytes(8).toString('hex'),
      email,
      name: name || email.split('@')[0],
      role: role || 'user',
      passwordHash: hash,
      passwordSalt: salt,
      createdAt: new Date().toISOString(),
    };

    users.push(user);
    saveUsers(users);

    const safe = { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
    const token = issueToken(safe);

    return { success: true, user: safe, token };
  },

  /**
   * Validate a JWT token.
   */
  validateToken(token: string): { id: string; email: string; role: string } | null {
    return verifyToken(token);
  },

  /**
   * Check if local auth is available (no Supabase configured).
   */
  isLocalAuthActive(): boolean {
    return !process.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL.includes('placeholder');
  },

  /**
   * Issue a one-hour, single-use password reset token for a local user.
   * Returns null when the email is unknown (do not reveal existence).
   */
  requestPasswordReset(email: string): string | null {
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) return null;
    const token = randomBytes(24).toString('hex');
    // Drop expired/used entries, then record the new token.
    const now = Date.now();
    const active = loadResets().filter((r) => !r.used && new Date(r.expiresAt).getTime() > now);
    active.push({ token, email: user.email, expiresAt: new Date(now + RESET_TOKEN_TTL_MS).toISOString(), used: false });
    saveResets(active);
    return token;
  },

  /**
   * Complete a password reset: validate the token, set the new password,
   * mark the token used.
   */
  completePasswordReset(token: string, newPassword: string): AuthResult {
    const resets = loadResets();
    const entry = resets.find((r) => r.token === token);
    if (!entry || entry.used || new Date(entry.expiresAt).getTime() < Date.now()) {
      return { success: false, error: 'This reset link is invalid or has expired' };
    }
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === entry.email.toLowerCase());
    if (!user) return { success: false, error: 'Account no longer exists' };

    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    saveUsers(users);

    entry.used = true;
    saveResets(resets);
    return { success: true };
  },
};
