
import React from 'react';
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Shield, ArrowLeft, ExternalLink, Info, Book } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Skeleton } from "@complianceos/ui/ui/skeleton";

export default function NIS2MappingHub() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    const { data: mappings, isLoading } = trpc.cyber.getMappings.useQuery();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <button
                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber`)}
                        className="flex items-center text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <Shield className="w-8 h-8 text-sky-600" />
                        NIS2 Mapping Hub
                        <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                            Technical Guidance v1.2
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-3xl">
                        Verified cross-references between NIS2 Directive (Article 21), ENISA Technical Measures, and ISO/IEC 27001:2022 Controls.
                    </p>
                </div>
            </div>

            <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-200/50 overflow-hidden">
                <CardContent className="p-0">
                    <div className="bg-slate-900 p-8 text-white flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Framework Cross-Reference Table</h2>
                            <p className="text-slate-400 text-sm font-medium mt-1">
                                Maps directive requirements to implementation standards.
                            </p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                Validated
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50 border-none hover:bg-slate-50">
                                    <TableHead className="py-6 px-8 text-slate-900 font-black uppercase text-xs tracking-widest">NIS2 Article 21(2)</TableHead>
                                    <TableHead className="py-6 px-8 text-slate-900 font-black uppercase text-xs tracking-widest">ENISA Measure</TableHead>
                                    <TableHead className="py-6 px-8 text-slate-900 font-black uppercase text-xs tracking-widest">Measure Title</TableHead>
                                    <TableHead className="py-6 px-8 text-slate-900 font-black uppercase text-xs tracking-widest">ISO 27001:2022 Controls</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(10).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="px-8 py-4"><Skeleton className="h-4 w-20" /></TableCell>
                                            <TableCell className="px-8 py-4"><Skeleton className="h-4 w-12" /></TableCell>
                                            <TableCell className="px-8 py-4"><Skeleton className="h-4 w-48" /></TableCell>
                                            <TableCell className="px-8 py-4"><Skeleton className="h-4 w-32" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    mappings?.map((m) => (
                                        <TableRow key={m.id} className="border-slate-100 hover:bg-sky-50/30 transition-colors group">
                                            <TableCell className="px-8 py-6 font-bold text-slate-700">{m.nis2Article}</TableCell>
                                            <TableCell className="px-8 py-6">
                                                <Badge className="bg-slate-100 text-slate-700 border-none font-bold">
                                                    {m.enisaMeasureId}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{m.enisaMeasureTitle}</span>
                                                    <span className="text-slate-500 text-xs mt-1 font-medium italic">{m.description}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-8 py-6">
                                                <div className="flex flex-wrap gap-2">
                                                    {(m.iso27001ControlIds as string[]).map((ctrl, i) => (
                                                        <Badge
                                                            key={i}
                                                            variant="secondary"
                                                            className="bg-sky-100/50 text-sky-800 border-sky-200/50 font-black hover:bg-sky-200 transition-colors cursor-pointer"
                                                        >
                                                            {ctrl}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white ring-1 ring-slate-200/50 p-8">
                    <div className="flex gap-4 items-start">
                        <div className="h-12 w-12 bg-sky-50 rounded-xl flex items-center justify-center text-[#3ABEF9]">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">How to use this mapping</h3>
                            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                                This hub serves as a reference for your NIS2 compliance program. If you are already ISO 27001:2022 certified, ensuring the mapped controls are active satisfies the corresponding Article 21 requirements.
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-indigo-50 ring-1 ring-indigo-100 p-8 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-lg font-black text-indigo-900">Compliance Workbook</h3>
                        <p className="text-indigo-700/70 font-medium font-sm">
                            Access official Article 21 guidance and evidence blueprints.
                        </p>
                    </div>
                    <Button 
                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber/workbook`)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 h-12 rounded-xl transition-all shadow-lg shadow-indigo-200"
                    >
                        Open Workbook <Book className="w-4 h-4 ml-2" />
                    </Button>
                </Card>
            </div>
        </div>
    );
}
