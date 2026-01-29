import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Plus, FileText, Search, Trash2, Edit, Filter, Eye, LayoutGrid, List, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/Breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@complianceos/ui/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@complianceos/ui/ui/toggle-group";
import { Badge } from "@complianceos/ui/ui/badge";
import RichTextEditor from "@/components/RichTextEditor";
import { marked } from "marked";
import TurndownService from "turndown";

const DEFAULT_SECTIONS = [
  "Purpose",
  "Scope",
  "Roles & Responsibilities",
  "Policy Statement",
  "Procedures",
  "Review & Approval"
];

export default function PolicyTemplates() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [frameworkFilter, setFrameworkFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<number | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<number | null>(null);
  const [selectedFramework, setSelectedFramework] = useState<string>("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [showGuide, setShowGuide] = useState(false);

  // State for RTE content in Create Dialog
  const [createContent, setCreateContent] = useState("");

  const { data: templates, isLoading, refetch } = trpc.policyTemplates.list.useQuery({ framework: frameworkFilter });

  const turndownService = useMemo(() => new TurndownService(), []);

  const createMutation = trpc.policyTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template created successfully");
      setIsCreateOpen(false);
      setCreateContent(""); // Reset content
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.policyTemplates.update.useMutation({
    onSuccess: () => {
      toast.success("Template updated successfully");
      setEditingTemplate(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.policyTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template deleted");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const filteredTemplates = templates?.filter(template =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.templateId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getNextTemplateId = () => {
    if (!templates || templates.length === 0) return "POL-001";
    const maxNum = Math.max(...templates.map(t => {
      const match = t.templateId.match(/(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    }));
    return `POL-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedFramework) {
      toast.error("Please select a framework");
      return;
    }
    const formData = new FormData(e.currentTarget);
    const sectionsStr = formData.get("sections") as string;
    const sections = sectionsStr.split('\n').filter(s => s.trim());

    // TRANSITION: Save HTML directly to preserve rich formatting.
    const contentToSave = createContent;

    createMutation.mutate({
      templateId: formData.get("templateId") as string,
      name: formData.get("name") as string,
      framework: selectedFramework,
      sections: sections,
      content: contentToSave,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>, id: number, content: string) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const sectionsStr = formData.get("sections") as string;
    const sections = sectionsStr.split('\n').filter(s => s.trim());

    // TRANSITION: Save HTML directly to preserve rich formatting.
    const contentToSave = content;

    updateMutation.mutate({
      id,
      templateId: formData.get("templateId") as string,
      name: formData.get("name") as string,
      framework: formData.get("framework") as string,
      sections: sections,
      content: contentToSave,
    });
  };

  const viewedTemplate = templates?.find(t => t.id === viewingTemplate);

  // Helper to render Content (detecting HTML or Markdown)
  const renderContent = (content: string) => {
    if (!content) return "";

    // Detect if it's already HTML
    const isHtml = /<[a-z][\s\S]*>/i.test(content);

    if (isHtml) return content;

    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Breadcrumb
          items={[
            { label: "Policy Templates" },
          ]}
        />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Policy Templates</h1>
            <p className="text-muted-foreground mt-1">
              Manage reusable policy templates for ISO 27001 and SOC 2
            </p>
          </div>
          <EnhancedDialog
            open={isCreateOpen}
            onOpenChange={setIsCreateOpen}
            title="Create Policy Template"
            description="Create a reusable policy template with placeholders for client-specific details."
            size="xl" // Larger for RTE
            footer={
              <div className="flex justify-end gap-2 w-full">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const form = document.getElementById('create-template-form') as HTMLFormElement;
                    if (form) form.requestSubmit();
                  }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            }
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            }
          >
            <form id="create-template-form" onSubmit={handleCreate} onReset={() => {
              setSelectedFramework("");
              setCreateContent("");
            }}>
              <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="templateId">Template ID *</Label>
                    <Input id="templateId" name="templateId" required defaultValue={getNextTemplateId()} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="framework">Framework *</Label>
                    <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                      <SelectTrigger className={!selectedFramework ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ISO 27001">ISO 27001</SelectItem>
                        <SelectItem value="SOC 2">SOC 2</SelectItem>
                        <SelectItem value="ISO 27001 / SOC 2">ISO 27001 / SOC 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Template Name *</Label>
                  <Input id="name" name="name" required placeholder="Access Control Policy" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sections">Sections (one per line)</Label>
                  <Textarea
                    name="sections"
                    rows={4}
                    defaultValue={DEFAULT_SECTIONS.join('\n')}
                    placeholder="Purpose&#10;Scope&#10;Policy Statement..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Template Content</Label>
                  <RichTextEditor
                    value={createContent}
                    onChange={setCreateContent}
                    className="min-h-[300px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available placeholders: {"{{company_name}}"}, {"{{system_scope}}"}, {"{{policy_name}}"}, {"{{effective_date}}"}, {"{{review_date}}"}
                  </p>
                </div>
              </div>
            </form>
          </EnhancedDialog>
        </div>

        {/* Quick Guide Card */}
        <Card className="border-blue-100 bg-blue-50/30 overflow-hidden transition-all duration-300">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-blue-50/50" onClick={() => setShowGuide(!showGuide)}>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                <HelpCircle className="h-4 w-4" />
              </div>
              <CardTitle className="text-base font-semibold text-blue-900">How to use Policy Templates</CardTitle>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50">
              {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <div className={showGuide ? "block" : "hidden"}>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">1</span>
                    Strategic Taxonomy
                  </div>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Link templates to frameworks like ISO 27001 or SOC 2. This creates a <strong>cross-mappable library</strong>, allowing one policy to satisfy multiple control requirements simultaneously.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span>
                    Contextual Automation
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-blue-700/80">Use placeholders to convert generic text into <strong>client-specific legal records</strong>:</p>
                    <div className="flex flex-wrap gap-1">
                      <code className="text-[10px] bg-blue-100/50 px-1 rounded text-blue-700 font-mono">{"{{company_name}}"}</code>
                      <code className="text-[10px] bg-blue-100/50 px-1 rounded text-blue-700 font-mono">{"{{system_scope}}"}</code>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">3</span>
                    Drafting Standards
                  </div>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Maintain <strong>formatting consistency</strong> across your entire library. Standardized headers and tables ensure that every client export looks professional and follows regulatory layout norms.
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">4</span>
                    Validation Cycles
                  </div>
                  <p className="text-xs text-blue-700/80 leading-relaxed">
                    Before deploying a template, use <strong>"Preview"</strong> to verify that your logic holds. Ensure all placeholders are correctly formatted so they resolve perfectly during policy generation.
                  </p>
                </div>
              </div>
            </CardContent>
          </div>
        </Card>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={frameworkFilter} onValueChange={setFrameworkFilter}>
            <SelectTrigger className="w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Frameworks</SelectItem>
              <SelectItem value="ISO 27001">ISO 27001</SelectItem>
              <SelectItem value="SOC 2">SOC 2</SelectItem>
              <SelectItem value="ISO 27001 / SOC 2">ISO 27001 / SOC 2</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 border rounded-md p-1 bg-muted/50">
            <ToggleGroup type="single" value={viewMode} onValueChange={(val) => val && setViewMode(val as any)}>
              <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="table" aria-label="Table view" className="h-8 w-8 p-0">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTemplates && filteredTemplates.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const sections = Array.isArray(template.sections) ? template.sections : [];
                return (
                  <Card key={template.id} className="card-accent-left accent-warning">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm text-muted-foreground">{template.templateId}</span>
                          </div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription>{template.frameworks?.join(' / ')}</CardDescription>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingTemplate(template.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <EditTemplateDialog
                            template={template}
                            editingTemplate={editingTemplate}
                            setEditingTemplate={setEditingTemplate}
                            updateMutation={updateMutation}
                            handleUpdate={handleUpdate}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`Delete template "${template.name}"?`)) {
                                deleteMutation.mutate({ id: template.id });
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Sections:</p>
                        <div className="flex flex-wrap gap-1">
                          {sections.slice(0, 4).map((section, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-muted rounded">
                              {typeof section === 'object' && section !== null ? (section as { title?: string }).title || 'Section' : String(section)}
                            </span>
                          ))}
                          {sections.length > 4 && (
                            <span className="text-xs px-2 py-1 bg-muted rounded">
                              +{sections.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden shadow-xl bg-white">
              <Table className="table-fancy">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">ID</TableHead>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Frameworks</TableHead>
                    <TableHead>Sections</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => {
                    const sections = Array.isArray(template.sections) ? template.sections : [];
                    return (
                      <TableRow key={template.id}>
                        <TableCell className="font-mono text-sm">{template.templateId}</TableCell>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {template.frameworks?.map((fw, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] uppercase">
                                {fw}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {sections.length} sections
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewingTemplate(template.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <EditTemplateDialog
                              template={template}
                              editingTemplate={editingTemplate}
                              setEditingTemplate={setEditingTemplate}
                              updateMutation={updateMutation}
                              handleUpdate={handleUpdate}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => {
                                if (confirm(`Delete template "${template.name}"?`)) {
                                  deleteMutation.mutate({ id: template.id });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <Card className="py-12">
            <CardContent className="text-center">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try adjusting your search" : "Get started by creating your first template"}
              </p>
              {user?.role === 'admin' && !searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Template
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* View Template Dialog */}
        <EnhancedDialog
          open={!!viewingTemplate}
          onOpenChange={() => setViewingTemplate(null)}
          title={viewedTemplate?.name}
          description={`${viewedTemplate?.templateId} • ${viewedTemplate?.frameworks?.join(' / ')}`}
          size="xl"
        >
          <div className="max-h-[80vh] overflow-y-auto space-y-4 py-4 pr-2">
            {(() => {
              const sectionsList = viewedTemplate?.sections;
              if (!sectionsList || !Array.isArray(sectionsList) || sectionsList.length === 0) return null;
              return (
                <div>
                  <h4 className="font-medium mb-2">Sections</h4>
                  <div className="flex flex-wrap gap-2">
                    {sectionsList.map((section, i) => (
                      <span key={i} className="px-3 py-1 bg-muted rounded-full text-sm">
                        {String(section)}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })()}
            {viewedTemplate?.content && (
              <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                <h4 className="font-medium mb-4 text-sm text-slate-500 uppercase tracking-wider">Preview</h4>
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: renderContent(viewedTemplate.content) }} />
              </div>
            )}
          </div>
        </EnhancedDialog>
      </div>
    </DashboardLayout >
  );
}

function EditTemplateDialog({ template, editingTemplate, setEditingTemplate, updateMutation, handleUpdate }: any) {
  const sections = Array.isArray(template.sections) ? template.sections : [];

  // Convert existing markdown to HTML for RTE
  // We use useMemo to avoid re-parsing on every render, but we need to handle when template changes
  const [content, setContent] = useState(() => {
    const rawContent = template.content || "";
    const isHtml = /<[a-z][\s\S]*>/i.test(rawContent);
    if (isHtml) return rawContent;

    try {
      return marked.parse(rawContent, { async: false }) as string;
    } catch {
      return rawContent;
    }
  });

  return (
    <EnhancedDialog
      open={editingTemplate === template.id}
      onOpenChange={(open) => setEditingTemplate(open ? template.id : null)}
      title="Edit Template"
      size="xl"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button type="button" variant="outline" onClick={() => setEditingTemplate(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const form = document.getElementById(`edit-template-form-${template.id}`) as HTMLFormElement;
              if (form) form.requestSubmit();
            }}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
      trigger={
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Edit className="h-4 w-4" />
        </Button>
      }
    >
      <form
        id={`edit-template-form-${template.id}`}
        onSubmit={(e) => handleUpdate(e, template.id, content)} // Pass RTE content manually
      >
        <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="templateId">Template ID</Label>
              <Input name="templateId" defaultValue={template.templateId} className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="framework">Framework</Label>
              <Select name="framework" defaultValue={template.frameworks?.[0] || ""}>
                <SelectTrigger className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISO 27001">ISO 27001</SelectItem>
                  <SelectItem value="SOC 2">SOC 2</SelectItem>
                  <SelectItem value="ISO 27001 / SOC 2">ISO 27001 / SOC 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Template Name</Label>
            <Input name="name" defaultValue={template.name} className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sections">Sections (one per line)</Label>
            <Textarea
              name="sections"
              rows={4}
              className="font-mono text-sm border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
              defaultValue={sections.join('\n')}
            />
          </div>
          <div className="grid gap-2">
            <Label>Template Content</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              className="min-h-[400px]"
            />
          </div>
        </div>
      </form>
    </EnhancedDialog>
  );
}
