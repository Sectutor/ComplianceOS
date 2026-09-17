import { supabase } from '@/lib/supabaseClient';

/**
 * A robust wrapper around `fetch` that automatically attaches
 * the active authentication token (Local Auth or Supabase)
 * as an `Authorization: Bearer <token>` header.
 */
export async function authedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let token: string | undefined;

    // Check localStorage first for local auth token
    const localToken = typeof window !== 'undefined'
        ? (localStorage.getItem('localAuthToken') || localStorage.getItem('token'))
        : null;

    if (localToken) {
        token = localToken;
    } else {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl && !supabaseUrl.includes('placeholder')) {
            try {
                const { data } = await supabase.auth.getSession();
                token = data?.session?.access_token ?? undefined;
            } catch (e) {
                console.warn('[authedFetch] Failed to retrieve Supabase session:', e);
            }
        }
    }

    const headers = new Headers(init?.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(input, {
        ...init,
        credentials: 'include',
        headers,
    });
}
