import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Label } from '@complianceos/ui/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { toast } from 'sonner';
import { Building2, Loader2 } from 'lucide-react';
import MFAChallengeModal from '@/components/auth/MFAChallengeModal';

export default function SignUpPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [, setLocation] = useLocation();
    const { user, signIn } = useAuth(); // Use signIn from AuthContext for consistent state
    const [showMFAModal, setShowMFAModal] = useState(false);
    const [factorId, setFactorId] = useState<string | undefined>(undefined);
    const [mfaRequired, setMfaRequired] = useState(false);

    // Redirect to dashboard on successful signup — no payment required.

    // const createUserCheckout = trpc.billing.createUserCheckout.useMutation();

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }
        if (organizationName.trim().length < 2) {
            toast.error("Please enter a valid organization name");
            return;
        }
        setLoading(true);

        try {
            // Optional invite link (?invite=... or ?token=...); empty on the public demo
            const inviteToken = new URLSearchParams(window.location.search).get('invite')
                || new URLSearchParams(window.location.search).get('token')
                || '';

            // LOCAL AUTH MODE (self-hosted / demo build): register against the app's
            // own endpoint, then sign in via AuthContext so session state is set
            // exactly like a normal login. No Supabase required.
            const registerRes = await fetch('/api/auth/local-register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name: fullName || email.split('@')[0] }),
            });

            const registerData = await registerRes.json().catch(() => ({}));

            if (registerRes.ok) {
                await signIn(email, password);
                if (inviteToken) {
                    toast.success("Account created! Redirecting to redeem your invitation...");
                    setLocation(`/auth/redeem-link?token=${inviteToken}`);
                    return;
                }
                toast.success("Account created! Welcome to ComplianceOS.");
                setLocation('/dashboard?onboarding=true');
                return;
            }

            // Account already exists — fall back to signing in
            if (/already|exists/i.test(registerData.error || '')) {
                toast.info("User already exists. Attempting to log in...");
                await signIn(email, password);
                if (inviteToken) {
                    toast.success("Logged in successfully! Redirecting to redeem your invitation...");
                    setLocation(`/auth/redeem-link?token=${inviteToken}`);
                    return;
                }
                toast.success("Logged in successfully! Welcome back.");
                setLocation('/dashboard');
                return;
            }

            throw new Error(registerData.error || 'Failed to complete signup');
        } catch (error: any) {
            console.error("Signup flow error:", error);
            toast.error(error.message || 'Failed to complete signup');
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-[#002a40]">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />

            <Card className="w-full max-w-md relative z-10 bg-[#001e2b] border-slate-700 shadow-2xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-[#0ea5e9] flex items-center justify-center text-white mb-4">
                        <Building2 className="h-7 w-7 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-white">Create Account</CardTitle>
                    <CardDescription className="text-slate-400">
                        Start your compliance journey today
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignUp}>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="fullName" className="text-slate-300">Full Name</Label>
                                <Input
                                    id="fullName"
                                    type="text"
                                    placeholder="John Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="bg-[#002a40] border-slate-600 text-white placeholder:text-slate-500 focus:border-[#0ea5e9] hover:bg-[#003554] transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="organizationName" className="text-slate-300">Organization Name</Label>
                                <Input
                                    id="organizationName"
                                    type="text"
                                    placeholder="Acme Inc."
                                    value={organizationName}
                                    onChange={(e) => setOrganizationName(e.target.value)}
                                    required
                                    className="bg-[#002a40] border-slate-600 text-white placeholder:text-slate-500 focus:border-[#0ea5e9] hover:bg-[#003554] transition-colors"
                                />
                                <p className="text-xs text-slate-500">
                                    The name of your compliance workspace
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-slate-300">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-[#002a40] border-slate-600 text-white placeholder:text-slate-500 focus:border-[#0ea5e9] hover:bg-[#003554] transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-slate-300">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-[#002a40] border-slate-600 text-white placeholder:text-slate-500 focus:border-[#0ea5e9] hover:bg-[#003554] transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="bg-[#002a40] border-slate-600 text-white placeholder:text-slate-500 focus:border-[#0ea5e9] hover:bg-[#003554] transition-colors"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4 pb-8">
                        <Button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-medium text-lg border-none" disabled={loading}>
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Processing...
                                </span>
                            ) : 'Create Account & Try'}
                        </Button>
                        <div className="text-center text-sm text-slate-400">
                            Already have an account?{' '}
                            <Button
                                variant="link"
                                type="button"
                                className="px-0 font-semibold text-[#0ea5e9] hover:text-[#0284c7]"
                                onClick={() => {
                                    const invite = new URLSearchParams(window.location.search).get('invite');
                                    setLocation(invite ? `/login?invite=${invite}` : '/login');
                                }}
                            >
                                Sign in
                            </Button>
                        </div>
                    </CardFooter>
                </form>
            </Card>
            {showMFAModal && (
                <MFAChallengeModal
                    open={showMFAModal}
                    onOpenChange={async (o) => {
                        setShowMFAModal(o);
                        if (!o) {
                            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
                            if (aal?.currentLevel === 'aal2') {
                                setMfaRequired(false);
                                setLoading(true);
                                toast.success("Account created! Welcome to ComplianceOS.");
                                setLocation('/dashboard?onboarding=true');
                            }
                        }
                    }}
                    factorId={factorId}
                />
            )}
        </div>
    );
}
