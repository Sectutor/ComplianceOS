import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
  Folder,
  FolderOpen,
  FileText,
  Brain,
  Globe,
  Plus,
  Trash2,
  Save,
  Search,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layers,
  Database,
  ShieldCheck,
  Link,
  Cpu,
  RefreshCw,
  ExternalLink,
  Tag,
  Copy,
  Check,
  Zap,
  Network
} from "lucide-react";
import { toast } from "sonner";
import { MemoryKnowledgeGraph } from "./MemoryKnowledgeGraph";

import {
  useMemoryTree,
  useMemoryNode,
  useMemorySearch,
  useWriteMemoryNode,
  useDeleteMemoryNode,
  useExtractFacts,
  useIngestWebIntel,
  useSyncAppData,
  type VfsTreeNode,
} from "./memoryApi";

export function CompanyMemoryCenter() {
  const [selectedPath, setSelectedPath] = useState<string>("/company/profile.md");
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    "/company": true,
    "/infrastructure": true,
    "/policies": true,
    "/vendors": true,
    "/facts": true,
    "/intel": true,
  });
  const [treeSearchFilter, setTreeSearchFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"view" | "edit" | "relations" | "graph">("view");

  // Modals state
  const [showWebModal, setShowWebModal] = useState(false);
  const [showFactModal, setShowFactModal] = useState(false);
  const [showNewNodeModal, setShowNewNodeModal] = useState(false);

  // Form states
  const [webUrl, setWebUrl] = useState("");
  const [webTitle, setWebTitle] = useState("");
  const [webContent, setWebContent] = useState("");
  const [webCategory, setWebCategory] = useState("regulations");
  const [factText, setFactText] = useState("");
  const [newNodePath, setNewNodePath] = useState("/infrastructure/new_service.md");
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newNodeContent, setNewNodeContent] = useState("");
  const [newNodeType, setNewNodeType] = useState<"document" | "fact" | "asset_profile">("document");

  // Editable current node state
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [copied, setCopied] = useState(false);

  // Queries (typed contract layer - memoryApi.ts, no raw trpc.memory.*)
  const { data: tree, refetch: refetchTree, isLoading: loadingTree } = useMemoryTree();

  const { data: nodeData, refetch: refetchNode, isLoading: loadingNode } = useMemoryNode(selectedPath, {
    onSuccess: (data) => {
      setEditTitle(data.node.title);
      setEditContent(data.node.contentL2 || "");
    },
  });

  const { data: searchResults, refetch: refetchSearch, isFetching: searching } = useMemorySearch(
    { query: searchQuery },
    { enabled: searchQuery.trim().length > 1 }
  );

  // Mutations
  const writeNodeMutation = useWriteMemoryNode({
    onSuccess: (data) => {
      toast.success(`Saved node at ${data.path}`);
      refetchTree();
      refetchNode();
      setShowNewNodeModal(false);
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`),
  });

  const deleteNodeMutation = useDeleteMemoryNode({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.deletedCount} node(s)`);
      setSelectedPath("/company/profile.md");
      refetchTree();
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`),
  });

  const extractFactsMutation = useExtractFacts({
    onSuccess: (data) => {
      toast.success(`Extracted & saved ${data.savedCount} facts!`);
      setShowFactModal(false);
      setFactText("");
      refetchTree();
      setSelectedPath("/facts");
    },
    onError: (err) => toast.error(`Fact extraction failed: ${err.message}`),
  });

  const ingestWebMutation = useIngestWebIntel({
    onSuccess: (data) => {
      toast.success(`Ingested web intel to ${data.path}`);
      setShowWebModal(false);
      setWebUrl("");
      setWebTitle("");
      setWebContent("");
      refetchTree();
      setSelectedPath(data.path);
    },
    onError: (err) => toast.error(`Web ingestion failed: ${err.message}`),
  });

  const syncAppDataMutation = useSyncAppData({
    onSuccess: (data) => {
      toast.success(`Synced ${data.totalNodesCreated} items into VFS! (Policies: ${data.policiesSynced}, Controls: ${data.controlsSynced}, Vendors: ${data.vendorsSynced})`);
      refetchTree();
      refetchNode();
    },
    onError: (err) => toast.error(`App sync failed: ${err.message}`),
  });

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => ({ ...prev, [path]: !prev[path] }));
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText(`memory:/${selectedPath}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (!nodeData?.node) return;
    writeNodeMutation.mutate({
      path: nodeData.node.path,
      title: editTitle,
      nodeType: nodeData.node.nodeType as any,
      contentL2: editContent,
    });
  };

  // Helper to render tree items recursively
  const renderTreeNodes = (nodes: VfsTreeNode[]) => {
    return nodes
      .filter((n) => !treeSearchFilter || n.title.toLowerCase().includes(treeSearchFilter.toLowerCase()) || n.path.toLowerCase().includes(treeSearchFilter.toLowerCase()))
      .map((n) => {
        const isFolder = n.nodeType === "folder" || n.children.length > 0;
        const isExpanded = !!expandedFolders[n.path];
        const isSelected = selectedPath === n.path;

        return (
          <div key={n.path} className="space-y-0.5">
            <div
              onClick={() => {
                if (isFolder) toggleFolder(n.path);
                setSelectedPath(n.path);
              }}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "hover:bg-muted text-foreground"
              }`}
            >
              {isFolder ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(n.path);
                  }}
                  className="p-0.5 hover:bg-black/10 rounded"
                >
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : (
                <span className="w-4" />
              )}

              {isFolder ? (
                isExpanded ? <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-500" /> : <Folder className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              ) : n.nodeType === "web_intel" ? (
                <Globe className="w-3.5 h-3.5 shrink-0 text-sky-500" />
              ) : n.nodeType === "fact" ? (
                <Brain className="w-3.5 h-3.5 shrink-0 text-teal-500" />
              ) : (
                <FileText className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
              )}

              <span className="truncate flex-1">{n.title}</span>

              {n.nodeType === "fact" && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 border-teal-500/30 text-teal-600 dark:text-cyan-400 bg-teal-500/10">
                  Fact
                </Badge>
              )}
            </div>

            {isFolder && isExpanded && n.children.length > 0 && (
              <div className="pl-3.5 border-l border-border/60 ml-2 space-y-0.5">
                {renderTreeNodes(n.children)}
              </div>
            )}
          </div>
        );
      });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-background text-foreground overflow-hidden">
      {/* Top Banner & Multi-Source Ingestion Actions */}
      <div className="p-4 border-b border-border bg-card flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-xs">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">Company Memory Cortex (VFS)</h2>
              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                100% Native Postgres
              </Badge>
              <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10">
                OpenViking VFS + Mem0
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Unified hierarchical knowledge base and adaptive fact memory powering all 10 AI bots.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={syncAppDataMutation.isLoading}
            onClick={() => syncAppDataMutation.mutate()}
            className="text-xs gap-1.5 font-medium border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          >
            <Zap className="w-3.5 h-3.5" />
            {syncAppDataMutation.isLoading ? "Syncing..." : "⚡ Sync App Data"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWebModal(true)}
            className="text-xs gap-1.5 font-medium border-sky-500/30 hover:bg-sky-500/10 text-sky-600 dark:text-sky-400"
          >
            <Globe className="w-3.5 h-3.5" />
            + Ingest Web & Intel
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFactModal(true)}
            className="text-xs gap-1.5 font-medium border-teal-500/30 hover:bg-teal-500/10 text-teal-600 dark:text-cyan-400"
          >
            <Sparkles className="w-3.5 h-3.5" />
            + Extract Facts (AI)
          </Button>

          <Button
            size="sm"
            onClick={() => setShowNewNodeModal(true)}
            className="text-xs gap-1.5 font-medium shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            + New VFS Node
          </Button>
        </div>
      </div>

      {/* Main Dual-Pane VFS Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Hierarchical VFS Explorer */}
        <div className="w-80 border-r border-border bg-card/60 flex flex-col shrink-0">
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={treeSearchFilter}
                onChange={(e) => setTreeSearchFilter(e.target.value)}
                placeholder="Filter files & paths..."
                className="pl-8 text-xs h-8 bg-background border-border"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>ROOT: memory:///</span>
              <button
                type="button"
                onClick={() => refetchTree()}
                className="hover:text-foreground flex items-center gap-1"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Refresh
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loadingTree ? (
              <div className="p-4 text-center text-xs text-muted-foreground">Loading VFS hierarchy...</div>
            ) : tree && tree.length > 0 ? (
              renderTreeNodes(tree)
            ) : (
              <div className="p-4 text-center text-xs text-muted-foreground">No memory nodes found.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Document Viewer, Editor, & Knowledge Relations */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          {loadingNode ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" /> Loading node...
            </div>
          ) : nodeData?.node ? (
            <>
              {/* Node Header & Actions */}
              <div className="p-4 border-b border-border bg-card flex items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                    <span>memory:/{nodeData.node.path}</span>
                    <button
                      onClick={handleCopyPath}
                      title="Copy VFS URI"
                      className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-all"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground truncate">{nodeData.node.title}</h3>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {nodeData.node.nodeType}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex bg-muted rounded-lg p-0.5 text-xs font-medium border border-border">
                    <button
                      type="button"
                      onClick={() => setActiveTab("view")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "view" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("edit")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "edit" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("relations")}
                      className={`px-3 py-1 rounded-md transition-all ${
                        activeTab === "relations" ? "bg-background text-foreground shadow-xs font-semibold" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Relations ({nodeData.relations.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("graph")}
                      className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                        activeTab === "graph" ? "bg-background text-foreground shadow-xs font-semibold text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Network className="w-3.5 h-3.5" />
                      Knowledge Graph
                    </button>
                  </div>

                  {activeTab === "edit" && (
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={writeNodeMutation.isLoading}
                      className="text-xs gap-1.5 font-medium shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Delete '${nodeData.node.path}' from Company Memory?`)) {
                        deleteNodeMutation.mutate({ path: nodeData.node.path });
                      }
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* L0 Compact Summary Bar */}
              <div className="px-4 py-2 bg-muted/40 border-b border-border flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-foreground/80 shrink-0">L0 Summary:</span>
                  <span className="truncate font-mono text-[11px]">{nodeData.node.summaryL0 || "No compact summary generated."}</span>
                </div>
                <span className="shrink-0 text-[10px]">
                  Updated {new Date(nodeData.node.updatedAt).toLocaleDateString()}
                </span>
              </div>

              {/* Node Body View / Edit / Graph */}
              <div className="flex-1 overflow-y-auto p-6">
                {activeTab === "graph" && (
                  <div className="h-full">
                    <MemoryKnowledgeGraph onSelectNode={(path) => {
                      setSelectedPath(path);
                      setActiveTab("view");
                    }} />
                  </div>
                )}

                {activeTab === "view" && (
                  <div className="max-w-4xl prose prose-sm dark:prose-invert font-sans space-y-4">
                    <pre className="p-4 bg-muted/30 border border-border rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed text-foreground">
                      {nodeData.node.contentL2 || nodeData.node.summaryL0 || "Empty content."}
                    </pre>
                  </div>
                )}

                {activeTab === "edit" && (
                  <div className="space-y-4 max-w-4xl">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Title</label>
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="text-xs bg-card border-border"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground">Content (Markdown / Specifications / JSON)</label>
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={16}
                        className="font-mono text-xs bg-card border-border leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {activeTab === "relations" && (
                  <div className="space-y-4 max-w-4xl">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Linked Entities & Dependencies</h4>
                      <Badge variant="outline" className="text-[10px]">
                        {nodeData.relations.length} Active Links
                      </Badge>
                    </div>

                    {nodeData.relations.length === 0 ? (
                      <div className="p-8 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                        No direct entity relationships modeled yet. Nodes are automatically linked when referenced by AI agents during compliance audits.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {nodeData.relations.map((rel, idx) => (
                          <div key={idx} className="p-3 border border-border rounded-xl bg-card space-y-1 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                                {rel.relationType}
                              </Badge>
                              <Link className="w-3 h-3 text-muted-foreground" />
                            </div>
                            <div className="font-mono text-xs font-semibold text-foreground">{rel.targetPath}</div>
                            {rel.description && <p className="text-[11px] text-muted-foreground">{rel.description}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
              <Brain className="w-10 h-10 text-muted-foreground/50" />
              <p className="text-xs">Select a file from the VFS tree on the left or create a new node.</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Ingest Web & Regulatory URL                                      */}
      {/* ========================================================================= */}
      {showWebModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" />
                <h3 className="font-bold text-sm text-foreground">Ingest Web & Regulatory Intelligence</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowWebModal(false)} className="h-6 w-6 p-0 text-xs">
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Target URL</label>
                <Input
                  value={webUrl}
                  onChange={(e) => setWebUrl(e.target.value)}
                  placeholder="https://csrc.nist.gov/... or https://docs.aws.amazon.com/..."
                  className="text-xs bg-background border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Title / Topic</label>
                <Input
                  value={webTitle}
                  onChange={(e) => setWebTitle(e.target.value)}
                  placeholder="e.g. NIST SP 800-53 Rev. 5 Cryptographic Baseline"
                  className="text-xs bg-background border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Content / Extracted Notes</label>
                <Textarea
                  value={webContent}
                  onChange={(e) => setWebContent(e.target.value)}
                  placeholder="Paste article contents, regulatory clauses, or architectural guidance..."
                  rows={6}
                  className="text-xs bg-background border-border font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setShowWebModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!webUrl.trim() || !webTitle.trim() || !webContent.trim() || ingestWebMutation.isLoading}
                onClick={() =>
                  ingestWebMutation.mutate({
                    url: webUrl,
                    title: webTitle,
                    content: webContent,
                    category: webCategory,
                  })
                }
                className="text-xs font-medium shadow-xs"
              >
                {ingestWebMutation.isLoading ? "Ingesting..." : "Ingest into VFS"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Extract Facts with AI (Mem0 Pattern)                              */}
      {/* ========================================================================= */}
      {showFactModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-500" />
                <h3 className="font-bold text-sm text-foreground">Adaptive Fact Extraction (Mem0 Engine)</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowFactModal(false)} className="h-6 w-6 p-0 text-xs">
                ✕
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              Paste meeting notes, Slack announcements, or architecture updates. The engine will parse and extract individual atomic facts into `/facts/...` for all 10 bots.
            </p>

            <div className="space-y-1">
              <Textarea
                value={factText}
                onChange={(e) => setFactText(e.target.value)}
                placeholder="Example: We deployed Snowflake in AWS us-east-1 for analytics. All data is encrypted with KMS customer-managed keys. Okta WebAuthn MFA is enforced for all engineering staff."
                rows={6}
                className="text-xs bg-background border-border leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setShowFactModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!factText.trim() || extractFactsMutation.isLoading}
                onClick={() => extractFactsMutation.mutate({ text: factText, source: "admin_manual_input" })}
                className="text-xs font-medium shadow-xs"
              >
                {extractFactsMutation.isLoading ? "Extracting..." : "Extract & Save Facts"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: Create New VFS Node                                              */}
      {/* ========================================================================= */}
      {showNewNodeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm text-foreground">Create New VFS Node</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setShowNewNodeModal(false)} className="h-6 w-6 p-0 text-xs">
                ✕
              </Button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">VFS Path</label>
                <Input
                  value={newNodePath}
                  onChange={(e) => setNewNodePath(e.target.value)}
                  placeholder="/infrastructure/databases/postgres_primary.md"
                  className="text-xs bg-background border-border font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Title</label>
                <Input
                  value={newNodeTitle}
                  onChange={(e) => setNewNodeTitle(e.target.value)}
                  placeholder="Primary Production Database Specs"
                  className="text-xs bg-background border-border"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Content</label>
                <Textarea
                  value={newNodeContent}
                  onChange={(e) => setNewNodeContent(e.target.value)}
                  placeholder="# Technical Specification..."
                  rows={6}
                  className="text-xs bg-background border-border font-mono leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={() => setShowNewNodeModal(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!newNodePath.trim() || !newNodeTitle.trim() || writeNodeMutation.isLoading}
                onClick={() =>
                  writeNodeMutation.mutate({
                    path: newNodePath,
                    title: newNodeTitle,
                    nodeType: newNodeType,
                    contentL2: newNodeContent,
                  })
                }
                className="text-xs font-medium shadow-xs"
              >
                {writeNodeMutation.isLoading ? "Creating..." : "Create Node"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
