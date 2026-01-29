import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@complianceos/ui/ui/avatar";
import { Badge } from "@complianceos/ui/ui/badge";
import { Separator } from "@complianceos/ui/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { User, Mail, Shield, Moon, Sun, Laptop, Loader2, Save, Lock } from "lucide-react";


export default function Profile() {
    const { user, session } = useAuth();
    const { theme, setTheme } = useTheme();
    const [fullName, setFullName] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (user?.user_metadata?.full_name) {
            setFullName(user.user_metadata.full_name);
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            if (error) throw error;
            toast.success("Profile updated successfully");
        } catch (error: any) {
            toast.error("Failed to update profile: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getInitials = (name: string) => {
        return name
            ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
            : user?.email?.charAt(0).toUpperCase() || "U";
    };

    return (
        <DashboardLayout>
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
                        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
                    </div>
                </div>

                <div className="grid gap-8 md:grid-cols-3">
                    {/* User Identity Card */}
                    <Card className="md:col-span-1 shadow-md border-muted/40">
                        <CardHeader className="text-center pb-2">
                            <div className="mx-auto mb-4 relative">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
                                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                                    <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                                        {getInitials(fullName || user?.email || "")}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute bottom-0 right-0 bg-green-500 w-4 h-4 rounded-full border-2 border-background"></div>
                            </div>
                            <CardTitle className="text-xl">{fullName || "User"}</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-1.5 mt-1">
                                <Mail className="h-3.5 w-3.5" /> {user?.email}
                            </CardDescription>
                            <div className="mt-4 flex justify-center">
                                <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                    <Shield className="h-3 w-3 mr-1" />
                                    {session?.user?.role === 'authenticated' ? 'Member' : 'Guest'}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Joined</p>
                                    <p className="font-medium">{new Date(user?.created_at || "").toLocaleDateString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Last Sign In</p>
                                    <p className="font-medium">{new Date(user?.last_sign_in_at || "").toLocaleDateString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Settings Sections */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Profile Details */}
                        <Card className="shadow-sm border-muted/40">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Personal Information
                                </CardTitle>
                                <CardDescription>
                                    Update your personal details visible to other team members.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleUpdateProfile} className="space-y-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="email">Email Address</Label>
                                        <Input id="email" value={user?.email || ""} disabled className="bg-muted/50" />
                                        <p className="text-[0.8rem] text-muted-foreground">Email address cannot be changed.</p>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            className="bg-background"
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={isLoading} className="gap-2">
                                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            Save Changes
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Security / Password */}
                        <Card className="shadow-sm border-muted/40">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-primary" />
                                    Security
                                </CardTitle>
                                <CardDescription>
                                    Manage your password and account security.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                                        <div className="space-y-0.5">
                                            <div className="font-medium">Password</div>
                                            <div className="text-sm text-muted-foreground">
                                                Update your password associated with this account.
                                            </div>
                                        </div>
                                        <Button variant="outline" onClick={() => window.location.href = '/update-password'}>
                                            Change Password
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Usage / Theme */}
                        <Card className="shadow-sm border-muted/40">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Laptop className="h-5 w-5 text-primary" />
                                    Appearance
                                </CardTitle>
                                <CardDescription>
                                    Customize how Compliance OS looks comfortably for you.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 gap-4">
                                    <div
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        <Sun className={`h-6 w-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">Light</span>
                                    </div>
                                    <div
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        <Moon className={`h-6 w-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">Dark</span>
                                    </div>
                                    <div
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-accent ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30'}`}
                                        onClick={() => setTheme('system')}
                                    >
                                        <Laptop className={`h-6 w-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <span className="text-sm font-medium">System</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>



            </div>
        </DashboardLayout>
    );
}
