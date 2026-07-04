import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    aal?: 'aal1' | 'aal2' | null;
    signIn: (email?: string, password?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [aal, setAal] = useState<'aal1' | 'aal2' | null>(null);

    useEffect(() => {
        // Check for local auth token first (self-hosted mode)
        const localToken = localStorage.getItem('localAuthToken');
        const localUserStr = localStorage.getItem('localAuthUser');
        if (localToken && localUserStr) {
            try {
                const localUser = JSON.parse(localUserStr);
                setSession({ access_token: localToken } as any);
                setUser({ id: localUser.id, email: localUser.email, role: localUser.role } as any);
                setLoading(false);
                return;
            } catch {
                localStorage.removeItem('localAuthToken');
                localStorage.removeItem('localAuthUser');
            }
        }

        // Check active sessions and sets the user (Supabase mode)
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes on auth state (logged in, signed out, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
                setAal((data?.currentLevel as any) || null);
            });
        });

        return () => subscription.unsubscribe();
    }, []);

    const signIn = async (email?: string, password?: string) => {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        // Try local auth first (self-hosted mode, no Supabase dependency)
        try {
            const res = await fetch('/api/auth/local-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            if (res.ok) {
                const data = await res.json();
                // Set the session manually — the onAuthStateChange listener
                // won't fire for local auth, so we handle it here
                if (data.token && data.user) {
                    // Store token for API calls
                    localStorage.setItem('localAuthToken', data.token);
                    localStorage.setItem('localAuthUser', JSON.stringify(data.user));
                    // Set user directly — the AuthProvider state needs updating
                    setSession({ access_token: data.token } as any);
                    setUser({ id: data.user.id, email: data.user.email, role: data.user.role } as any);
                    return;
                }
            }
        } catch {
            // Local auth unavailable — fall through to Supabase
            console.log('[Auth] Local auth unavailable, trying Supabase...');
        }

        // Fallback to Supabase auth (SaaS/cloud mode)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (typeof window !== 'undefined') {
            window.localStorage.removeItem('selectedClientId');
            window.localStorage.removeItem('sidebar-width');
        }
        if (error) throw error;
        // State updates are handled by the onAuthStateChange listener
    };

    const value = {
        session,
        user,
        loading,
        aal,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
