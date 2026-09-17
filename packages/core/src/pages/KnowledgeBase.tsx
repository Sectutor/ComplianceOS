
import React, { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@complianceos/ui/ui/table";
import { Input } from "@complianceos/ui/ui/input";
import { Button } from "@complianceos/ui/ui/button";
import { Search, Plus, Filter, MoreHorizontal, Edit, Trash, Loader2, Copy, Check, FileText } from "lucide-react";
import { Badge } from "@complianceos/ui/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";
import { toast } from "sonner";

import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";

export default function KnowledgeBase() {
  const params = useParams();
  const clientId = parseInt(params.id || "0");
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  // Form states
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [comments, setComments] = useState("");
  const [access, setAccess] = useState("internal");
  const [tagsString, setTagsString] = useState("");
  const [health, setHealth] = useState("good");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const utils = trpc.useContext();

  const { data: entries, isLoading } = trpc.knowledgeBase.list.useQuery({
    clientId,
    search: search || undefined,
  });

  const createMutation = trpc.knowledgeBase.create.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      setIsAddOpen(false);
      resetForm();
      toast.success("Entry added successfully");
    },
  });

  const updateMutation = trpc.knowledgeBase.update.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      setIsEditOpen(false);
      resetForm();
      toast.success("Entry updated successfully");
    },
  });

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate();
      toast.success("Entry deleted successfully");
    },
  });

  const resetForm = () => {
    setQuestion("");
    setAnswer("");
    setComments("");
    setTagsString("");
    setHealth("good");
    setAccess("internal");
    setSelectedEntry(null);
  };

  const handleEdit = (entry: any) => {
    setSelectedEntry(entry);
    setQuestion(entry.question);
    setAnswer(entry.answer);
    setComments(entry.comments || "");
    setTagsString(entry.tags ? entry.tags.join(", ") : "");
    setHealth(entry.health || "good");
    setAccess(entry.access || "internal");
    setIsEditOpen(true);
  };

  const copyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Answer copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSave = () => {
    if (!question || !answer) return;

    const tagsArray = tagsString.split(",").map(t => t.trim()).filter(Boolean);

    if (isEditOpen && selectedEntry) {
      updateMutation.mutate({
        id: selectedEntry.id,
        question,
        answer,
        comments,
        tags: tagsArray,
        health,
        access: access as any,
      });
    } else {
      createMutation.mutate({
        clientId,
        question,
        answer,
        comments,
        tags: tagsArray,
        health,
        access: access as any,
      });
    }
  };

  return (
    <DashboardLayout fullWidth={true}>
      <div className="p-8 w-full max-w-full">
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Knowledge Base (FAQ)</h1>
              <p className="text-muted-foreground mt-1">
                Manage standard answers for compliance questionnaires.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PageGuide
                title="Knowledge Base"
                description="Central repository for common security questions and compliance facts."
                rationale="Maintain consistency in how your organization reports its security posture to customers, auditors, and employees."
                howToUse={[
                  {
                    step: "Navigate Library",
                    description: "Use keywords to find approved technical answers for common questions.",
                    targetId: "kb-search-bar"
                  },
                  {
                    step: "Update Repository",
                    description: "Document new security controls as your program evolves.",
                    targetId: "kb-add-entry"
                  },
                  {
                    step: "Export Data",
                    description: "Download approved facts for Sales RFPs or customer reports.",
                    targetId: "kb-export-btn"
                  }
                ]}
                scenarios={[
                  {
                    title: "Drafting a New Security FAQ",
                    example: "You keep receiving the same questions about your encryption-at-rest methodology during sales calls.",
                    auditTip: "Add the answer to the KB once. This ensures that every salesperson uses the exact same approved technical language, reducing the risk of misrepresenting controls."
                  },
                  {
                    title: "Sales RFP Support",
                    example: "A major prospect has sent a 300-question security questionnaire that's due in 48 hours.",
                    auditTip: "Use the 'Search' feature to find previous answers. Modern auditors look for evidence that internal security knowledge is centralized and not siloed in personal spreadsheets."
                  }
                ]}
              />
              <Button id="kb-add-entry" onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add entries
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="kb-search-bar"
                placeholder="Search questions or answers..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" /> Filter
            </Button>
          </div>

          <div className="border rounded-lg bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Question</TableHead>
                  <TableHead className="w-[30%]">Answer</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Health / Access</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : entries?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No entries found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries?.map((entry: any) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="font-medium">{entry.question}</div>
                        {entry.comments && <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]" title={entry.comments}>{entry.comments}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start justify-between gap-2 p-2 bg-muted/50 rounded-md">
                          <div className="text-sm truncate max-w-[220px]" title={entry.answer}>
                            {entry.answer}
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 shrink-0" 
                            onClick={() => copyToClipboard(entry.id, entry.answer)}
                          >
                            {copiedId === entry.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {entry.tags && entry.tags.length > 0 ? entry.tags.map((t: string) => (
                              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          )) : <span className="text-xs text-muted-foreground">--</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={entry.health === 'needs_review' ? 'destructive' : 'default'} className="w-fit text-xs capitalize">
                            {entry.health ? entry.health.replace('_', ' ') : 'Good'}
                          </Badge>
                          <Badge variant="outline" className="w-fit text-[10px] capitalize text-muted-foreground">
                            {entry.access}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(entry)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteMutation.mutate({ id: entry.id })}
                            >
                              <Trash className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <Dialog open={isAddOpen || isEditOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
            resetForm();
          }
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{isEditOpen ? "Edit Entry" : "Add Entry"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="question">Question</Label>
                <Input
                  id="question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. Are employee endpoints encrypted?"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="answer">Answer</Label>
                <div className="relative">
                  <Textarea
                    id="answer"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Yes, we use BitLocker..."
                    className="min-h-[120px]"
                  />
                  <div className="absolute top-2 right-2 flex text-muted-foreground opacity-50 pointer-events-none">
                    <FileText className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="health">Health Status</Label>
                    <select
                        id="health"
                        value={health}
                        onChange={(e) => setHealth(e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <option value="good">Good (Up to date)</option>
                        <option value="needs_review">Needs Review</option>
                        <option value="deprecated">Deprecated</option>
                    </select>
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="tags">Tags (comma separated)</Label>
                    <Input
                        id="tags"
                        value={tagsString}
                        onChange={(e) => setTagsString(e.target.value)}
                        placeholder="e.g. Encryption, Endpoints, SOC2"
                    />
                  </div>
              </div>

              <div className="grid gap-2 mt-2">
                <Label htmlFor="comments">Internal Comments</Label>
                <Input
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Optional notes for internal tracking"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsAddOpen(false);
                setIsEditOpen(false);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
