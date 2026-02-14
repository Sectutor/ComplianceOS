
import React from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus } from "lucide-react";
import TIAWorkspace from './TIAWorkspace';

export default function TransferDashboard() {
    const { selectedClientId } = useClientContext();

    return (
        <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Data Transfers</h1>
                    <p className="text-muted-foreground">Manage ongoing and one-time data transfers.</p>
                </div>

                {/* Reusing TIAWorkspace as content placeholder or alongside */}
                <TIAWorkspace />
            </div>
    );
}
