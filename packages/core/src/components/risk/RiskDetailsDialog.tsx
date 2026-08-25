
import React from 'react';
import { trpc } from '@/lib/trpc';
import { Shield, LifeBuoy, PhoneCall, AlertTriangle } from 'lucide-react';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Slot, SlotNames } from '@/registry';
import { Wand2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface RiskDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    risk: any;
    clientId: number;
    assets?: any[];
}

// Risk level color mapping
const riskColors: Record<string, string> = {
    'Very High': 'bg-red-600 text-white',
    'High': 'bg-orange-500 text-white',
    'Medium': 'bg-yellow-400 text-black',
    'Low': 'bg-green-400 text-black',
    'Very Low': 'bg-green-200 text-black',
    'Critical': 'bg-red-700 text-white',
    'Moderate': 'bg-yellow-400 text-black',
    'Minor': 'bg-green-400 text-black',
    'Insignificant': 'bg-green-200 text-black',
};

export function RiskDetailsDialog({ open, onOpenChange, risk, clientId, assets }: RiskDetailsDialogProps) {
    // Fetch treatments for the selected risk
    const { data: treatments } = trpc.risks.getRiskTreatments.useQuery(
        { riskAssessmentId: risk?.id },
        { enabled: !!risk?.id && open }
    );

    const reportIncidentMutation = trpc.cyber.reportIncident.useMutation({
        onSuccess: (res) => {
            toast.success("Incident Declared & Mobilized!", {
                description: `Created active incident #${res.incidentId} from risk scenario.`,
                action: {
                    label: "Open Incident",
                    onClick: () => {
                        window.location.href = `/clients/${clientId}/cyber/incidents/${res.incidentId}`;
                    }
                }
            });
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error("Failed to declare incident", { description: err.message });
        }
    });

    const handleDeclareIncident = () => {
        const sev = (risk.inherentRisk === 'Very High' || risk.inherentRisk === 'Critical' || ((risk.likelihood || 0) * (risk.impact || 0) >= 16)) ? 'critical' : (risk.inherentRisk === 'High' || ((risk.likelihood || 0) * (risk.impact || 0) >= 10)) ? 'high' : 'medium';
        reportIncidentMutation.mutate({
            clientId,
            title: `[Escalation] ${risk.title || 'Risk Scenario ' + (risk.assessmentId || '')}`,
            detectedAt: new Date().toISOString(),
            severity: sev as "low" | "medium" | "high" | "critical",
            cause: risk.threatDescription || "Threat materialized from Risk Register",
            description: `Materialized risk scenario: ${risk.threatDescription || ''}. Vulnerability: ${risk.vulnerabilityDescription || ''}. Assessment ID: ${risk.assessmentId || 'N/A'}.`,
            crossBorderImpact: false,
            affectedAssets: Array.isArray(risk.affectedAssets) ? risk.affectedAssets.join(', ') : (typeof risk.affectedAssets === 'string' ? risk.affectedAssets : '')
        });
    };

    const utils = trpc.useUtils();
    const createTreatmentMutation = trpc.risks.createRiskTreatment.useMutation({
        onSuccess: () => {
            toast.success("Mitigation Control Attached", {
                description: "Control successfully bound to risk treatment plan."
            });
            utils.risks.getRiskTreatments.invalidate({ riskAssessmentId: risk?.id });
        },
        onError: (err: any) => toast.error("Failed to attach control: " + err.message)
    });

    const parseAffectedAssets = (assets: any): string[] => {
        if (typeof assets === 'string') {
            try {
                return JSON.parse(assets);
            } catch {
                return [assets];
            }
        }
        return assets || [];
    };

    if (!risk) return null;

    return (
        <EnhancedDialog
            open={open}
            onOpenChange={onOpenChange}
            title={
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Risk Details: {risk.assessmentId}
                </div>
            }
            description="Comprehensive view of identified risk, analysis, and treatment plan."
            size="xl"
            className="max-h-[85vh]"
            footer={
                <div className="flex flex-wrap items-center justify-between gap-2 w-full">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                onOpenChange(false);
                                window.location.href = `/clients/${clientId}/business-continuity/bia`;
                            }}
                            className="gap-1.5 text-xs text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-emerald-300 font-semibold"
                        >
                            <LifeBuoy className="w-3.5 h-3.5 text-emerald-600" />
                            Link / Create BIA Scenario
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleDeclareIncident}
                            disabled={reportIncidentMutation.isPending}
                            className="gap-1.5 text-xs text-rose-800 bg-rose-50 hover:bg-rose-100 border-rose-300 font-semibold"
                        >
                            <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                            {reportIncidentMutation.isPending ? "Declaring..." : "🚨 Declare Cyber Incident"}
                        </Button>
                    </div>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close Details</Button>
                </div>
            }
        >
            <div className="space-y-6">
                {/* Risk Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase">Inherent Risk</p>
                        <p className={`text-lg font-bold mt-1 px-2 py-1 rounded inline-block ${riskColors[risk.inherentRisk || ''] || 'bg-gray-100'}`}>
                            {risk.inherentRisk || '-'}
                        </p>
                    </div>
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase">Residual Risk</p>
                        <p className={`text-lg font-bold mt-1 px-2 py-1 rounded inline-block ${riskColors[risk.residualRisk || ''] || 'bg-gray-100'}`}>
                            {risk.residualRisk || '-'}
                        </p>
                    </div>
                    {/* 
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase">Priority</p>
                        <p className="text-lg font-bold mt-1">{risk.priority || '-'}</p>
                    </div> 
                    */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase">Status</p>
                        <p className="text-lg font-bold mt-1 capitalize">{risk.status || '-'}</p>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="font-semibold mb-2">Threat Description</h4>
                        <p className="text-muted-foreground">{risk.threatDescription || 'Not specified'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Vulnerability</h4>
                        <p className="text-muted-foreground">{risk.vulnerabilityDescription || 'Not specified'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Affected Assets</h4>
                        <div className="flex flex-wrap gap-1">
                            {(() => {
                                // Try to find the asset ID
                                const assetId = risk.contextSnapshot?.assetId || risk.assetId;
                                if (assetId && assets) {
                                    const asset = assets.find((a: any) => a.id === Number(assetId));
                                    if (asset) {
                                        return <Badge variant="secondary">{asset.name}</Badge>;
                                    }
                                }

                                // Fallback
                                return parseAffectedAssets(risk.affectedAssets).map((asset, i) => (
                                    <Badge key={i} variant="outline">{asset}</Badge>
                                ));
                            })()}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Risk Owner</h4>
                        <p className="text-muted-foreground">{risk.riskOwner || 'Not assigned'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Existing Controls</h4>
                        <p className="text-muted-foreground">{risk.existingControls || 'None documented'}</p>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Control Effectiveness</h4>
                        <p className="text-muted-foreground capitalize">{risk.controlEffectiveness || 'Not evaluated'}</p>
                    </div>
                    <div className="md:col-span-2">
                        <h4 className="font-semibold mb-2">Treatment Option & Recommended Actions</h4>
                        <p className="text-muted-foreground">
                            <strong className="capitalize">{risk.treatmentOption || 'Not decided'}:</strong> {risk.recommendedActions || 'No actions specified'}
                        </p>
                    </div>
                </div>

                {/* Active Treatments */}
                {treatments && treatments.length > 0 && (
                    <div>
                        <h4 className="font-semibold mb-3">Active Treatments ({treatments.length})</h4>
                        <div className="space-y-2">
                            {treatments.map((treatment: any) => (
                                <div key={treatment.id} className="border rounded-lg p-4 bg-muted/20">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${treatment.treatmentType === 'mitigate' ? 'bg-blue-100 text-blue-800' :
                                            treatment.treatmentType === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                                treatment.treatmentType === 'accept' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {treatment.treatmentType}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${treatment.status === 'implemented' ? 'bg-green-100 text-green-800' :
                                            treatment.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                            {treatment.status?.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm">{treatment.strategy}</p>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                        {treatment.owner && <span>Owner: {treatment.owner}</span>}
                                        {treatment.dueDate && <span>Due: {new Date(treatment.dueDate).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* AI Insight Slots */}
                <div className="space-y-4 pt-4 border-t border-dashed">
                    <h4 className="font-semibold flex items-center gap-2 text-purple-700">
                        <Wand2 className="w-4 h-4" />
                        AI Power Tools
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        <Slot
                            name={SlotNames.RISK_AUTO_TRIAGE}
                            props={{
                                clientId,
                                threatDescription: risk.threatDescription || '',
                                vulnerabilityDescription: risk.vulnerabilityDescription || '',
                                affectedAssets: parseAffectedAssets(risk.affectedAssets),
                                onAnalysisComplete: (data: any) => {
                                    // In a real app, we might want to refresh or update the UI
                                    console.log('AI Analysis complete:', data);
                                }
                            }}
                        />
                        <Slot
                            name={SlotNames.RISK_CONTROL_SUGGESTION}
                            props={{
                                clientId,
                                threat: risk.threatDescription || '',
                                vulnerability: risk.vulnerabilityDescription || '',
                                selectedControlIds: [], // We'd need to fetch these or pass from risk
                                onAddControl: (id: number) => {
                                    createTreatmentMutation.mutate({
                                        clientId,
                                        riskAssessmentId: risk.id,
                                        treatmentType: 'mitigate',
                                        strategy: `Implement mapped security control #${id}`,
                                        priority: 'high',
                                        justification: 'AI-recommended control to mitigate active threat and vulnerability.'
                                    });
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div>
                        <p className="text-xs text-muted-foreground">Date Identified</p>
                        <p className="font-medium">
                            {risk.createdAt ? new Date(risk.createdAt).toLocaleDateString() : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Last Review</p>
                        <p className="font-medium">
                            {risk.assessmentDate ? new Date(risk.assessmentDate).toLocaleDateString() : '-'}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Next Review</p>
                        <p className="font-medium">
                            {risk.nextReviewDate ? new Date(risk.nextReviewDate).toLocaleDateString() : 'Not scheduled'}
                        </p>
                    </div>
                </div>

                {/* Notes */}
                {risk.notes && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold mb-2">Notes</h4>
                        <p className="text-muted-foreground">{risk.notes}</p>
                    </div>
                )}
            </div>
        </EnhancedDialog>
    );
}
