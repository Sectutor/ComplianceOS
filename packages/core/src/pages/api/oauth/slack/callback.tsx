import React, { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function SlackOAuthCallback() {
    const location = useLocation();
    const navigate = useNavigate();
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 1;
    const hasExchanged = useRef(false);

    const mutation = trpc.integrations.handleOAuthCallback.useMutation({
        onSuccess: () => {
            toast.success('Slack connected successfully');
            navigate('/settings/integrations');
        },
        onError: (error) => {
            console.error('[SlackOAuth] Error:', error);
            toast.error(`Failed to connect Slack: ${error.message}`);
            navigate('/settings/integrations');
        }
    });

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        if (error) {
            toast.error(`Slack Error: ${error}`);
            navigate('/settings/integrations');
            return;
        }

        if (!code) {
            toast.error('No code received from Slack');
            navigate('/settings/integrations');
            return;
        }

        // CSRF protection check
        const savedState = sessionStorage.getItem("slack_oauth_state");
        if (state && savedState && state !== savedState) {
            toast.error('Invalid state parameter. Possible CSRF attack.');
            navigate('/settings/integrations');
            return;
        }

        if (!hasExchanged.current) {
            hasExchanged.current = true;
            console.log(`[SlackOAuth] Exchanging code for tenant ${clientId}`);
            mutation.mutate({
                provider: 'slack',
                code,
                clientId
            });

            // Clear state after use
            sessionStorage.removeItem("slack_oauth_state");
        }
    }, [location.search, clientId, navigate, mutation]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <h2 className="text-xl font-bold text-slate-900">Finalizing Slack Connection...</h2>
            <p className="text-slate-500">Please wait while we complete the integration.</p>
        </div>
    );
}

export default SlackOAuthCallback;
