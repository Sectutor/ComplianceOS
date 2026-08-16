/**
 * Management Liability Tracker
 * 
 * Tracks board member and management compliance activities as required by NIS2.
 * Article 20 requires management to oversee cybersecurity and be held accountable
 * for compliance failures.
 * 
 * Features:
 * - Track management training completion
 * - Document compliance sign-offs
 * - Record oversight activities
 * - Personal compliance dashboards
 */

import React, { useState } from "react";
import {
    Users,
    Shield,
    CheckCircle2,
    AlertCircle,
    Clock,
    FileText,
    TrendingUp,
    UserCheck,
    AlertTriangle,
    Calendar,
    Eye,
    Edit3,
    Send
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";

// NIS2 Management Liability Requirements
const MANAGEMENT_REQUIREMENTS = [
    {
        id: "training",
        title: "Cybersecurity Training",
        description: "Management must complete cybersecurity awareness training",
        frequency: "Annual",
        evidence: "Training completion certificate"
    },
    {
        id: "oversight",
        title: "Board Oversight",
        description: "Regular reporting to board/management on cybersecurity posture",
        frequency: "Quarterly",
        evidence: "Board meeting minutes, reports"
    },
    {
        id: "approval",
        title: "Policy Approval",
        description: "Management approval of information security policies",
        frequency: "Annual",
        evidence: "Signed policy documents"
    },
    {
        id: "risk_approval",
        title: "Risk Acceptance",
        description: "Management acceptance of residual security risks",
        frequency: "As needed",
        evidence: "Risk acceptance forms"
    },
    {
        id: "incident_oversight",
        title: "Incident Oversight",
        description: "Management involvement in significant incident response",
        frequency: "Per incident",
        evidence: "Incident response records"
    },
    {
        id: "budget_approval",
        title: "Security Budget",
        description: "Management approval of cybersecurity budget and resources",
        frequency: "Annual",
        evidence: "Budget documents"
    }
];

interface ManagementMember {
    id: number;
    name: string;
    role: string;
    email: string;
    trainingCompleted: boolean;
    trainingDate?: Date;
    lastOversightDate?: Date;
    signOffs: number;
    pendingActions: number;
}

interface ManagementLiabilityTrackerProps {
    clientId?: number;
}

export function ManagementLiabilityTracker({ clientId }: ManagementLiabilityTrackerProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;

    // Query for employees/management
    const { data: employeesData, isLoading } = trpc.employees.list.useQuery(
        { clientId: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    // Get training data
    const { data: trainingData } = trpc.training.getCompletion.useQuery(
        { clientId: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    // Calculate metrics
    const totalRequirements = MANAGEMENT_REQUIREMENTS.length;
    const completedRequirements = 3; // Placeholder - would come from data
    const complianceRate = Math.round((completedRequirements / totalRequirements) * 100);

    // Sample management data (in production, this would come from queries)
    const managementMembers: ManagementMember[] = [
        {
            id: 1,
            name: "John Smith",
            role: "CEO",
            email: "john.smith@company.com",
            trainingCompleted: true,
            trainingDate: new Date("2025-01-15"),
            lastOversightDate: new Date("2025-03-01"),
            signOffs: 8,
            pendingActions: 1
        },
        {
            id: 2,
            name: "Sarah Johnson",
            role: "CISO",
            email: "sarah.j@company.com",
            trainingCompleted: true,
            trainingDate: new Date("2025-01-10"),
            lastOversightDate: new Date("2025-03-10"),
            signOffs: 12,
            pendingActions: 0
        },
        {
            id: 3,
            name: "Michael Brown",
            role: "CTO",
            email: "michael.b@company.com",
            trainingCompleted: false,
            signOffs: 5,
            pendingActions: 2
        },
        {
            id: 4,
            name: "Emily Davis",
            role: "CFO",
            email: "emily.d@company.com",
            trainingCompleted: true,
            trainingDate: new Date("2025-02-01"),
            lastOversightDate: new Date("2025-03-05"),
            signOffs: 6,
            pendingActions: 0
        }
    ];

    const getStatusColor = (completed: boolean) => {
        return completed
            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
            : "bg-amber-100 text-amber-700 border-amber-200";
    };

    const handleSendReminder = (memberId: number) => {
        toast.success(`Reminder sent to management member ${memberId}`);
    };

    if (!effectiveClientId) {
        return null;
    }

    return (
        <Card className="border-slate-200/60 shadow-lg shadow-slate-100/50">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-200">
                            <Users className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                                Management Liability Tracker
                            </CardTitle>
                            <CardDescription className="text-sm">
                                NIS2 Article 20 - Management oversight accountability
                            </CardDescription>
                        </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                        {complianceRate}% Compliant
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* NIS2 Article 20 Alert */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-800">Management Accountability</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                Under NIS2 Article 20, management bodies must approve and oversee the implementation
                                of cybersecurity measures. They can be held personally liable for compliance failures.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-slate-900">{managementMembers.length}</div>
                        <div className="text-xs text-slate-500 font-medium">Management Members</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-emerald-600">
                            {managementMembers.filter(m => m.trainingCompleted).length}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Training Completed</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-amber-600">
                            {managementMembers.reduce((acc, m) => acc + m.pendingActions, 0)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Pending Actions</div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                        <div className="text-2xl font-black text-blue-600">
                            {managementMembers.reduce((acc, m) => acc + m.signOffs, 0)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">Total Sign-offs</div>
                    </div>
                </div>

                {/* Requirements Overview */}
                <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Management Requirements</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {MANAGEMENT_REQUIREMENTS.map((req) => (
                            <div
                                key={req.id}
                                className="bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h5 className="font-semibold text-sm text-slate-900">{req.title}</h5>
                                        <p className="text-xs text-slate-500 mt-1">{req.description}</p>
                                    </div>
                                    <Badge variant="outline" className="text-xs ml-2">
                                        {req.frequency}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Management Members Table */}
                <div>
                    <h4 className="font-semibold text-slate-900 mb-3">Management Team</h4>
                    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-brand hover:bg-brand">
                                    <TableHead className="text-white font-semibold">Name</TableHead>
                                    <TableHead className="text-white font-semibold">Role</TableHead>
                                    <TableHead className="text-white font-semibold">Training</TableHead>
                                    <TableHead className="text-white font-semibold">Last Oversight</TableHead>
                                    <TableHead className="text-white font-semibold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {managementMembers.map((member) => (
                                    <TableRow key={member.id} className="bg-sky-50 border-b border-sky-100 transition-all hover:bg-sky-100 hover:shadow-sm cursor-pointer group">
                                        <TableCell className="font-medium">
                                            <div>
                                                <div className="text-slate-900">{member.name}</div>
                                                <div className="text-xs text-slate-500">{member.email}</div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{member.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {member.trainingCompleted ? (
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                    <span className="text-sm text-emerald-600">
                                                        {member.trainingDate?.toLocaleDateString()}
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-amber-500" />
                                                    <span className="text-sm text-amber-600">Pending</span>
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {member.lastOversightDate ? (
                                                <span className="text-sm text-slate-600">
                                                    {member.lastOversightDate.toLocaleDateString()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-slate-400">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {member.pendingActions > 0 && (
                                                    <Badge className="bg-amber-100 text-amber-700">
                                                        {member.pendingActions} pending
                                                    </Badge>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleSendReminder(member.id)}
                                                >
                                                    <Send className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3">
                    <Button variant="outline" className="gap-2">
                        <UserCheck className="h-4 w-4" />
                        Send Training Reminders
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Generate Oversight Report
                    </Button>
                    <Button variant="outline" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule Board Review
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default ManagementLiabilityTracker;
