import React, { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Plus, MoreHorizontal, DollarSign } from 'lucide-react';
import { ScrollArea } from '@complianceos/ui/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SalesKanbanProps {
    clientId?: number;
}

// Hardcoded columns for MVP - normally fetched from DB
const COLUMNS = [
    { id: 1, title: 'New', color: 'bg-slate-500/10 border-slate-500/20' },
    { id: 2, title: 'Qualified', color: 'bg-blue-500/10 border-blue-500/20' },
    { id: 3, title: 'Proposal', color: 'bg-orange-500/10 border-orange-500/20' },
    { id: 4, title: 'Negotiation', color: 'bg-purple-500/10 border-purple-500/20' },
    { id: 5, title: 'Won', color: 'bg-green-500/10 border-green-500/20' },
    { id: 6, title: 'Lost', color: 'bg-red-500/10 border-red-500/20' },
];

export function SalesKanban({ clientId }: SalesKanbanProps) {
    // @ts-ignore - trpc types might not be regenerated yet
    const { data: deals, isLoading, refetch } = trpc.sales.getDeals.useQuery({});
    // @ts-ignore
    const updateStageMutation = trpc.sales.updateDealStage.useMutation();

    const [draggedDealId, setDraggedDealId] = useState<number | null>(null);
    const [activeColumn, setActiveColumn] = useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, dealId: number) => {
        e.dataTransfer.setData('dealId', dealId.toString());
        setDraggedDealId(dealId);
    };

    const handleDragOver = (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        if (activeColumn !== stageId) setActiveColumn(stageId);
    };

    const handleDrop = async (e: React.DragEvent, stageId: number) => {
        e.preventDefault();
        setActiveColumn(null);
        const dealId = parseInt(e.dataTransfer.getData('dealId'));
        if (dealId) {
            try {
                await updateStageMutation.mutateAsync({ dealId, stageId });
                toast.success("Deal moved!");
                refetch();
            } catch (e) {
                toast.error("Failed to move deal");
            }
        }
        setDraggedDealId(null);
    };

    const dealsByStage = useMemo(() => {
        const acc: Record<number, any[]> = {};
        deals?.forEach((deal: any) => {
            const stage = deal.stageId;
            if (!acc[stage]) acc[stage] = [];
            acc[stage].push(deal);
        });
        return acc;
    }, [deals]);

    if (isLoading) return <div>Loading pipeline...</div>;

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex-1 overflow-x-auto min-h-[500px]">
                <div className="flex gap-4 h-full min-w-[1000px]">
                    {COLUMNS.map(column => (
                        <div
                            key={column.id}
                            className={cn(
                                "flex-1 flex flex-col rounded-lg border p-3 min-w-[280px] transition-colors duration-200",
                                column.color,
                                activeColumn === column.id ? "bg-slate-100 ring-2 ring-primary/20" : "bg-slate-50/50"
                            )}
                            onDragOver={(e) => handleDragOver(e, column.id)}
                            onDrop={(e) => handleDrop(e, column.id)}
                        >
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h3 className="font-medium text-sm text-slate-700">{column.title}</h3>
                                <Badge variant="secondary" className="text-xs">
                                    {dealsByStage[column.id]?.length || 0}
                                </Badge>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="space-y-3 pr-2 pb-2">
                                    {dealsByStage[column.id]?.map((deal: any) => (
                                        <Card
                                            key={deal.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, deal.id)}
                                            className="cursor-grab active:cursor-grabbing hover:shadow-md"
                                        >
                                            <CardContent className="p-3 space-y-2">
                                                <div className="font-medium text-sm">{deal.title}</div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <div className="flex items-center gap-1">
                                                        <DollarSign className="w-3 h-3" />
                                                        {deal.value?.toLocaleString()}
                                                    </div>
                                                    {deal.expectedCloseDate && (
                                                        <div>{format(new Date(deal.expectedCloseDate), 'MMM d')}</div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {(!dealsByStage[column.id] || dealsByStage[column.id].length === 0) && (
                                        <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                                            Drop deals here
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
