import { Link } from "wouter";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background px-4">
            <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center mb-6">
                    <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-6xl font-black tracking-tight text-foreground">404</h1>
                <p className="text-lg text-muted-foreground mt-3 mb-8">Page Not Found</p>
                <Link href="/">
                    <Button className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Return to Home
                    </Button>
                </Link>
            </div>
        </div>
    );
}
