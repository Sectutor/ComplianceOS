
import React from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { PrivacyLayout } from "./PrivacyLayout";
import { useParams } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import { ArrowLeft } from "lucide-react";

export default function DsarDetail() {
    const { selectedClientId } = useClientContext();
    const params = useParams<{ id: string }>();

    return (
        <PrivacyLayout clientId={selectedClientId || 0}>
            <div className="space-y-6">
                <div>
                    <Button variant="ghost" className="mb-4 pl-0">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to DSARs
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">DSAR Details</h1>
                </div>

                <div className="rounded-md border p-8 bg-card">
                    <p>Details for request {params.id}</p>
                </div>
            </div>
        </PrivacyLayout>
    );
}
