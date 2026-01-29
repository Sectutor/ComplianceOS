import { useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Shield, CheckCircle2, Lock, FileText, Download, TrendingUp, Globe, Calendar, ExternalLink } from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

// Mock Data for "Public" view - in real app this would come from a specific public-safe endpoint
const mockTrendData = [
    { month: 'Jan', score: 85 },
    { month: 'Feb', score: 88 },
    { month: 'Mar', score: 92 },
    { month: 'Apr', score: 94 },
    { month: 'May', score: 96 },
    { month: 'Jun', score: 98 },
];

const mockComplianceData = [
    { name: 'SOC 2 Type II', status: 'Compliant', date: 'Dec 2025', color: '#22c55e' },
    { name: 'ISO 27001', status: 'In Progress', date: 'Target: Q1 2026', color: '#f59e0b' },
    { name: 'GDPR', status: 'Compliant', date: 'Ongoing', color: '#3b82f6' },
    { name: 'HIPAA', status: 'Compliant', date: 'Audited Nov 2025', color: '#8b5cf6' },
];

export default function TrustCenter() {
    const [match, params] = useRoute("/trust-center/:clientId");
    const clientId = params?.clientId ? parseInt(params.clientId) : 0;

    // In a real implementation, we would use a public Procedure that checks a token or doesn't require auth
    // For this demo, we use the standard client fetch, assuming the user is viewing their OWN trust center preview
    // or that we've relaxed middleware for this specific route.
    // Ideally: const { data: trustData } = trpc.trustCenter.getPublicData.useQuery({ clientId });
    const { data: client } = trpc.clients.get.useQuery({ id: clientId }, { enabled: !!clientId });
    const { data: readinessData } = trpc.compliance.getReadinessData.useQuery({ clientId: clientId }, { enabled: !!clientId });

    if (!clientId) return <div className="p-10 text-center">Invalid Trust Center Link</div>;

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Hero Section */}
            <div className="bg-slate-900 text-white pt-20 pb-32 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                    <div className="absolute right-0 top-0 w-[800px] h-[800px] bg-indigo-500 rounded-full blur-[120px] mix-blend-screen opacity-30 animate-pulse" />
                    <div className="absolute left-0 bottom-0 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[100px] mix-blend-screen opacity-20" />
                </div>

                <div className="container mx-auto px-6 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-blue-300 text-sm font-medium mb-6 border border-white/10 backdrop-blur-sm">
                        <Shield className="h-4 w-4" />
                        <span>Official Trust Center</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        {client?.name || "Company"} Security
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                        We represent our commitment to data security, privacy, and compliance.
                        View our real-time status and security posture below.
                    </p>

                    <div className="flex justify-center gap-4">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-900/50">
                            <Download className="mr-2 h-5 w-5" /> Request Audit Report
                        </Button>
                        <Button size="lg" variant="outline" className="text-black border-white/20 hover:bg-white/10">
                            <ExternalLink className="mr-2 h-5 w-5" /> Visit Website
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content - Floating Cards */}
            <div className="container mx-auto px-6 -mt-20 relative z-20 pb-20">

                {/* Status Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-slate-900/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <CheckCircle2 className="h-5 w-5 text-green-500" /> System Status
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">Operational</div>
                            <p className="text-slate-500 text-sm mt-1">All systems normal</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-slate-900/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <Lock className="h-5 w-5 text-indigo-500" /> Data Protection
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">Encrypted</div>
                            <p className="text-slate-500 text-sm mt-1">AES-256 at rest & TLS 1.3 in transit</p>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/90 backdrop-blur-md border-0 shadow-xl ring-1 ring-slate-900/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-700">
                                <Globe className="h-5 w-5 text-blue-500" /> Compliance Score
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{readinessData?.complianceScore.overall || 98}%</div>
                            <p className="text-slate-500 text-sm mt-1">Real-time control monitoring</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Framework Badges */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <CardTitle>Security Frameworks</CardTitle>
                            <CardDescription>Our active compliance certifications and attestations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {mockComplianceData.map((item) => (
                                <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-white shadow-sm border border-slate-100 font-bold text-slate-700 text-xs">
                                            {item.name.substring(0, 3)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900">{item.name}</div>
                                            <div className="text-xs text-slate-500">{item.date}</div>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className={cn("bg-white",
                                        item.status === 'Compliant' ? 'text-green-600 border-green-200' :
                                            item.status === 'In Progress' ? 'text-amber-600 border-amber-200' : 'text-slate-600'
                                    )}>
                                        {item.status}
                                    </Badge>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-md">
                        <CardHeader>
                            <CardTitle>Continuous Monitoring</CardTitle>
                            <CardDescription>12-month compliance adherence history.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={mockTrendData}>
                                    <defs>
                                        <linearGradient id="colorPublicScore" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                                    <YAxis hide domain={[60, 100]} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#0f172a', fontWeight: 600 }}
                                    />
                                    <Area type="monotone" dataKey="score" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorPublicScore)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Footer */}
                <div className="text-center text-slate-400 text-sm mt-20">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <Shield className="h-4 w-4" />
                        <span className="font-semibold">Secured by ComplianceOS</span>
                    </div>
                    <p>&copy; {new Date().getFullYear()} {client?.name || "Company"}. All rights reserved.</p>
                </div>

            </div>
        </div>
    );
}
