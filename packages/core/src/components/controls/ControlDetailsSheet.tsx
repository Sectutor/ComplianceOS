
import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@complianceos/ui/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Badge } from "@complianceos/ui/ui/badge";
import { Avatar, AvatarFallback } from "@complianceos/ui/ui/avatar";
import { Separator } from "@complianceos/ui/ui/separator";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Shield, FileText, User, Calendar, Link as LinkIcon, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Control {
    id: number;
    controlId: string;
    name: string;
    description: string | null;
    framework: string;
    owner: string | null;
    status: string | null;
    evidenceType: string | null;
    // Add other fields as needed from schema
}

interface ControlDetailsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    control: Control | null;
}

export function ControlDetailsSheet({ open, onOpenChange, control }: ControlDetailsSheetProps) {
    const { data: mappings, isLoading: isLoadingMappings } = trpc.compliance.frameworkMappings.listEquivalents.useQuery(
        { controlId: control?.id || 0 },
        { enabled: !!control }
    );

    if (!control) return null;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-[700px] p-0 flex flex-col bg-white">
                {/* Header */}
                <div className="p-6 pb-2 border-b border-slate-100 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                             <Badge variant="outline" className="bg-slate-50 text-slate-700 font-normal">
                                 {control.framework}
                             </Badge>
                             <span className="text-xs text-slate-400 font-mono">{control.controlId}</span>
                         </div>
                         <div className="flex items-center gap-2">
                             <Avatar className="h-8 w-8">
                                 <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                                     {(control.owner || "U").substring(0, 2).toUpperCase()}
                                 </AvatarFallback>
                             </Avatar>
                         </div>
                    </div>
                    <div className="space-y-1">
                        <SheetTitle className="text-xl font-bold leading-tight">{control.name}</SheetTitle>
                        <SheetDescription className="text-sm text-slate-500 line-clamp-3">
                            {control.description}
                        </SheetDescription>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                           <Shield className="h-3 w-3" />
                           Source: ComplianceOS
                        </div>
                        <div className="flex items-center gap-1">
                           <User className="h-3 w-3" />
                           Owner: {control.owner || "Unassigned"}
                        </div>
                        <div className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" />
                           Updated: Today
                        </div>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                        <div className="px-6 pt-2 border-b border-slate-100">
                            <TabsList className="bg-transparent p-0 -mb-[1px] space-x-6">
                                <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                                    Overview
                                </TabsTrigger>
                                <TabsTrigger value="mapped" className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                                    Mapped elements <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 rounded-full bg-slate-100 text-slate-600 font-normal">{mappings?.length || 0}</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent px-0 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none">
                                    History
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <ScrollArea className="flex-1 p-6">
                            <TabsContent value="overview" className="mt-0 space-y-6">
                                {/* Tests Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-slate-500" /> Tests
                                    </h3>
                                    <div className="bg-slate-50 rounded-lg p-8 text-center border border-slate-100 border-dashed">
                                        <p className="text-sm text-slate-500">No tests configured for this control.</p>
                                    </div>
                                </div>

                                <Separator />

                                {/* Documents Section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-500" /> Documents
                                    </h3>
                                    <div className="bg-slate-50 rounded-lg p-8 text-center border border-slate-100 border-dashed">
                                        <p className="text-sm text-slate-500">No documents attached.</p>
                                    </div>
                                </div>
                            </TabsContent>

                             <TabsContent value="mapped" className="mt-0">
                                {isLoadingMappings ? (
                                    <div className="py-8 text-center text-sm text-slate-500">Loading mappings...</div>
                                ) : mappings && mappings.length > 0 ? (
                                    <div className="space-y-4">
                                        {mappings.map((m: any) => (
                                            <div key={m.id} className="bg-white border rounded-lg p-4 hover:border-slate-300 transition-colors">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                            {m.framework}
                                                        </Badge>
                                                        <span className="text-xs font-mono font-medium text-slate-600">{m.controlId}</span>
                                                    </div>
                                                    {m.mappingType && (
                                                        <Badge variant="secondary" className="text-xs capitalize">
                                                            {m.mappingType}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-slate-900 text-sm mb-1">{m.name}</h4>
                                                <p className="text-sm text-slate-500 line-clamp-2">{m.description || "No description available."}</p>
                                                
                                                <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                                     <LinkIcon className="h-3 w-3" />
                                                     <span>Mapped via Universal Link</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-8 text-center border border-slate-100 border-dashed mt-4">
                                        <p className="text-sm text-slate-500">No mapped elements found.</p>
                                    </div>
                                )}
                            </TabsContent>

                             <TabsContent value="history" className="mt-0">
                                <div className="space-y-4 pt-4">
                                     <div className="flex gap-3">
                                         <div className="flex flex-col items-center">
                                             <div className="h-2 w-2 rounded-full bg-slate-300 mt-1.5" />
                                             <div className="w-px h-full bg-slate-200 my-1" />
                                         </div>
                                         <div className="pb-4">
                                             <p className="text-sm text-slate-900">Control created</p>
                                             <p className="text-xs text-slate-500">Today by Admin</p>
                                         </div>
                                     </div>
                                </div>
                            </TabsContent>
                        </ScrollArea>
                    </Tabs>
                </div>
            </SheetContent>
        </Sheet>
    );
}
