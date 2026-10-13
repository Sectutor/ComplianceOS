import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import ImplementationKanban from './ImplementationKanban';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';

export default function ImplementationKanbanPage() {
    const params = useParams();
    const clientIdParam = params.id ? parseInt(params.id, 10) : null;
    const { selectedClientId } = useClientContext();
    const clientId = clientIdParam || selectedClientId;

    const planId = params.planId ? parseInt(params.planId, 10) : 0;

    return (
        <DashboardLayout fullWidth={true}>
            <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                <ImplementationKanban clientId={clientId!} planId={planId} />
            </div>
        </DashboardLayout>
    );
}
