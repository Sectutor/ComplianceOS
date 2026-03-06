
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation, useParams } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Plus, Search, Github, Layers, Calendar, ChevronRight, Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@complianceos/ui/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { format } from "date-fns";

export const DevProjectsList = () => {
    const { selectedClientId } = useClientContext();
    const params = useParams();
    const [location, setLocation] = useLocation();

    const clientId = params.clientId ? parseInt(params.clientId) : selectedClientId;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [projectToDelete, setProjectToDelete] = useState<number | null>(null);

    // Create Project State
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        repositoryUrl: "",
        techStackInput: "",
        owner: "",
        criticality: "ALPHA",
        dataSensitivity: "INTERNAL",
        environment: "PROD"
    });

    const utils = trpc.useContext();
    const { data: projects, isLoading } = trpc.devProjects.list.useQuery({ clientId: clientId! }, { enabled: !!clientId });

    const createMutation = trpc.devProjects.create.useMutation({
        onSuccess: () => {
            utils.devProjects.list.invalidate();
            setIsCreateOpen(false);
            setNewProject({ 
                name: "", 
                description: "", 
                repositoryUrl: "", 
                techStackInput: "", 
                owner: "",
                criticality: "ALPHA",
                dataSensitivity: "INTERNAL",
                environment: "PROD"
            });
        }
    });

    const deleteMutation = trpc.devProjects.delete.useMutation({
        onSuccess: () => {
            utils.devProjects.list.invalidate();
            setProjectToDelete(null);
        }
    });

    const handleDelete = async () => {
        if (!projectToDelete || !clientId) return;
        await deleteMutation.mutateAsync({
            id: projectToDelete,
            clientId: clientId
        });
    };

    const handleCreate = async () => {
        if (!clientId) return;
        
        // Construct Virtual Manifest
        const virtualTags = [
            `CRIT:${newProject.criticality}`,
            `DATA:${newProject.dataSensitivity}`,
            `ENV:${newProject.environment}`
        ];

        await createMutation.mutateAsync({
            clientId: clientId,
            name: newProject.name,
            description: newProject.description,
            repositoryUrl: newProject.repositoryUrl,
            techStack: [
                ...newProject.techStackInput.split(',').map(s => s.trim()).filter(Boolean),
                ...virtualTags
            ],
            owner: newProject.owner
        });
    };

    const filteredProjects = projects?.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 page-transition">
                <Breadcrumb
                    items={[
                        { label: "Dashboard", href: "/dashboard" },
                        { label: "Threat Modeling" },
                    ]}
                />
                
                <div className="flex justify-between items-end pb-2 border-b">
                    <div>
                        <h1 className="text-4xl font-extrabold tracking-tight uppercase">Threat Modeling</h1>
                        <p className="text-slate-500 mt-1 text-sm font-mono uppercase tracking-widest">Active Development / Project Ledger</p>
                    </div>
                    <div className="flex gap-4 items-center">
                        <PageGuide
                            title="Threat Modeling"
                            description="Identify and mitigate security risks in your software design."
                            rationale="Shift security left by finding design flaws early in the SDLC."
                            howToUse={[
                                { step: "Create Project", description: "Define the application scope." },
                                { step: "Model Threats", description: "Use STRIDE or LINDDUN to find issues." },
                                { step: "Treat Risks", description: "Assign mitigations to developers." }
                            ]}
                            integrations={[
                                { name: "GitHub", description: "Link repos for automated scanning." },
                                { name: "JIRA", description: "Push mitigations as tasks." }
                            ]}
                        />
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="rounded-none border-2 border-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> NEW_PROJECT</Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-none">
                                <DialogHeader>
                                    <DialogTitle className="uppercase tracking-tighter">Create New Project</DialogTitle>
                                    <DialogDescription>Add a new software project to track security risks.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Project Name</Label>
                                        <Input
                                            className="rounded-none font-mono"
                                            value={newProject.name}
                                            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                            placeholder="CUST_PORTAL_V2"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Description</Label>
                                        <Textarea
                                            className="rounded-none font-mono"
                                            value={newProject.description}
                                            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                            placeholder="..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Repository URL</Label>
                                        <Input
                                            className="rounded-none font-mono"
                                            value={newProject.repositoryUrl}
                                            onChange={(e) => setNewProject({ ...newProject, repositoryUrl: e.target.value })}
                                            placeholder="https://github.com/org/repo"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Tech Stack</Label>
                                        <Input
                                            className="rounded-none font-mono"
                                            value={newProject.techStackInput}
                                            onChange={(e) => setNewProject({ ...newProject, techStackInput: e.target.value })}
                                            placeholder="RE_ACT, NODE_JS, PG_SQL"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-bold tracking-widest">Environment</Label>
                                            <select 
                                                className="w-full bg-transparent border-2 border-slate-200 rounded-none p-2 font-mono text-xs focus:border-slate-900 outline-none"
                                                value={newProject.environment}
                                                onChange={(e) => setNewProject({ ...newProject, environment: e.target.value })}
                                            >
                                                <option value="PROD">PROD</option>
                                                <option value="STAGE">STAGE</option>
                                                <option value="DEV">DEV</option>
                                                <option value="SANDBOX">SANDBOX</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="uppercase text-[10px] font-bold tracking-widest">Criticality</Label>
                                            <select 
                                                className="w-full bg-transparent border-2 border-slate-200 rounded-none p-2 font-mono text-xs focus:border-slate-900 outline-none"
                                                value={newProject.criticality}
                                                onChange={(e) => setNewProject({ ...newProject, criticality: e.target.value })}
                                            >
                                                <option value="OMEGA">OMEGA (CRITICAL)</option>
                                                <option value="SIGMA">SIGMA (HIGH)</option>
                                                <option value="ALPHA">ALPHA (MEDIUM)</option>
                                                <option value="BETA">BETA (LOW)</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Data Sensitivity</Label>
                                        <select 
                                            className="w-full bg-transparent border-2 border-slate-200 rounded-none p-2 font-mono text-xs focus:border-slate-900 outline-none"
                                            value={newProject.dataSensitivity}
                                            onChange={(e) => setNewProject({ ...newProject, dataSensitivity: e.target.value })}
                                        >
                                            <option value="PII">PII / SENSITIVE</option>
                                            <option value="FINANCIAL">FINANCIAL</option>
                                            <option value="INTERNAL">INTERNAL ONLY</option>
                                            <option value="PUBLIC">PUBLIC</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="uppercase text-[10px] font-bold tracking-widest">Owner</Label>
                                        <Input
                                            className="rounded-none font-mono"
                                            value={newProject.owner}
                                            onChange={(e) => setNewProject({ ...newProject, owner: e.target.value })}
                                            placeholder="TEAM_SEC"
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" className="rounded-none" onClick={() => setIsCreateOpen(false)}>CANCEL</Button>
                                    <Button className="rounded-none" onClick={handleCreate} disabled={!newProject.name || createMutation.isLoading}>
                                        {createMutation.isLoading ? "INITIALIZING..." : "EXECUTE_CREATE"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                <AlertDialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
                    <AlertDialogContent className="rounded-none">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="uppercase tracking-tighter">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. Permanent removal of target and associated data legacy.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none">CANCEL</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 focus:ring-red-600 rounded-none uppercase"
                            >
                                {deleteMutation.isLoading ? "PURGING..." : "PURGE_PROJECT"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Intelligence Bar */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-2">
                    <div className="border p-3 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total Nodes</p>
                        <p className="text-2xl font-mono font-bold leading-none">{projects?.length || 0}</p>
                    </div>
                    <div className="border p-3 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Active Threat Models</p>
                        <p className="text-2xl font-mono font-bold leading-none">{projects?.reduce((acc, p) => acc + (p.threatModelCount || 0), 0)}</p>
                    </div>
                    <div className="border p-3 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Ledger Health</p>
                        <p className="text-2xl font-mono font-bold text-emerald-600 leading-none">94.2%</p>
                    </div>
                    <div className="border p-3 bg-slate-50/50">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Last Sync</p>
                        <p className="text-2xl font-mono font-bold leading-none">NOW</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center space-x-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="SEARCH_LEDGER..."
                            className="pl-8 pr-12 rounded-none font-mono text-xs border-2"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="absolute right-2 top-2.5 hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded-sm border bg-slate-100 text-[10px] font-mono text-slate-400">
                            <span>⌘</span><span>K</span>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoading ? (
                        <div className="col-span-3 text-center py-20 font-mono animate-pulse">INITIATING_SEQUENCE...</div>
                    ) : filteredProjects?.length === 0 ? (
                        <div className="col-span-3 text-center py-20 text-slate-500 border-2 border-dashed bg-slate-50/50 font-mono uppercase tracking-widest">
                            LEDGER_EMPTY - NO_RECORDS_FOUND
                        </div>
                    ) : (
                        filteredProjects?.map(project => (
                            <Card
                                key={project.id}
                                className="rounded-none border-2 hover:border-slate-800 transition-all cursor-pointer group bg-white shadow-none"
                                onClick={() => setLocation(`/clients/${clientId}/dev/projects/${project.id}`)}
                            >
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg font-bold font-mono group-hover:tracking-wider transition-all uppercase">{project.name}</CardTitle>
                                        <div className="flex items-center gap-2">
                                            {project.repositoryUrl && <Github className="h-4 w-4 text-slate-900" />}
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
                                        </div>
                                    </div>
                                    <CardDescription className="text-xs line-clamp-2 min-h-[32px] font-medium text-slate-400 italic">
                                        {project.description || "IDLE: NO_DESCRIPTION"}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="py-4 space-y-4">
                                    <div className="flex flex-wrap gap-1">
                                        {project.techStack?.filter(t => !t.includes(':')).slice(0, 3).map((tech: string) => (
                                            <Badge key={tech} variant="outline" className="text-[10px] rounded-none px-1 border-slate-300 font-mono">
                                                {tech.toUpperCase()}
                                            </Badge>
                                        ))}
                                        {(project.techStack?.filter(t => !t.includes(':')).length || 0) > 3 && (
                                            <Badge variant="outline" className="text-[10px] rounded-none px-1 border-slate-300 font-mono">
                                                +{project.techStack!.filter(t => !t.includes(':')).length - 3}_MORE
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-2 border-t border-dotted">
                                        <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                                            <span>THREAT_LAYER_EXPOSURE</span>
                                            <span className="font-bold">{project.threatModelCount || 0}_MODELS</span>
                                        </div>
                                        <div className="h-1 w-full bg-slate-100">
                                            <div 
                                                className="h-full bg-slate-900" 
                                                style={{ width: `${Math.min((project.threatModelCount || 0) * 20, 100)}%` }} 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center text-[10px] font-mono text-slate-400 gap-4 justify-between pt-1">
                                        <div className="flex items-center uppercase">
                                            <Calendar className="h-3 w-3 mr-1" />
                                            {format(new Date(project.updatedAt!), 'yyyy.MM.dd')}
                                        </div>
                                        <div className="uppercase flex gap-2">
                                            {project.techStack?.find(t => t.startsWith('ENV:')) && (
                                                <span className="text-slate-500 border-r pr-2">{project.techStack.find(t => t.startsWith('ENV:'))?.split(':')[1]}</span>
                                            )}
                                            SEC_LVL: <span className="text-slate-900 font-bold">{project.techStack?.find(t => t.startsWith('CRIT:'))?.split(':')[1] || "ALPHA"}</span>
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="pt-2 pb-2 px-6 flex justify-between items-center bg-slate-50 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] h-6 px-2 rounded-none font-mono"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setProjectToDelete(project.id);
                                        }}
                                    >
                                        <Trash2 className="h-3 w-3 mr-1" /> PURGE
                                    </Button>
                                    <Button variant="ghost" className="text-slate-900 group-hover:pl-2 transition-all p-0 h-auto hover:bg-transparent font-mono text-[10px] font-bold flex items-center">
                                        ACCESS_RECORD <ChevronRight className="h-3 w-3 ml-0.5" />
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
};

