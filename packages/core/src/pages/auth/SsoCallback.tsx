import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useSsoCallbackMutation } from '../sso/ssoApi';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Loader2 } from 'lucide-react';

/**
 * SSO (OIDC) callback page.
 *
 * The IdP redirects the browser back to `/auth/sso/callback?code=...&state=...`.
 * We exchange the code via `sso.callback`, persist the session JWT exactly like
 * local auth does (localAuthToken / localAuthUser), then reload into the app so
 * AuthProvider picks the session up from localStorage.
 *
 * Contract: `packages/core/src/pages/sso/ssoApi.ts` (mirrors the backend
 * `sso.*` procedures). Graceful degradation per UI-STANDARD §16 — on any
 * failure we render a token-only error card, never crash.
 */
export default function SsoCallback() {
    const [, setLocation] = useLocation();
    const [status, setStatus] = useState('Completing sign-in…');

    const callbackMutation = useSsoCallbackMutation();

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');

        if (!code || !state) {
            setStatus('Invalid SSO callback — missing code or state.');
            return;
        }

        // Prevent double submission if the effect runs twice (React 18 Strict Mode).
        if (callbackMutation.isPending || callbackMutation.isSuccess) return;

        callbackMutation.mutate(
            { code, state },
            {
                onSuccess: (data) => {
                    localStorage.setItem('localAuthToken', data.token);
                    localStorage.setItem('localAuthUser', JSON.stringify(data.user));
                    // Full reload so AuthProvider re-reads localStorage and mounts the app.
                    window.location.assign('/dashboard');
                },
                onError: (err: unknown) => {
                    const message =
                        err && typeof err === 'object' && 'message' in err
                            ? String((err as { message: unknown }).message)
                            : 'SSO sign-in failed.';
                    setStatus(`SSO sign-in failed: ${message}`);
                },
            },
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-xl font-semibold tracking-tight">
                        {callbackMutation.isError ? 'Sign-in error' : 'Single Sign-On'}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        {callbackMutation.isError ? 'Your IdP returned an error.' : 'Connecting you to your identity provider.'}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {callbackMutation.isPending ? (
                        <div className="flex items-center gap-3 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span className="text-sm">{status}</span>
                        </div>
                    ) : (
                        <>
                            <Badge variant={callbackMutation.isError ? 'error' : 'info'}>{status}</Badge>
                            {callbackMutation.isError && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setLocation('/login')}
                                >
                                    Back to login
                                </Button>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
