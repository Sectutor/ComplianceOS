import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { trpc } from '@/lib/trpc';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Loader2, CheckCircle2, AlertCircle, Shield, Rocket, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function RedeemLink() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const { data: user } = trpc.users.me.useQuery();
    const { data: link, isLoading, error } = trpc.magicLinks.get.useQuery(
        { token: token || '' },
        { enabled: !!token }
    );

    const applyMutation = trpc.users.applyMagicLink.useMutation({
        onSuccess: () => {
            toast.success("Welcome aboard! Your benefits have been applied.");
            navigate('/dashboard');
        },
        onError: (err) => {
            toast.error(err.message);
        }
    });

    const handleRedeem = () => {
        if (!token) return;
        applyMutation.mutate({ token });
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full border-none shadow-2xl">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold">Invalid Link</CardTitle>
                        <CardDescription>
                            This magic link is missing a valid security token.
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link to="/auth/login">Go to Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                    <p className="text-slate-500 animate-pulse font-medium">Validating your invitation...</p>
                </div>
            </div>
        );
    }

    if (error || !link) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full border-none shadow-2xl">
                    <CardHeader className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-2xl font-bold">Link Expired or Invalid</CardTitle>
                        <CardDescription>
                            {error?.message || "This invitation link is no longer active or has already been used."}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter>
                        <Button asChild className="w-full">
                            <Link to="/auth/login">Back to Login</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-lg w-full border-none shadow-2xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-blue-50 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="h-10 text-blue-600" />
                    </div>
                    <CardTitle className="text-3xl font-extrabold text-slate-900 leading-tight">
                        Exclusive Invitation
                    </CardTitle>
                    <CardDescription className="text-base text-slate-500 mt-2">
                        {link.label || "You've been invited to join ComplianceOS"}
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 shadow-inner">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">What's included</h4>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Rocket className="h-5 w-5 text-indigo-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 capitalize">{link.planTier} Plan Access</p>
                                    <p className="text-sm text-slate-500">Premium compliance features unlocked.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Shield className="h-5 w-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 capitalize">{link.role} Permissions</p>
                                    <p className="text-sm text-slate-500">Full access to manage your compliance roadmap.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                                    <Users className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800">{link.maxClients} Workspace Capacity</p>
                                    <p className="text-sm text-slate-500">Manage multiple organizations seamlessly.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {!user && (
                        <div className="text-center space-y-4">
                            <p className="text-sm text-slate-600 font-medium bg-amber-50 py-2 rounded-lg border border-amber-100 italic">
                                Please sign in or create an account to redeem this invitation.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <Button asChild variant="outline" className="h-12 font-bold">
                                    <Link to={`/auth/login?invite=${token}`}>Login</Link>
                                </Button>
                                <Button asChild className="h-12 bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-200">
                                    <Link to={`/auth/signup?invite=${token}`}>Sign Up</Link>
                                </Button>
                            </div>
                        </div>
                    )}

                    {user && (
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Signed in as</p>
                                    <p className="text-sm font-semibold text-slate-900 truncate max-w-[150px]">{user.email}</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:bg-blue-100 h-8 text-xs font-bold">
                                <Link to="/auth/login">Not you?</Link>
                            </Button>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="bg-slate-50 border-t border-slate-100 p-6">
                    {user ? (
                        <Button
                            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all duration-300 hover:scale-[1.02]"
                            onClick={handleRedeem}
                            disabled={applyMutation.isPending}
                        >
                            {applyMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Applying Invitation...
                                </>
                            ) : "Redeem Invitation Now"}
                        </Button>
                    ) : (
                        <div className="w-full text-center py-2 text-slate-400 text-xs font-medium">
                            Token: {token.substring(0, 8)}...
                        </div>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
