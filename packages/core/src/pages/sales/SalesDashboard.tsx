import React from 'react';
import { SalesKanban } from '@/components/modules/crm/SalesKanban';
import { CreateDealDialog } from '@/components/modules/crm/CreateDealDialog';
import { Button } from '@complianceos/ui/ui/button';
import { Plus, Users } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

export default function SalesDashboard() {
    return (
        <DashboardLayout>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Pipeline</h1>
                    <p className="text-muted-foreground">Manage your deals and sales process.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.location.href = '/sales/waitlist'}>
                        <Users className="mr-2 h-4 w-4" />
                        Waitlist Management
                    </Button>
                    <CreateDealDialog />
                </div>
            </div>
            <div className="h-[calc(100vh-200px)]">
                <SalesKanban />
            </div>
        </DashboardLayout>
    );
}
