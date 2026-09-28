import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { toast } from "sonner";

/**
 * Completes a local-auth password reset: the visitor arrives with a
 * single-use token from the emailed reset link and sets a new password.
 */
export default function LocalResetPassword() {
    const [, navigate] = useLocation();
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [done, setDone] = useState(false);

    const resetMutation = trpc.users.completeLocalPasswordReset.useMutation({
        onSuccess: () => {
            setDone(true);
            toast.success("Password updated — you can sign in with your new password.");
            setTimeout(() => navigate("/login"), 1800);
        },
        onError: (err) => toast.error(err.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!token) {
            toast.error("This page needs a reset token — use the link from your email.");
            return;
        }
        if (password.length < 12) {
            toast.error("Password must be at least 12 characters.");
            return;
        }
        if (password !== confirm) {
            toast.error("Passwords do not match.");
            return;
        }
        resetMutation.mutate({ token, newPassword: password });
    };

    return (
        <div className="min-h-screen bg-[#002a40] text-white flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full space-y-6">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold">Set a new password</h1>
                    <p className="text-slate-400 text-sm">
                        Choose a strong password — at least 12 characters.
                    </p>
                </div>

                {done ? (
                    <div className="text-center text-emerald-400 text-sm">
                        Password updated. Redirecting you to the login page…
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">New password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••••••"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Confirm new password</label>
                            <Input
                                type="password"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                placeholder="••••••••••••"
                                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12"
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            disabled={resetMutation.isPending || !token}
                            className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                        >
                            {resetMutation.isPending ? "Updating…" : "Update Password"}
                        </Button>
                        {!token && (
                            <p className="text-red-400 text-sm text-center">
                                Missing reset token — open the link from your email.
                            </p>
                        )}
                    </form>
                )}
            </div>
        </div>
    );
}
