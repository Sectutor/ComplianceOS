
import React, { useState } from 'react';
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Shield,
    ArrowLeft,
    Info,
    Book,
    CheckCircle2,
    Clock,
    ChevronDown,
    ChevronRight,
    Link2,
    ExternalLink,
    Layers
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Skeleton } from "@complianceos/ui/ui/skeleton";

// Framework options with target framework names
const FRAMEWORKS = [
    { id: 'NIS2', name: 'ISO 27001', targetName: 'ISO 27001:2022', color: 'sky' },
    { id: 'NIST_CSF', name: 'NIST CSF', targetName: 'NIST CSF', color: 'blue' },
    { id: 'SOC2', name: 'SOC 2', targetName: 'SOC 2', color: 'indigo' },
    { id: 'PCI_DSS', name: 'PCI-DSS', targetName: 'PCI-DSS', color: 'rose' },
];

export default function NIS2MappingHub() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    const [selectedFramework, setSelectedFramework] = useState('NIS2');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [expandedControls, setExpandedControls] = useState<Set<number>>(new Set());

    const { data: mappings, isLoading } = trpc.cyber.getMappings.useQuery({
        clientId: selectedClientId || 0,
        framework: selectedFramework
    }, {
        enabled: !!selectedClientId
    });

    const toggleRow = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const toggleControls = (id: number) => {
        const newExpanded = new Set(expandedControls);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedControls(newExpanded);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'implemented':
                return (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Implemented
                    </Badge>
                );
            case 'in_progress':
                return (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold">
                        <Clock className="w-3 h-3 mr-1" />
                        In Progress
                    </Badge>
                );
            case 'not_applicable':
                return (
                    <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200 font-bold">
                        N/A
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="border-slate-300 text-slate-500 font-bold">
                        Not Started
                    </Badge>
                );
        }
    };

    const getTargetFrameworkName = (frameworkId: string) => {
        const fw = FRAMEWORKS.find(f => f.id === frameworkId);
        return fw?.targetName || 'ISO 27001:2022';
    };

    // Calculate summary stats
    const stats = mappings ? {
        total: mappings.length,
        implemented: mappings.filter((m: any) => m.clientStatus === 'implemented').length,
        inProgress: mappings.filter((m: any) => m.clientStatus === 'in_progress').length,
    } : null;

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
                        Compliance Mapping Hub
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-3xl">
                        Cross-reference NIS2 Directive requirements with your ISO 27001, NIST CSF, PCI-DSS and SOC 2 controls and track implementation status.
                    </p>
                </div>
            </div>

            {/* Framework Selector */}
            <div className="flex flex-wrap gap-3">
                {FRAMEWORKS.map((fw) => (
                    <button
                        key={fw.id}
                        onClick={() => {
                            setSelectedFramework(fw.id);
                            setExpandedRows(new Set());
                        }}
                        className={`px-6 py-3 rounded-xl font-bold transition-all ${selectedFramework === fw.id
                            ? 'bg-sky-600 text-white shadow-lg shadow-sky-200'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                            }`}
                    >
                        <Layers className="w-4 h-4 inline mr-2" />
                        {fw.name}
                    </button>
                ))}
            </div>

            {/* Summary Stats */}
            {stats && stats.total > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-2xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-sky-50 rounded-xl flex items-center justify-center">
                                <Shield className="w-6 h-6 text-sky-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Total Mappings</p>
                                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-2xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Implemented</p>
                                <p className="text-2xl font-black text-emerald-600">{stats.implemented}</p>
                            </div>
                        </div>
                    </Card>
                    <Card className="border-none shadow-lg shadow-slate-200/50 rounded-2xl bg-white p-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">In Progress</p>
                                <p className="text-2xl font-black text-amber-600">{stats.inProgress}</p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Progress Bar */}
            {stats && stats.total > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-200/50">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-slate-700">Overall Progress</span>
                        <span className="font-black text-slate-900">{Math.round((stats.implemented / stats.total) * 100)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                            style={{ width: `${(stats.implemented / stats.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Mapping Cards */}
            <div className="space-y-4">
                {isLoading ? (
                    Array(5).fill(0).map((_, i) => (
                        <Card key={i} className="border-none shadow-lg shadow-slate-200/50 rounded-2xl">
                            <CardContent className="p-6">
                                <Skeleton className="h-6 w-32 mb-4" />
                                <Skeleton className="h-4 w-full" />
                            </CardContent>
                        </Card>
                    ))
                ) : mappings?.length === 0 ? (
                    <Card className="border-none shadow-lg rounded-2xl bg-slate-50 p-12 text-center">
                        <Shield className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-slate-700 mb-2">No Mappings Found</h3>
                        <p className="text-slate-500 font-medium">
                            No mappings available for {FRAMEWORKS.find(f => f.id === selectedFramework)?.name}.
                            This feature is coming soon.
                        </p>
                    </Card>
                ) : (
                    mappings?.map((m: any) => {
                        const isExpanded = expandedRows.has(m.id);
                        return (
                            <Card
                                key={m.id}
                                className={`border-none shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-sky-400' : ''
                                    }`}
                            >
                                {/* Main Row - Always Visible */}
                                <div
                                    className={`p-6 cursor-pointer transition-colors ${m.clientStatus === 'implemented' ? 'bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}
                                    onClick={() => toggleRow(m.id)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {/* Expand/Collapse Icon */}
                                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${m.clientStatus === 'implemented' ? 'bg-emerald-100' :
                                                m.clientStatus === 'in_progress' ? 'bg-amber-100' : 'bg-slate-100'
                                                }`}>
                                                {isExpanded ? (
                                                    <ChevronDown className={`w-5 h-5 ${m.clientStatus === 'implemented' ? 'text-emerald-600' :
                                                        m.clientStatus === 'in_progress' ? 'text-amber-600' : 'text-slate-600'
                                                        }`} />
                                                ) : (
                                                    <ChevronRight className={`w-5 h-5 ${m.clientStatus === 'implemented' ? 'text-emerald-600' :
                                                        m.clientStatus === 'in_progress' ? 'text-amber-600' : 'text-slate-600'
                                                        }`} />
                                                )}
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <span className="font-black text-lg text-slate-900">{m.nis2Article}</span>
                                                    <Badge className="bg-slate-100 text-slate-700 border-none font-bold">
                                                        {m.enisaMeasureId}
                                                    </Badge>
                                                </div>
                                                <p className="text-slate-500 font-medium">{m.enisaMeasureTitle}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            {/* Target Controls */}
                                            <div className="hidden md:flex items-center gap-2">
                                                {(m.mappedControlIds || []).slice(0, 3).map((ctrl: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="bg-sky-100/50 text-sky-800 border-sky-200/50 text-[10px] font-black">
                                                        {ctrl}
                                                    </Badge>
                                                ))}
                                                {(m.mappedControlIds || []).length > 3 && (
                                                    <span className="text-xs font-bold text-slate-400">
                                                        +{(m.mappedControlIds || []).length - 3}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Status */}
                                            {getStatusBadge(m.clientStatus)}
                                        </div>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-6 animate-in slide-in-from-top-2 duration-200">
                                        <div className="grid md:grid-cols-3 gap-6">
                                            {/* Column 1: Requirements */}
                                            <div className="space-y-4">
                                                <h4 className="font-black text-slate-900 flex items-center gap-2">
                                                    <Info className="w-4 h-4 text-sky-600" />
                                                    Requirement Details
                                                </h4>
                                                <div className="bg-white rounded-xl p-4 border border-slate-200">
                                                    <p className="text-sm text-slate-600 font-medium whitespace-pre-wrap">
                                                        {m.description || 'No description available for this requirement.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Column 2: Implementation Status */}
                                            <div className="space-y-4">
                                                <h4 className="font-black text-slate-900 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    Implementation Status
                                                </h4>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
                                                        <span className="font-bold text-slate-700">Assessment Status</span>
                                                        {getStatusBadge(m.clientStatus)}
                                                    </div>
                                                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                                        <div
                                                            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                                                            onClick={() => toggleControls(m.id)}
                                                        >
                                                            <span className="font-bold text-slate-700 flex items-center gap-2">
                                                                Mapped Controls ({getTargetFrameworkName(selectedFramework)})
                                                                {expandedControls.has(m.id) ? (
                                                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                                                ) : (
                                                                    <ChevronRight className="w-4 h-4 text-slate-400" />
                                                                )}
                                                            </span>
                                                            <span className="font-black text-slate-900">
                                                                {m.implementedCount || 0} / {(m.mappedControlIds || []).length}
                                                            </span>
                                                        </div>
                                                        {expandedControls.has(m.id) && (
                                                            <div className="p-2 border-t border-slate-100 bg-slate-50/50 space-y-1">
                                                                {(m.mappedControlsData || m.mappedControlIds?.map((id: string) => ({ id, name: '', description: '', status: '' })) || []).map((ctrl: any, i: number) => (
                                                                    <button
                                                                        key={i}
                                                                        onClick={() => setLocation(`/clients/${selectedClientId}/controls?framework=${selectedFramework}&from=nis2-mapping&openCode=${ctrl.id}`)}
                                                                        onDoubleClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setLocation(`/clients/${selectedClientId}/controls?openCode=${ctrl.id}`);
                                                                        }}
                                                                        className={`w-full text-left px-3 py-2 text-sm font-bold rounded-lg transition-all flex justify-between items-center group ${ctrl.status === 'implemented' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:ring-1 hover:ring-emerald-200' : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50 hover:ring-1 hover:ring-sky-200'}`}
                                                                    >
                                                                        <div className="flex flex-col gap-1 pr-4">
                                                                            <span className="font-bold">
                                                                                {ctrl.id}
                                                                                {ctrl.name && ` - ${ctrl.name.startsWith(ctrl.id) ? ctrl.name.replace(ctrl.id, '').replace(/^[\s\-_:]+/, '') : ctrl.name}`}
                                                                            </span>
                                                                            {ctrl.description && <span className="text-xs font-normal text-slate-500 line-clamp-2">{ctrl.description}</span>}
                                                                            {!ctrl.name && !ctrl.description && <span className="text-xs font-normal text-slate-400 italic">No additional details available</span>}
                                                                        </div>
                                                                        <ExternalLink className="w-4 h-4 flex-shrink-0 text-transparent group-hover:text-sky-500 transition-colors" />
                                                                    </button>
                                                                ))}
                                                                {(m.mappedControlIds || []).length === 0 && (
                                                                    <p className="text-xs font-medium text-slate-500 italic p-2 text-center">No controls mapped.</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Column 3: Actions */}
                                            <div className="space-y-4">
                                                <h4 className="font-black text-slate-900 flex items-center gap-2">
                                                    <Link2 className="w-4 h-4 text-sky-600" />
                                                    Quick Actions
                                                </h4>
                                                <div className="space-y-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setLocation(`/clients/${selectedClientId}/controls?framework=${selectedFramework}&from=nis2-mapping`)}
                                                        className="w-full justify-between border-slate-200 text-slate-700 font-bold"
                                                    >
                                                        Manage Controls
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber/workbook`)}
                                                        className="w-full justify-between border-slate-200 text-slate-700 font-bold"
                                                    >
                                                        View Workbook
                                                        <Book className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Info Cards */}
            <div className="grid md:grid-cols-2 gap-8">
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white ring-1 ring-slate-200/50 p-8">
                    <div className="flex gap-4 items-start">
                        <div className="h-12 w-12 bg-sky-50 rounded-xl flex items-center justify-center text-brand-bright">
                            <Info className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-slate-900">How to use this mapping</h3>
                            <p className="text-slate-500 font-medium mt-2 leading-relaxed">
                                Select a framework above to see how its requirements map to {getTargetFrameworkName(selectedFramework)} controls.
                                Click on any row to see detailed implementation status and manage your controls.
                            </p>
                        </div>
                    </div>
                </Card>
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-indigo-50 ring-1 ring-indigo-100 p-8 flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-lg font-black text-indigo-900">NIS2 Workbook</h3>
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

