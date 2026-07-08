import React, { createContext, useContext, useEffect, useState } from 'react';

interface AuthUser {
    id: string;
    email: string;
    role: string;
}

interface AuthSession {
    access_token: string;
}

interface AuthContextType {
    session: AuthSession | null;
    user: AuthUser | null;
    loading: boolean;
    aal?: string | null;
    signIn: (email?: string, password?: string) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<AuthSession | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [aal] = useState<string | null>(null);

    useEffect(() => {
        // Check for local auth token (self-hosted mode, no Supabase)
        const localToken = localStorage.getItem('localAuthToken');
        const localUserStr = localStorage.getItem('localAuthUser');
        if (localToken && localUserStr) {
            try {
                const parts = localToken.split('.');
                if (parts.length === 3) {
                    const body = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
                    if (body.exp && body.exp * 1000 < Date.now()) {
                        localStorage.removeItem('localAuthToken');
                        localStorage.removeItem('localAuthUser');
                        setLoading(false);
                        return;
                    }
                }
                const localUser = JSON.parse(localUserStr);
                setSession({ access_token: localToken });
                setUser({ id: localUser.id, email: localUser.email, role: localUser.role });
                setLoading(false);
                return;
            } catch {
                localStorage.removeItem('localAuthToken');
                localStorage.removeItem('localAuthUser');
            }
        }
        setLoading(false);
    }, []);

    const signIn = async (email?: string, password?: string) => {
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const res = await fetch('/api/auth/local-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Invalid credentials');
        }

        const data = await res.json();
        if (data.error) {
            throw new Error(data.error);
        }

        if (data.token && data.user) {
            localStorage.setItem('localAuthToken', data.token);
            localStorage.setItem('localAuthUser', JSON.stringify(data.user));
            setSession({ access_token: data.token });
            setUser({ id: data.user.id, email: data.user.email, role: data.user.role });
            return;
        }

        throw new Error('Login failed - unexpected response');
    };

    const signOut = async () => {
        localStorage.removeItem('localAuthToken');
        localStorage.removeItem('localAuthUser');
        localStorage.removeItem('selectedClientId');
        localStorage.removeItem('sidebar-width');
        setSession(null);
        setUser(null);
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
