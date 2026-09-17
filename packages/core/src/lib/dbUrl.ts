/**
 * Database URL Resolution & Connection Safety
 *
 * Guards the app against TLS-error spam caused by stale REMOTE database URLs
 * (e.g. a retired Supabase pooler endpoint left in `.env`). This module:
 *
 *   - Resolves the most appropriate database URL, preferring a LOCAL one from
 *     `.env.local` (the same override applied by the root `env-loader.ts`).
 *   - Detects local endpoints (localhost / 127.0.0.1 / private ranges / @db:)
 *     so callers never attempt a TLS handshake against a local database.
 *   - Builds postgres connection options that fail fast (short connect
 *     timeout) for remote endpoints, so a dead remote is reported once as a
 *     clean offline warning instead of a repeated
 *     "Client network socket disconnected before secure TLS connection was
 *     established" stack trace.
 *
 * No secrets (passwords, keys) are ever logged or printed by this module.
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type postgres from 'postgres';

/** True when the URL points at a local/private database endpoint. */
export function isLocalDbUrl(url?: string): boolean {
  if (!url) return false;

  // Non-standard schemes (unix sockets, @db: shorthand) are always local.
  if (url.includes('@db:') || url.includes('@localhost:') || url.startsWith('/')) {
    return true;
  }

  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '0.0.0.0' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.endsWith('.local') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * Reads `DATABASE_URL` from the repo-root `.env.local` (defensively — missing
 * or unreadable files simply yield ''). Returns '' when absent.
 */
export function readLocalEnvDatabaseUrl(): string {
  try {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envLocalPath)) return '';
    const parsed = dotenv.parse(fs.readFileSync(envLocalPath, 'utf8'));
    return parsed.DATABASE_URL || parsed.VITE_DATABASE_URL || '';
  } catch {
    return '';
  }
}

/**
 * Resolves the best database URL for this process:
 *   1. A LOCAL `DATABASE_URL` from `.env.local` (preferred — this is the
 *      local Supabase override the rest of the app relies on).
 *   2. `process.env.DATABASE_URL` (whatever the runtime provided).
 *
 * Returns `{ url, isLocal }`. Never throws and never prints the URL.
 */
export function resolveDatabaseUrl(): { url: string; isLocal: boolean } {
  const localEnvUrl = readLocalEnvDatabaseUrl();
  if (localEnvUrl && isLocalDbUrl(localEnvUrl)) {
    return { url: localEnvUrl, isLocal: true };
  }

  const envUrl = process.env.DATABASE_URL || '';
  return { url: envUrl, isLocal: isLocalDbUrl(envUrl) };
}

/** Convenience: is a local database configured for this process? */
export function isLocalDatabaseConfigured(): boolean {
  return resolveDatabaseUrl().isLocal;
}

/**
 * Builds safe postgres connection options for a given URL:
 *   - TLS is disabled for local endpoints and (softly) enabled for remote
 *     ones with `rejectUnauthorized: false`.
 *   - `connect_timeout` is short so a dead remote fails fast and cleanly.
 *   - `max: 2` keeps addon/utility clients lightweight.
 */
export function createSafePgOptions(
  url: string,
  extra: Partial<postgres.Options<any>> = {},
): postgres.Options<any> {
  const local = isLocalDbUrl(url);
  return {
    ssl: local ? false : { rejectUnauthorized: false },
    prepare: false,
    idle_timeout: 15,
    connect_timeout: 3,
    max: 2,
    connection: {
      statement_timeout: 10000,
    },
    ...extra,
  };
}

/**
 * Host-only description of a database URL for log messages — never includes
 * credentials. Returns 'unknown' for unparseable input.
 */
export function describeDbHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}
