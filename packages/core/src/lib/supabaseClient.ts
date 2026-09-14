import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables. Authentication will not work.');
}

// Two GoTrueClient instances sharing one storageKey contend for the Web Locks
// lock "lock:sb-<host>-auth-token", and the auto-refresh tick fails with
// NavigatorLockAcquireTimeoutError ("...immediately failed"). Cache the client
// on globalThis so every module evaluation (including Vite HMR re-runs)
// reuses a single instance.
const globalRef = globalThis as typeof globalThis & {
    __complianceosSupabaseClient?: SupabaseClient;
};

export const supabase: SupabaseClient = globalRef.__complianceosSupabaseClient
    ?? (globalRef.__complianceosSupabaseClient = createClient(
        supabaseUrl || 'https://placeholder-url.supabase.co',
        supabaseAnonKey || 'placeholder-key',
        {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                // Avoid Navigator LockManager immediate lock acquisition failure across tabs/HMR
                lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
                    return await fn();
                },
            }
        }
    ));
