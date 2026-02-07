import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@complianceos/ui";
import { trpc } from '@/lib/trpc';
import {
    FileText,
    Download,
    Calendar,
    FileBarChart,
    Plus,
    FileCheck,
    ShieldCheck,
    ChevronRight,
    Search,
    Filter,
    Sparkles,
    Shield,
    Activity,
    AlertTriangle,
    BookOpen,
    Layout
} from "lucide-react";
import {
    Button,
    Badge,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Checkbox,
    Input,
    Label
} from "@complianceos/ui";
import { toast } from 'sonner';

interface ReportsDashboardProps {
    clientId: number;
}

const REPORT_SECTIONS = [
    { id: 'executive_summary', label: 'Executive Summary', desc: 'AI-driven high-level business posture overview', icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'gap_analysis', label: 'Gap Analysis & Maturity', desc: 'Detailed breakdown of compliance readiness score', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'risks', label: 'Risk Portfolio', desc: 'Strategic risks and mitigation status', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'controls', label: 'Control Verification', desc: 'Evidence-backed status for all active controls', icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'bcp', label: 'Business Continuity (BCP)', desc: 'Resilience projects and recovery strategies', icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'bia', label: 'Business Impact (BIA)', desc: 'Analysis of critical processes and RTOs', icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { id: 'assets', label: 'Asset Inventory', desc: 'Hardware, software, and information assets', icon: Layout, color: 'text-slate-600', bg: 'bg-slate-50' },
    { id: 'vendors', label: 'Vendor Risk', desc: 'Third-party assessments and supply chain security', icon: ShieldCheck, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'incidents', label: 'Incident History', desc: 'Log of security events and response efficacy', icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'vulnerabilities', label: 'Vulnerability Scan', desc: 'Technical debt and patch management status', icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'audit', label: 'Audit Findings', desc: 'Internal and external audit observation results', icon: BookOpen, color: 'text-zinc-600', bg: 'bg-zinc-50' },
];

export const ReportsDashboard = ({ clientId }: ReportsDashboardProps) => {
    const [isGeneratorOpen, setIsGeneratorOpen] = React.useState(false);
    const [reportTitle, setReportTitle] = React.useState(`Compliance intelligence Report - ${new Date().toLocaleDateString()}`);
    const [selectedSections, setSelectedSections] = React.useState<string[]>(['executive_summary', 'gap_analysis']);

    const { data: reports, isLoading, refetch } = trpc.reports.getReportHistory.useQuery({
        clientId,
        limit: 20
    });

    const generateReportMutation = trpc.reports.generateReport.useMutation({
        onSuccess: (data) => {
            toast.success("Report generated successfully!");
            const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename;
            a.click();
            refetch();
        },
        onError: (err) => {
            toast.error("Failed to generate report: " + err.message);
        }
    });

    const proGenerateMutation = trpc.reports.generateProfessionalReport.useMutation({
        onSuccess: (data) => {
            toast.success("Professional report generated!");
            const blob = new Blob([Uint8Array.from(atob(data.pdfBase64), c => c.charCodeAt(0))], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename;
            a.click();
            setIsGeneratorOpen(false);
            refetch();
        },
        onError: (err) => {
            toast.error("Generation failed: " + err.message);
        }
    });

    const handleGenerateReport = () => {
        toast.promise(generateReportMutation.mutateAsync({ clientId }), {
            loading: 'Generating compliance intelligence report...',
            success: 'Report generated!',
            error: 'Failed to generate report'
        });
    };

    const handleProGenerate = () => {
        if (selectedSections.length === 0) {
            toast.error("Please select at least one section");
            return;
        }
        toast.promise(proGenerateMutation.mutateAsync({
            clientId,
            title: reportTitle,
            includedSections: selectedSections as any,
            dataSources: {
                gapAnalysis: selectedSections.includes('gap_analysis'),
                riskAssessment: selectedSections.includes('risks'),
                controls: selectedSections.includes('controls'),
                policies: true
            }
        }), {
            loading: 'Assembling professional intelligence report...',
            success: 'Report ready for download!',
            error: 'Failed to assemble report'
        });
    };

    const toggleSection = (id: string) => {
        setSelectedSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-8 pb-12">
            {/* Quick Actions / Workshop Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                    { title: "Custom Professional Report", desc: "Build a bespoke intelligence report", icon: Layout, action: () => setIsGeneratorOpen(true), primary: true },
                    { title: "Gap Analysis PDF", desc: "Detailed technical posture survey", icon: FileText, action: handleGenerateReport },
                    { title: "Board Executive Summary", desc: "Clean, chart-heavy PDF brief", icon: FileBarChart, action: handleGenerateReport },
                ].map((workshop, i) => (
                    <button
                        key={i}
                        onClick={workshop.action}
                        className={`flex flex-col items-start p-5 bg-white border ${workshop.primary ? 'border-indigo-200 bg-indigo-50/30' : 'border-slate-200'} rounded-xl hover:border-indigo-500 hover:shadow-md transition-all group text-left`}
                    >
                        <div className={`p-2 ${workshop.primary ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-600'} rounded-lg group-hover:scale-110 transition-transform mb-4`}>
                            <workshop.icon className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{workshop.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">{workshop.desc}</p>
                        <div className="mt-4 flex items-center gap-1 text-[10px] font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                            {workshop.primary ? 'Configure Workshop' : 'Generate Now'} <Plus className="w-3 h-3" />
                        </div>
                    </button>
                ))}
            </div>

            {/* History Table-like view */}
            <Card className="border-none shadow-md overflow-hidden bg-white">
                <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-slate-400" />
                            Report History
                        </CardTitle>
                        <CardDescription>Records of all previously generated compliance intelligence</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search history..."
                                className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48"
                            />
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9">
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="py-20 text-center text-slate-400 flex flex-col items-center gap-2">
                            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            Loading library...
                        </div>
                    ) : !reports || reports.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center gap-4">
                            <div className="p-4 bg-slate-50 rounded-full">
                                <FileText className="w-12 h-12 text-slate-200" />
                            </div>
                            <div>
                                <h3 className="text-slate-900 font-semibold">No reports generated yet</h3>
                                <p className="text-slate-500 text-sm mt-1">Generate your first board summary or technical gap analysis above.</p>
                            </div>
                            <Button onClick={handleGenerateReport} variant="outline" className="mt-2">
                                <Plus className="w-4 h-4 mr-2" />
                                Start Workshop
                            </Button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {reports.map((report: any) => (
                                <div
                                    key={report.id}
                                    className="flex items-center justify-between p-5 hover:bg-slate-50/80 transition-colors group cursor-pointer"
                                    onClick={() => toast.info("Viewing report details")}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2.5 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-sm transition-all border border-transparent group-hover:border-indigo-100">
                                            <FileText className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{report.title}</h4>
                                            <div className="flex items-center gap-3 text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-bold">
                                                    {report.version || 'v1.0'}
                                                </Badge>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(report.generatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Download className="w-3.5 h-3.5" />
                                                    PDF Export
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="sm" className="hidden group-hover:flex">
                                            Download
                                        </Button>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Report Generator Dialog */}
            <Dialog open={isGeneratorOpen} onOpenChange={setIsGeneratorOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
                    <div className="bg-indigo-600 p-8 text-white">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                                    <Layout className="w-6 h-6" />
                                </div>
                                <Badge className="bg-white/20 text-white border-none text-[10px] font-bold tracking-widest uppercase">
                                    Intelligence Workshop
                                </Badge>
                            </div>
                            <DialogTitle className="text-2xl font-bold">Report Assembly Workshop</DialogTitle>
                            <DialogDescription className="text-white/70 text-sm">
                                Compose a professional-grade intelligence report by selecting components from your compliance data lake.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    <div className="p-8 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Report Identity</Label>
                            <Input
                                value={reportTitle}
                                onChange={(e) => setReportTitle(e.target.value)}
                                className="h-9 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50 text-sm"
                                placeholder="e.g. FY2026 Q1 Compliance Posture"
                            />
                        </div>

                        <div className="space-y-3">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Intelligence Components</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {REPORT_SECTIONS.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => toggleSection(section.id)}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-center group relative ${selectedSections.includes(section.id)
                                            ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/10'
                                            : 'border-slate-100 bg-white hover:border-slate-300'
                                            }`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${section.bg} ${section.color} group-hover:scale-110 transition-transform`}>
                                            <section.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h5 className="font-bold text-slate-800 text-[10px] leading-tight">{section.label}</h5>
                                        </div>
                                        <div className="absolute top-2 right-2">
                                            <Checkbox
                                                checked={selectedSections.includes(section.id)}
                                                className="h-3 w-3 rounded-[3px]"
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                            <p className="text-[10px] text-indigo-700 font-medium leading-tight">
                                AI-driven insights are cross-referenced with active evidence vaults for programmatic verification.
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-slate-50 border-t flex items-center justify-between">
                        <p className="text-[10px] text-slate-400 font-medium">
                            Estimated assembly time: <span className="text-indigo-600 font-bold">~12 seconds</span>
                        </p>
                        <div className="flex items-center gap-3">
                            <Button variant="ghost" onClick={() => setIsGeneratorOpen(false)}>Cancel</Button>
                            <Button
                                onClick={handleProGenerate}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-bold shadow-lg shadow-indigo-600/20"
                                disabled={proGenerateMutation.isLoading}
                            >
                                {proGenerateMutation.isLoading ? 'Assembling...' : 'Generate Intelligence'}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
