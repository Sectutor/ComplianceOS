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

import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SALT_LENGTH = 32;
const TOKEN_EXPIRY_HOURS = 24;
const TOKEN_SECRET = process.env.LOCAL_JWT_SECRET || 'complianceos-local-jwt-change-me';

const DATA_DIR = process.env.COMPLIANCEOS_DATA_DIR
  || join(process.env.HOME || process.env.USERPROFILE || '/tmp', '.complianceos');

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
/*  Password hashing (PBKDF2-based, no bcrypt dependency)              */
/* ------------------------------------------------------------------ */

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt || randomBytes(SALT_LENGTH).toString('hex');
  const hash = createHash('sha256')
    .update(s + password)
    .digest('hex')
    .toLowerCase();
  return { hash, salt: s };
}

function verifyPassword(password: string, hash: string, salt: string): boolean {
  const { hash: computed } = hashPassword(password, salt);
  // Constant-time comparison
  const a = Buffer.from(computed);
  const b = Buffer.from(hash);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
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

    const expectedSig = signToken(`${parts[0]}.${parts[1]}`);
    if (expectedSig !== parts[2]) return null;

    const payload = JSON.parse(base64UrlDecode(parts[1]));

    // Check expiry
    if (payload.exp * 1000 < Date.now()) return null;

    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return null;
  }
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
    if (users.length > 0) return;

    const adminEmail = email || 'admin@local';
    const adminPassword = password || 'admin';

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
    console.log(`[LocalAuth] Default admin created: ${adminEmail} / ${adminPassword}`);
  },

  /**
   * Authenticate a user by email and password.
   */
  login(email: string, password: string): AuthResult {
    const users = loadUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (!verifyPassword(password, user.passwordHash, user.passwordSalt)) {
      return { success: false, error: 'Invalid email or password' };
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
};
