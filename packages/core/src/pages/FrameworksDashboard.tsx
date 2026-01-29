import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Badge } from "@complianceos/ui/ui/badge";
import { Search, Shield, Info, ArrowRight, BookOpen } from "lucide-react";
import { useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { frameworks } from "@/data/frameworks";

import { trpc } from "@/lib/trpc";
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";

export default function FrameworksDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 1; // Fallback to 1 for demo if no client selected

    // Fetch Stats
    const { data: stats } = trpc.compliance.frameworkStats.list.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const filteredFrameworks = frameworks.filter(fw =>
        fw.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        fw.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStats = (fwName: string) => {
        if (!stats || !Array.isArray(stats)) return { percentage: 0, total: 0, implemented: 0 };
        // Try exact match first, then fuzzy
        const exact = stats.find((s: any) => s.framework === fwName);
        if (exact) return exact;

        // Fuzzy match: check if one contains the other (e.g. "ISO 27001" inside "ISO 27001:2022")
        return stats.find((s: any) => fwName.includes(s.framework) || s.framework.includes(fwName)) || { percentage: 0, total: 0, implemented: 0 };
    };

    const getProgressColor = (percentage: number) => {
        if (percentage === 0) return "text-slate-200";
        if (percentage < 30) return "text-red-500";
        if (percentage < 70) return "text-amber-500";
        return "text-emerald-500";
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Breadcrumb
                    items={[
                        { label: "Compliance", href: "/compliance" },
                        { label: "Frameworks Library" },
                    ]}
                />

                <div className="flex flex-col gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Frameworks Library</h1>
                    <p className="text-muted-foreground">
                        Browse and manage adoption of standard security and privacy frameworks.
                    </p>
                </div>

                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border shadow-sm max-w-md">
                    <Search className="h-5 w-5 text-gray-400 ml-2" />
                    <Input
                        className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                        placeholder="Search frameworks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredFrameworks.map((fw) => {
                        const fwStats = getStats(fw.name);
                        const progressColor = getProgressColor(fwStats.percentage);

                        return (
                            <Card key={fw.id} className="group hover:border-primary/50 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md overflow-hidden" onClick={() => setLocation(`/controls?framework=${encodeURIComponent(fw.name)}`)}>
                                <div className="p-6 flex h-full gap-5">
                                    {/* Left Side: Info */}
                                    <div className="flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-3">
                                            {fw.logo ? (
                                                <div className="h-10 w-14 rounded p-0.5 bg-white border flex items-center justify-center">
                                                    <img src={fw.logo} alt={fw.name} className="w-full h-full object-contain" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary">
                                                    <Shield className="h-5 w-5" />
                                                </div>
                                            )}
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-normal hover:bg-slate-200 text-[10px] px-2 py-0.5 h-5">{fw.type}</Badge>
                                        </div>

                                        <div className="mb-auto">
                                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors leading-tight mb-2">
                                                {fw.name}
                                            </h3>
                                            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                                                {fw.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-2 flex items-center text-sm font-medium text-primary group-hover:translate-x-1 transition-transform">
                                            View Controls <ArrowRight className="ml-1 h-4 w-4" />
                                        </div>
                                    </div>

                                    {/* Right Side: Progress */}
                                    <div className="flex flex-col items-center justify-center border-l dashed border-slate-100 pl-4 min-w-[120px]">
                                        <CircularProgress
                                            value={fwStats.percentage}
                                            size={100}
                                            strokeWidth={10}
                                            color={progressColor}
                                        />
                                        <span className={`mt-3 text-xs font-bold uppercase tracking-wide ${fwStats.percentage > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                                            {fwStats.percentage > 0 ? `${fwStats.percentage}% Done` : 'Not Started'}
                                        </span>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    {filteredFrameworks.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No frameworks found</h3>
                            <p className="text-muted-foreground mt-1">Try adjusting your search terms.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
