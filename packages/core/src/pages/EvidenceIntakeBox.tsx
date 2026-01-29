import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Upload, FileText, CheckCircle2, Clock, AlertCircle,
    Sparkles, Inbox, Search, Filter, MoreHorizontal
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useParams } from "wouter";

export default function EvidenceIntakeBox() {
    const [isDragging, setIsDragging] = useState(false);
    const params = useParams();
    const clientId = params.id ? parseInt(params.id) : null;

    // Real tRPC connections
    const { data: intakeItems, refetch } = trpc.intake.list.useQuery(
        { clientId: clientId as number },
        { enabled: !!clientId }
    );

    const uploadMutation = trpc.intake.create.useMutation({
        onSuccess: () => {
            toast.success("File added to intake box!");
            refetch();
        }
    });

    const triageMutation = trpc.intake.triage.useMutation({
        onSuccess: () => {
            toast.success("AI Triage complete!");
            refetch();
        }
    });

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !clientId) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64 = (event.target?.result as string).split(',')[1];
            uploadMutation.mutate({
                clientId,
                filename: file.name,
                fileUrl: "https://example.com/mock-upload-" + Date.now(),
                fileBase64: base64
            });
        };
        reader.readAsDataURL(file);
    };

    const triggerUpload = () => {
        document.getElementById("file-upload")?.click();
    };

    const runTriage = (id: number) => {
        triageMutation.mutate({
            id,
            classification: "Financial Record (Auto-detected)",
            details: { confidence: 98, date: new Date().toISOString() }
        });
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Inbox className="h-8 w-8 text-indigo-600" />
                            Evidence Intake Box
                        </h1>
                        <p className="text-muted-foreground mt-1 text-lg">
                            "The Accountant Model": Just drop your evidence here. We'll handle the mapping and compliance logic for you.
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleUpload}
                        />
                        <Button variant="outline">
                            <Filter className="mr-2 h-4 w-4" /> Filter
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={triggerUpload} disabled={uploadMutation.isPending}>
                            <Upload className="mr-2 h-4 w-4" /> {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
                        </Button>
                    </div>
                </div>

                {/* Drop Zone */}
                <Card
                    className={`border-2 border-dashed transition-all cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-slate-200"}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); triggerUpload(); }}
                    onClick={triggerUpload}
                >
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="h-20 w-20 bg-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                            <Upload className="h-10 w-10 text-indigo-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900">Drop Evidence Receipts Here</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mt-3 leading-relaxed">
                            Upload log exports, screenshots, invoices, or policies.
                            Our AI and Advisors will triage them into your compliance framework.
                        </p>
                        <div className="mt-6 flex gap-2">
                            <Badge variant="outline" className="bg-white">PDF</Badge>
                            <Badge variant="outline" className="bg-white">PNG/JPG</Badge>
                            <Badge variant="outline" className="bg-white">DOCX</Badge>
                            <Badge variant="outline" className="bg-white">CSV</Badge>
                        </div>
                    </CardContent>
                </Card>

                {/* Actionable Intake Table */}
                <Card className="shadow-lg border-slate-200">
                    <CardHeader className="border-b bg-slate-50/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Processing Queue</CardTitle>
                                <CardDescription>Items currently being triaged by your compliance advisor team.</CardDescription>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-indigo-200">
                                {intakeItems?.length || 0} Items
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/30">
                                    <TableHead className="w-[300px]">File Name</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>AI Classification</TableHead>
                                    <TableHead>Date Uploaded</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {intakeItems?.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <FileText className="h-5 w-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-900">{item.filename}</span>
                                                    <span className="text-xs text-slate-500">{(Math.random() * 5 + 1).toFixed(1)} MB</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={item.status === 'mapped' ? 'success' : item.status === 'classified' ? 'secondary' : 'outline'}
                                                className="capitalize"
                                            >
                                                {item.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                {item.status === 'pending' ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 px-2"
                                                        onClick={() => runTriage(item.id)}
                                                        disabled={triageMutation.isLoading}
                                                    >
                                                        <Sparkles className="h-3 w-3 mr-1" />
                                                        Run AI Triage
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Sparkles className="h-3 w-3 text-amber-500" />
                                                        <span className="font-medium text-slate-700">{item.classification}</span>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-slate-500 text-sm">
                                            {new Date(item.createdAt!).toLocaleDateString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="hover:bg-slate-100">
                                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {(!intakeItems || intakeItems.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-20">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <Inbox className="h-12 w-12 mb-3 opacity-20" />
                                                <p className="text-lg font-medium">Your Intake Box is empty</p>
                                                <p className="text-sm max-w-xs mt-1">Start by dragging and dropping evidence files here for our team to process.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
