import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Label } from '@complianceos/ui/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { Loader2 } from 'lucide-react';
import MFAChallengeModal from '@/components/auth/MFAChallengeModal';
import { useSsoStatusQuery, useSsoStartQuery } from '../sso/ssoApi';

export default function LoginPage() {
    const utils = trpc.useUtils();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [, setLocation] = useLocation();
    const { user, signIn, signOut } = useAuth();
    const [showMFAModal, setShowMFAModal] = useState(false);
    const [factorId, setFactorId] = useState<string | undefined>(undefined);
    const [mfaRequired, setMfaRequired] = useState(false);
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    // Enterprise SSO (cycle 9): OIDC entry point — hidden unless the backend reports it enabled.
    const ssoStatus = useSsoStatusQuery();
    const ssoStart = useSsoStartQuery();
    const [ssoStarting, setSsoStarting] = useState(false);

    const handleSsoStart = async () => {
        if (ssoStarting) return;
        setSsoStarting(true);
        try {
            const result = await ssoStart.refetch();
            const url = result?.data?.authorizationUrl;
            if (!url) {
                console.warn('[SSO] sso.start returned no authorization URL');
                toast.error('SSO is not available right now.');
            } else {
                window.location.assign(url);
            }
        } catch (err) {
            console.error('[SSO] sso.start failed:', err);
            toast.error('SSO sign-in could not be started.');
        } finally {
            setSsoStarting(false);
        }
    };

    // Pre-fill email from query params if available
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const emailParam = searchParams.get('email');
        if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
        }
    }, []);

    // Check if user has seen tour
    const {
        data: userProfile,
        isLoading: isProfileLoading,
        isError,
        error: profileError
    } = trpc.users.me.useQuery(undefined, {
        enabled: !!user,
        retry: false
    });

    useEffect(() => {
        const checkMfaStatus = async () => {
            // Skip MFA for local auth
            if (localStorage.getItem('localAuthToken')) return;

            if (user && !mfaRequired && !isLoggingIn) {
                const { data: aalInfo } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                console.log("[MFA Login] Auto-check AAL:", aalInfo);

                if (aalInfo?.currentLevel === 'aal1' && aalInfo?.nextLevel === 'aal2') {
                    // User has factors but hasn't verified one yet
                    const { data: lf } = await supabase.auth.mfa.listFactors();
                    const factors = lf?.factors || [];
                    const totp = factors.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');

                    if (totp?.id) {
                        setFactorId(totp.id);
                        setMfaRequired(true);
                        setShowMFAModal(true);
                        return;
                    }
                }
            }
        };

        checkMfaStatus();
    }, [user, mfaRequired, isLoggingIn]);

    useEffect(() => {
        // For local auth: redirect immediately without waiting for profile fetch
        if (user && !isLoggingIn && localStorage.getItem('localAuthToken')) {
            const searchParams = new URLSearchParams(window.location.search);
            setLocation(searchParams.get('invite') ? `/auth/redeem-link?token=${searchParams.get('invite')}` : '/dashboard');
            return;
        }

        // Only redirect if user exists, profile is loaded, we're not actively logging in, and MFA is not pending
        if (user && !isProfileLoading && !mfaRequired && !isLoggingIn) {
            if (isError) {
                console.error("Profile fetch failed:", profileError);
                return;
            }

            const searchParams = new URLSearchParams(window.location.search);
            const inviteToken = searchParams.get('invite');

            if (userProfile && !userProfile.hasSeenTour) {
                setLocation(inviteToken ? `/auth/redeem-link?token=${inviteToken}` : '/start-here');
            } else {
                setLocation(inviteToken ? `/auth/redeem-link?token=${inviteToken}` : '/dashboard');
            }
        }
    }, [user, userProfile, isProfileLoading, setLocation, isError, profileError, mfaRequired, isLoggingIn]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setIsLoggingIn(true);

        try {
            // Step 1: Login with password
            await signIn(email, password);

            // Step 2: If local auth (self-hosted mode), skip all Supabase MFA checks
            if (localStorage.getItem('localAuthToken')) {
                toast.success('Logged in successfully');
                setMfaRequired(false);
                setIsLoggingIn(false);
                setLoading(false);
                return;
            }

            // Step 3: Supabase MFA flow (cloud/Supabase mode only)
            setMfaRequired(true);
            const { data: aalInfo } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

            if (aalInfo?.currentLevel === 'aal2') {
                console.log("[MFA Login] Already AAL2, proceeding.");
                toast.success('Logged in successfully');
                setMfaRequired(false);
                setIsLoggingIn(false);
                setLoading(false);
            } else if (aalInfo?.nextLevel === 'aal2') {
                console.log("[MFA Login] AAL2 verification required (nextLevel is aal2)");
                const { data: lf } = await supabase.auth.mfa.listFactors();
                const factors = lf?.factors || [];
                const totp = factors.find((f: any) => f.factor_type === 'totp' && f.status === 'verified');

                if (totp?.id) {
                    console.log("[MFA Login] TOTP factor found, showing modal:", totp.id);
                    setFactorId(totp.id);
                    setShowMFAModal(true);
                    toast.message('Security verification required');
                    setLoading(false);
                    // DO NOT clear isLoggingIn or mfaRequired here
                } else {
                    console.warn("[MFA Login] nextLevel is aal2 but no verified totp found. Checking profile as fallback.");
                    const profile = userProfile || await utils.users.me.fetch();
                    if (profile?.client?.requireMfa) {
                        toast.message('MFA enrollment required');
                        setLocation('/settings/security?mfa=enroll');
                    } else {
                        toast.success('Logged in successfully');
                    }
                    setMfaRequired(false);
                    setIsLoggingIn(false);
                    setLoading(false);
                }
            } else {
                console.log("[MFA Login] No factors enrolled. Checking if MFA is mandatory for this client...");
                const profile = userProfile || await utils.users.me.fetch();

                if (profile?.client?.requireMfa) {
                    console.log("[MFA Login] MFA is mandatory. Redirecting to enrollment.");
                    toast.message('Multi-factor authentication is required by your organization');
                    setLocation('/settings/security?mfa=enroll');
                    setMfaRequired(false);
                    setIsLoggingIn(false);
                    setLoading(false);
                } else {
                    console.log("[MFA Login] MFA not required. Normal login success.");
                    toast.success('Logged in successfully');
                    setMfaRequired(false);
                    setIsLoggingIn(false);
                    setLoading(false);
                }
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to login');
            setLoading(false);
            setMfaRequired(false);
            setIsLoggingIn(false);
        }
    };

    if (user && isProfileLoading && !mfaRequired && !showMFAModal) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-sidebar">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
        );
    }

    if (user && isError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-sidebar p-4">
                <Card className="w-full max-w-md bg-sidebar-muted border-red-900/50 shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-red-500">Authentication Error</CardTitle>
                        <CardDescription className="text-sidebar-foreground/60">
                            We verified your credentials, but could not load your profile.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-3 bg-red-950/30 rounded border border-red-900/50 text-red-200 text-sm font-mono break-all">
                            {profileError?.message || 'Unknown error occurred'}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={() => {
                                signOut();
                                setLoading(false);
                            }}
                            variant="destructive"
                            className="w-full"
                        >
                            Sign Out & Try Again
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-sidebar">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

            <Card className="w-full max-w-md relative z-10 bg-sidebar-muted border-sidebar-border shadow-2xl">
                <CardHeader className="text-center space-y-1">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-sidebar-accent flex items-center justify-center text-white mb-4">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-7 w-7"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
                    <CardDescription className="text-sidebar-foreground/60">Sign in to your GRCompliance account</CardDescription>
                </CardHeader>
                <form onSubmit={handleLogin}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sidebar-foreground/80">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-sidebar border-sidebar-border text-white placeholder:text-sidebar-foreground/40 focus:border-[#0ea5e9] hover:bg-sidebar-primary/80 transition-colors"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sidebar-foreground/80">Password</Label>
                                <Button variant="link" className="px-0 font-normal h-auto text-sidebar-accent hover:text-sidebar-accent" type="button">Forgot password?</Button>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-sidebar border-sidebar-border text-white placeholder:text-sidebar-foreground/40 focus:border-[#0ea5e9] hover:bg-sidebar-primary/80 transition-colors"
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pb-8">
                        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-medium text-lg border-none" disabled={loading}>
                            {loading ? 'Signing in...' : 'Sign In'}
                        </Button>
                        {ssoStatus.data?.mode === 'oidc' && (
                            <>
                                <div className="flex items-center gap-3 w-full">
                                    <div className="h-px flex-1 bg-sidebar-border" />
                                    <span className="text-xs uppercase tracking-wider text-sidebar-foreground/50">or</span>
                                    <div className="h-px flex-1 bg-sidebar-border" />
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full h-11 border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-primary/60"
                                    disabled={ssoStarting || ssoStatus.isLoading}
                                    onClick={handleSsoStart}
                                >
                                    {ssoStarting ? 'Redirecting…' : 'Continue with SSO'}
                                </Button>
                                {ssoStatus.data?.providerName && (
                                    <p className="text-center text-xs text-sidebar-foreground/50">
                                        Sign in with {ssoStatus.data.providerName}
                                    </p>
                                )}
                            </>
                        )}
                        <div className="text-center text-sm text-sidebar-foreground/60">
                            Don't have an account?{' '}
                            <Button
                                variant="link"
                                type="button"
                                className="px-0 font-semibold text-sidebar-accent hover:text-sidebar-accent"
                                onClick={() => setLocation('/signup')}
                            >
                                Sign up
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
            {showMFAModal && (
                <MFAChallengeModal
                    open={showMFAModal}
                    onOpenChange={(o) => {
                        setShowMFAModal(o);
                        if (!o) {
                            (async () => {
                                const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                                if (data?.currentLevel === 'aal2') {
                                    setMfaRequired(false);
                                    setIsLoggingIn(false);
                                } else {
                                    setShowMFAModal(true);
                                    setMfaRequired(true);
                                }
                            })();
                        }
                    }}
                    factorId={factorId}
                />
            )}
        </div>
    );
}
