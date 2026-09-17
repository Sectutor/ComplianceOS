import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Badge } from "@complianceos/ui/ui/badge";
import { Label } from "@complianceos/ui/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@complianceos/ui/ui/dialog";
import { Loader2, Search, ArrowLeft, Plus, ExternalLink, Globe, ShieldCheck, Zap, RefreshCw, Building2 } from "lucide-react";
import { PageGuide } from "@/components/PageGuide";
import { toast } from "sonner";

export default function GlobalVendorCatalog() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");
    const [searchTerm, setSearchTerm] = useState("");
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    const PAGE_SIZE = 12;
    const [page, setPage] = useState(0);

    // Modal state for adding a custom vendor
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({
        name: "",
        website: "",
        trustCenterUrl: "",
        platform: "SaaS"
    });

    const { data: globalVendors, isLoading, isPreviousData } = trpc.globalVendors.list.useQuery({
        search: searchTerm,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE
    }, {
        keepPreviousData: true
    });

    // Reset page when search changes
    React.useEffect(() => {
        setPage(0);
    }, [searchTerm]);

    const syncMutation = trpc.globalVendors.syncFromTrustLists.useMutation({
        onSuccess: (res) => {
            toast.success(res.message);
            utils.globalVendors.list.invalidate();
        },
        onError: (err) => {
            toast.error(`Sync failed: ${err.message}`);
        }
    });

    const createMutation = trpc.globalVendors.create.useMutation({
        onSuccess: (vendor) => {
            toast.success(`Successfully added ${vendor.name} to the Global Catalog!`);
            utils.globalVendors.list.invalidate();
            setIsAddModalOpen(false);
            setNewVendor({ name: "", website: "", trustCenterUrl: "", platform: "SaaS" });
        },
        onError: (err) => {
            toast.error(`Failed to add vendor: ${err.message}`);
        }
    });

    const importMutation = trpc.globalVendors.import.useMutation({
        onSuccess: (vendor) => {
            toast.success(`Successfully imported ${vendor.name}`);
            setLocation(`/clients/${clientId}/vendors/${vendor.id}`);
        },
        onError: (err) => {
            toast.error(`Failed to import: ${err.message}`);
        }
    });

    const handleImport = (vendorId: number) => {
        importMutation.mutate({
            clientId,
            globalVendorId: vendorId
        });
    };

    const handleAddVendorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVendor.name.trim()) {
            toast.error("Please enter a vendor name.");
            return;
        }
        createMutation.mutate(newVendor);
    };

    return (
        <div className="space-y-6 page-transition">

            <div className="flex justify-between items-end animate-slide-down">
                <PageGuide
                    title="Global Vendor Catalog"
                    description="Discover and add vendors from our community-driven database."
                    rationale="Leverage shared intelligence to accelerate vendor onboarding and risk assessment."
                    howToUse={[
                        { step: "Search", description: "Find vendors by name, domain, or category." },
                        { step: "Verify", description: "Check trust scores and existing certifications." },
                        { step: "Import", description: "Add verified vendors to your ecosystem." }
                    ]}
                />
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-blue-500/10 rounded-xl font-semibold transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Vendor to Catalog
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => syncMutation.mutate()}
                        disabled={syncMutation.isPending}
                        className="border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:text-blue-700 shadow-sm rounded-xl font-semibold transition-all"
                    >
                        {syncMutation.isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin text-blue-600 dark:text-blue-400" />
                        ) : (
                            <RefreshCw className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" />
                        )}
                        Update from TrustLists DB
                    </Button>

                    <Link href={`/clients/${clientId}/vendors/all`}>
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground rounded-xl">
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="relative max-w-md animate-slide-up">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search 500+ vendors by name or domain..."
                    className="pl-10 h-11 bg-background border-border focus:ring-2 focus:ring-blue-500 transition-all rounded-xl"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i} className="animate-pulse bg-muted h-48 border-none" />
                    ))}
                </div>
            ) : (
                <div className="space-y-8 animate-slide-up">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {globalVendors?.map((vendor) => (
                            <Card key={vendor.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-border overflow-hidden bg-card/50 backdrop-blur-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border group-hover:border-blue-500/20 transition-colors">
                                            {vendor.faviconUrl ? (
                                                <img src={vendor.faviconUrl} alt={vendor.name} className="w-8 h-8 object-contain" />
                                            ) : (
                                                <Globe className="w-6 h-6 text-muted-foreground" />
                                            )}
                                        </div>
                                        {vendor.platform && (
                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">
                                                {vendor.platform}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="mt-4">
                                        <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{vendor.name}</CardTitle>
                                        <CardDescription className="flex items-center gap-1.5 mt-1 font-medium text-muted-foreground">
                                            <Globe className="w-3.5 h-3.5" />
                                            {(() => {
                                                try {
                                                    const url = vendor.website?.startsWith('http') ? vendor.website : `https://${vendor.website}`;
                                                    return new URL(url).hostname;
                                                } catch (e) {
                                                    return vendor.website || 'No website';
                                                }
                                            })()}
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {vendor.trustCenterUrl && (
                                            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100/50">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span className="text-xs font-semibold">Verified Trust Center</span>
                                                <a
                                                    href={vendor.trustCenterUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="ml-auto hover:scale-110 transition-transform"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <ExternalLink className="w-4 h-4" />
                                                </a>
                                            </div>
                                        )}

                                        <Button
                                            className="w-full bg-slate-900 hover:bg-blue-600 text-white shadow-lg shadow-slate-200 group-hover:shadow-blue-500/10 transition-all rounded-xl py-6"
                                            onClick={() => handleImport(vendor.id)}
                                            disabled={importMutation.isPending}
                                        >
                                            {importMutation.isPending && importMutation.variables?.globalVendorId === vendor.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            ) : (
                                                <Plus className="w-4 h-4 mr-2" />
                                            )}
                                            Add to Organization
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {globalVendors?.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-muted rounded-2xl border-2 border-dashed border-border">
                            <div className="w-16 h-16 bg-card rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                <Search className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold text-foreground">No vendors found</h3>
                            <p className="text-muted-foreground mt-1 max-w-xs mx-auto">Try searching for a different name or browse our community database later.</p>
                        </div>
                    )}

                    {/* Pagination Controls */}
                    {globalVendors && globalVendors.length > 0 && (
                        <div className="flex justify-center gap-4 pt-4">
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0 || isLoading}
                            >
                                Previous
                            </Button>
                            <span className="flex items-center text-sm font-medium text-muted-foreground">
                                Page {page + 1}
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => setPage(p => p + 1)}
                                disabled={globalVendors.length < PAGE_SIZE || isLoading || isPreviousData}
                            >
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-8 text-muted-foreground text-sm font-medium">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Powered by TrustLists Open Source Database</span>
            </div>

            {/* Modal to Add New Vendor to Catalog */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent className="sm:max-w-[500px] rounded-2xl bg-card p-6 shadow-2xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold text-foreground">Add New Vendor to Catalog</DialogTitle>
                                <DialogDescription className="text-muted-foreground text-sm mt-0.5">
                                    Add a new software product or service provider to the shared catalog.
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleAddVendorSubmit} className="space-y-4 py-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="vendorName" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                Vendor / Product Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="vendorName"
                                placeholder="e.g. Acme Cloud"
                                value={newVendor.name}
                                onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                                required
                                className="rounded-xl border-border h-11 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="vendorWebsite" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                Official Website / Domain
                            </Label>
                            <Input
                                id="vendorWebsite"
                                placeholder="e.g. https://acme.com"
                                value={newVendor.website}
                                onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                                className="rounded-xl border-border h-11 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="trustCenterUrl" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                Security / Trust Center URL
                            </Label>
                            <Input
                                id="trustCenterUrl"
                                placeholder="e.g. https://trust.acme.com"
                                value={newVendor.trustCenterUrl}
                                onChange={(e) => setNewVendor({ ...newVendor, trustCenterUrl: e.target.value })}
                                className="rounded-xl border-border h-11 focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="platform" className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">
                                Platform / Category
                            </Label>
                            <select
                                id="platform"
                                value={newVendor.platform}
                                onChange={(e) => setNewVendor({ ...newVendor, platform: e.target.value })}
                                className="w-full h-11 px-3 bg-background border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            >
                                <option value="Cloud & Infrastructure">Cloud & Infrastructure</option>
                                <option value="AI & Machine Learning">AI & Machine Learning</option>
                                <option value="Cybersecurity, EDR & Identity">Cybersecurity, EDR & Identity</option>
                                <option value="Developer Tools & CI/CD">Developer Tools & CI/CD</option>
                                <option value="Databases, Data Science & Analytics">Databases, Data Science & Analytics</option>
                                <option value="Productivity, CRM & Collaboration">Productivity, CRM & Collaboration</option>
                                <option value="Fintech, Billing & HR">Fintech, Billing & HR</option>
                                <option value="E-Commerce & CMS">E-Commerce & CMS</option>
                                <option value="Communications & Media API">Communications & Media API</option>
                                <option value="Storage, Backup & Monitoring">Storage, Backup & Monitoring</option>
                                <option value="SaaS">SaaS (General)</option>
                                <option value="Other">Other Services</option>
                            </select>
                        </div>

                        <DialogFooter className="pt-4 border-t border-border flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddModalOpen(false)}
                                className="rounded-xl text-muted-foreground border-border"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={createMutation.isPending || !newVendor.name.trim()}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md shadow-blue-500/10"
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Adding Vendor...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Save Vendor to Catalog
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
