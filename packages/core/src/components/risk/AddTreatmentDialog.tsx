import React, { useState } from 'react';
import { Button } from '@complianceos/ui/ui/button';
import { EnhancedDialog } from '@complianceos/ui/ui/enhanced-dialog';
import { Label } from '@complianceos/ui/ui/label';
import { Input } from '@complianceos/ui/ui/input';
import { Textarea } from '@complianceos/ui/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { trpc } from '@/lib/trpc';
import { Shield, Search, Check, AlertTriangle, CheckCircle, Ban } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddTreatmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    onSuccess: () => void;
}

const TREATMENT_TYPES = [
    { value: 'mitigate', label: 'Mitigate', icon: Shield, description: 'Reduce likelihood or impact with controls' },
    { value: 'transfer', label: 'Transfer', icon: AlertTriangle, description: 'Shift risk to a third party (e.g., insurance)' },
    { value: 'accept', label: 'Accept', icon: CheckCircle, description: 'Formally accept the residual risk' },
    { value: 'avoid', label: 'Avoid', icon: Ban, description: 'Eliminate the activity causing the risk' },
] as const;

export function AddTreatmentDialog({ open, onOpenChange, clientId, onSuccess }: AddTreatmentDialogProps) {
    const [loading, setLoading] = useState(false);
    const [riskSearch, setRiskSearch] = useState('');
    const [selectedRiskId, setSelectedRiskId] = useState<number | null>(null);
    const [treatmentType, setTreatmentType] = useState<string>('mitigate');
    const [strategy, setStrategy] = useState('');
    const [owner, setOwner] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState<string>('medium');
    const [estimatedCost, setEstimatedCost] = useState('');
    const [justification, setJustification] = useState('');

    const { data: risks, isLoading: isLoadingRisks } = trpc.risks.getRiskAssessments.useQuery(
        { clientId },
        { enabled: open }
    );

    const createTreatmentMutation = trpc.risks.createRiskTreatment.useMutation();

    React.useEffect(() => {
        if (open) {
            setSelectedRiskId(null);
            setTreatmentType('mitigate');
            setStrategy('');
            setOwner('');
            setDueDate('');
            setPriority('medium');
            setEstimatedCost('');
            setJustification('');
            setRiskSearch('');
        }
    }, [open]);

    const filteredRisks = risks?.filter(r =>
        r.title?.toLowerCase().includes(riskSearch.toLowerCase()) ||
        r.assessmentId?.toLowerCase().includes(riskSearch.toLowerCase())
    ).slice(0, 6);

    const selectedRisk = risks?.find(r => r.id === selectedRiskId);
    const canSubmit = selectedRiskId !== null && strategy.trim().length > 0 && !loading;

    const handleSubmit = async () => {
        if (!selectedRiskId || !strategy.trim()) return;

        setLoading(true);
        try {
            await createTreatmentMutation.mutateAsync({
                clientId,
                riskAssessmentId: selectedRiskId,
                treatmentType: treatmentType as 'mitigate' | 'transfer' | 'accept' | 'avoid',
                strategy: strategy.trim(),
                justification: justification.trim() || undefined,
                owner: owner.trim() || undefined,
                dueDate: dueDate || undefined,
                priority: priority as 'critical' | 'high' | 'medium' | 'low',
                estimatedCost: estimatedCost.trim() || undefined,
            });
            toast.success('Treatment added to the plan');
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            toast.error(`Failed to create treatment: ${error?.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <EnhancedDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Add Treatment"
            description="Create a treatment action plan and attach it to a risk from your register."
            size="md"
            footer={
                <>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit}>
                        {loading ? 'Creating...' : 'Add Treatment'}
                    </Button>
                </>
            }
        >
            <div className="space-y-5 py-4">

                {/* Risk Picker */}
                <div className="space-y-2">
                    <Label>Linked Risk <span className="text-red-500">*</span></Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search risks by title or ID..."
                            className="pl-9"
                            value={riskSearch}
                            onChange={e => setRiskSearch(e.target.value)}
                        />
                    </div>
                    <div className="border rounded-md divide-y max-h-[180px] overflow-y-auto bg-gray-50">
                        {isLoadingRisks && (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading risks...</div>
                        )}
                        {!isLoadingRisks && filteredRisks?.length === 0 && (
                            <div className="p-4 text-center text-gray-500 text-sm">
                                No risks found. Create one first in the Risk Register.
                            </div>
                        )}
                        {filteredRisks?.map(risk => {
                            const isSelected = selectedRiskId === risk.id;
                            return (
                                <div
                                    key={risk.id}
                                    onClick={() => setSelectedRiskId(risk.id)}
                                    className={cn(
                                        'p-3 cursor-pointer flex items-start gap-3 hover:bg-blue-50 transition-colors',
                                        isSelected && 'bg-blue-50 border-l-4 border-blue-500'
                                    )}
                                >
                                    <div className={cn(
                                        'p-1.5 rounded bg-white border shrink-0',
                                        isSelected ? 'border-blue-200 text-blue-600' : 'border-gray-200 text-gray-500'
                                    )}>
                                        <Shield className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">{risk.title}</div>
                                        <div className="text-xs text-gray-500">
                                            {risk.assessmentId} · Inherent: {risk.inherentRisk ?? '-'} · Residual: {risk.residualRisk ?? '-'}
                                        </div>
                                    </div>
                                    {isSelected && <Check className="w-4 h-4 text-blue-600 ml-auto mt-1 shrink-0" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Treatment Type */}
                <div className="space-y-2">
                    <Label>Treatment Type</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {TREATMENT_TYPES.map(type => {
                            const isActive = treatmentType === type.value;
                            return (
                                <button
                                    key={type.value}
                                    type="button"
                                    onClick={() => setTreatmentType(type.value)}
                                    className={cn(
                                        'flex items-start gap-2.5 p-3 rounded-lg border text-left transition-colors',
                                        isActive
                                            ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300'
                                            : 'border-gray-200 bg-white hover:bg-gray-50'
                                    )}
                                >
                                    <type.icon className={cn('w-4 h-4 mt-0.5 shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
                                    <div>
                                        <div className={cn('text-sm font-medium', isActive ? 'text-blue-900' : 'text-gray-900')}>{type.label}</div>
                                        <div className="text-xs text-gray-500 leading-snug">{type.description}</div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Strategy */}
                <div className="space-y-2">
                    <Label>Strategy / Action Plan <span className="text-red-500">*</span></Label>
                    <Textarea
                        placeholder="Describe the actions required to treat this risk (e.g., 'Implement MFA across all remote access points')..."
                        value={strategy}
                        onChange={e => setStrategy(e.target.value)}
                    />
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Owner</Label>
                        <Input
                            placeholder="Person responsible"
                            value={owner}
                            onChange={e => setOwner(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Due Date</Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                            <SelectTrigger>
                                <SelectValue placeholder="Priority" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="critical">Critical</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Estimated Cost</Label>
                        <Input
                            placeholder="e.g., 5000"
                            value={estimatedCost}
                            onChange={e => setEstimatedCost(e.target.value)}
                        />
                    </div>
                </div>

                {/* Justification */}
                <div className="space-y-2">
                    <Label>Justification / Implementation Notes</Label>
                    <Textarea
                        placeholder="Explain why this treatment was chosen and how it modifies the risk..."
                        value={justification}
                        onChange={e => setJustification(e.target.value)}
                    />
                </div>

                {selectedRisk && (
                    <p className="text-xs text-gray-500">
                        This treatment will appear on the plan and link back to risk{' '}
                        <span className="font-medium text-gray-700">{selectedRisk.assessmentId} — {selectedRisk.title}</span>.
                    </p>
                )}
            </div>
        </EnhancedDialog>
    );
}
