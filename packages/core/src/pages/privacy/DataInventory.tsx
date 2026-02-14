import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Database, Plus, Search, Loader2, AlertTriangle } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Card, CardContent } from "@complianceos/ui/ui/card";

export default function DataInventory() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [searchTerm, setSearchTerm] = useState("");

    const { data: inventory, isLoading } = trpc.privacy.getInventory.useQuery({ clientId }, { enabled: !!clientId });

    const filteredInventory = inventory?.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.type && asset.type.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Data Inventory</h1>
                        <p className="text-muted-foreground">Catalog and manage personal data assets and processing activities.</p>
                    </div>
                    {/* Placeholder action - real implementation would link to asset creation/editing */}
                    <Button variant="outline">
                        <Plus className="mr-2 h-4 w-4" /> Map New Asset
                    </Button>
                </div>

                <div className="flex items-center py-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="rounded-md border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Sensitivity</TableHead>
                                    <TableHead>Format</TableHead>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredInventory && filteredInventory.length > 0 ? (
                                    filteredInventory.map((asset) => (
                                        <TableRow key={asset.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-medium">
                                                <div className="flex items-center">
                                                    <div className="p-2 bg-blue-50 rounded-md mr-3 text-blue-600">
                                                        <Database className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold">{asset.name}</div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wider">{asset.id}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{asset.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={asset.dataSensitivity === 'High' ? 'destructive' : asset.dataSensitivity === 'Medium' ? 'default' : 'secondary'}>
                                                    {asset.dataSensitivity || 'Unclassified'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{asset.dataFormat || '-'}</TableCell>
                                            <TableCell>{asset.dataOwner || <span className="text-muted-foreground italic">Unassigned</span>}</TableCell>
                                            <TableCell className="text-muted-foreground">{new Date(asset.updatedAt).toLocaleDateString()}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <div className="p-4 bg-muted/30 rounded-full">
                                                    <Database className="h-8 w-8 text-muted-foreground/50" />
                                                </div>
                                                <p>No personal data assets found matching your criteria.</p>
                                                <Button variant="link" className="text-primary">
                                                    Go to Asset Management
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
    );
}
