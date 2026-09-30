import React, { useMemo, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@complianceos/ui/ui/dialog";
import { Label } from "@complianceos/ui/ui/label";
import { BookOpen, Loader2, Pencil, Pin, Plus, Search, Trash2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

/**
 * Master Answer Profile (Answer Library).
 *
 * Two tiers feed AI answering on inbound questionnaires:
 *  - Curated: hand-maintained company answers (highest precedence).
 *  - Derived: the best answer per question aggregated from completed
 *    inbound questionnaires, with usage counts — pin one to curate it.
 *
 * Outbound (vendor) answers never appear here: they describe the vendor,
 * not the client organization.
 */
export default function AnswerLibraryPage() {
  const { id } = useParams<{ id: string }>();
  const clientId = parseInt(id || "0", 10);
  const utils = trpc.useContext();

  const [searchQuery, setSearchQuery] = useState("");
  const [editing, setEditing] = useState<{ rowId: number; question: string; answer: string; focusArea: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newEntry, setNewEntry] = useState({ question: "", answer: "", focusArea: "" });
  const [pendingDelete, setPendingDelete] = useState<{ rowId: number; question: string } | null>(null);

  const { data, isLoading, refetch } = trpc.questionnaire.libraryList.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const saveEntryMutation = trpc.questionnaire.librarySaveEntry.useMutation({
    onSuccess: (_data, variables) => {
      toast.success(variables?.rowId ? "Master answer updated" : "Master answer added");
      setEditing(null);
      setCreating(false);
      setNewEntry({ question: "", answer: "", focusArea: "" });
      refetch();
      utils.questionnaire.libraryList.invalidate({ clientId });
    },
    onError: (err) => toast.error(`Failed to save: ${err.message}`)
  });

  const deleteEntryMutation = trpc.questionnaire.libraryDeleteEntry.useMutation({
    onSuccess: () => {
      toast.success("Master answer removed");
      setPendingDelete(null);
      refetch();
    },
    onError: (err) => toast.error(`Failed to delete: ${err.message}`)
  });

  const curated = data?.curated || [];
  const derived = data?.derived || [];

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const match = (question: string, answer: string) =>
      !q || question.toLowerCase().includes(q) || answer.toLowerCase().includes(q);
    return {
      curated: curated.filter((e) => match(e.question, e.answer)),
      derived: derived.filter((e) => match(e.question, e.answer)),
    };
  }, [curated, derived, searchQuery]);

  const handlePinDerived = (entry: any) => {
    saveEntryMutation.mutate({
      clientId,
      question: entry.question,
      answer: entry.answer,
      focusArea: entry.focusArea || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-2">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Master Answer Profile</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Answer Library</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Curated and approved company answers, reused automatically when AI answers incoming
              customer questionnaires. Curated answers always win over questionnaire-derived ones;
              vendor (outbound) answers never enter this library.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <PageGuide
              title="Answer Library"
              description="Your single source of truth for recurring security questions."
              rationale="Answer customer questionnaires consistently and instantly by maintaining one canonical set of answers."
              howToUse={[
                { step: "Curate", description: "Add or edit master answers below — they are suggested first." },
                { step: "Harvest", description: "Completed inbound questionnaires feed the derived suggestions." },
                { step: "Pin", description: "Pin a derived answer to make it a maintained master answer." }
              ]}
              integrations={[
                { name: "Questionnaires", description: "Auto-suggested during AI answering." }
              ]}
            />
            <Button onClick={() => setCreating(true)} className="gap-2 text-xs h-9 px-4 rounded-xl font-semibold">
              <Plus className="w-4 h-4" />
              Add Master Answer
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-2xl font-black">{curated.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Curated master answers</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-black">{derived.length}</p>
            <p className="text-xs font-medium text-muted-foreground">Derived from completed questionnaires</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-black">
              {derived.reduce((acc: number, d: any) => acc + d.occurrences, 0)}
            </p>
            <p className="text-xs font-medium text-muted-foreground">Total reusable answers harvested</p>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions and answers…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 bg-card/80 border-border/80 rounded-xl text-xs h-10"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Curated */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Curated Master Answers
            </CardTitle>
            <CardDescription>
              Hand-maintained answers — suggested first for matching questions on every inbound questionnaire.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-24 flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filtered.curated.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {curated.length === 0
                  ? "No curated answers yet — add one manually or pin a derived answer below."
                  : "No curated answers match your search."}
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Question</TableHead>
                      <TableHead>Answer</TableHead>
                      <TableHead className="w-32">Focus Area</TableHead>
                      <TableHead className="w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.curated.map((e: any) => (
                      <TableRow key={e.rowId}>
                        <TableCell className="text-sm font-medium">{e.question}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{e.answer}</TableCell>
                        <TableCell>
                          {e.focusArea ? <Badge variant="secondary" className="text-[10px]">{e.focusArea}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="Edit"
                              onClick={() =>
                                setEditing({ rowId: e.rowId, question: e.question, answer: e.answer, focusArea: e.focusArea || "" })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Delete"
                              onClick={() => setPendingDelete({ rowId: e.rowId, question: e.question })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Derived */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" /> Harvested from Completed Questionnaires
            </CardTitle>
            <CardDescription>
              Best answer per recurring question across your completed inbound questionnaires.
              Pin one to maintain it as a master answer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.derived.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {derived.length === 0
                  ? "Complete an inbound questionnaire and its answered questions will appear here."
                  : "No derived answers match your search."}
              </p>
            ) : (
              <div className="border rounded-md overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Question</TableHead>
                      <TableHead>Best Answer</TableHead>
                      <TableHead className="w-20">Used</TableHead>
                      <TableHead className="w-36 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.derived.map((d: any, idx: number) => (
                      <TableRow key={`${d.sourceQuestionnaireId}-${idx}`}>
                        <TableCell className="text-sm font-medium">{d.question}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">{d.answer}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]" title={d.sources?.join(", ")}>
                            {d.occurrences}×
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 gap-1"
                            onClick={() => handlePinDerived(d)}
                            disabled={saveEntryMutation.isPending}
                          >
                            <Pin className="h-3 w-3" /> Pin as master
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={creating || !!editing} onOpenChange={(open) => { if (!open) { setCreating(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Master Answer" : "Add Master Answer"}</DialogTitle>
            <DialogDescription>
              Curated answers are suggested first (and verbatim on exact question matches) whenever
              AI answers an inbound questionnaire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Question</Label>
              <Textarea
                rows={2}
                value={editing ? editing.question : newEntry.question}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, question: e.target.value })
                    : setNewEntry({ ...newEntry, question: e.target.value })
                }
                className="mt-1 text-xs"
                placeholder="Is multi-factor authentication enforced for all remote access?"
              />
            </div>
            <div>
              <Label>Approved Answer</Label>
              <Textarea
                rows={5}
                value={editing ? editing.answer : newEntry.answer}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, answer: e.target.value })
                    : setNewEntry({ ...newEntry, answer: e.target.value })
                }
                className="mt-1 text-xs"
                placeholder="Yes. MFA is enforced via our identity provider for all remote access…"
              />
            </div>
            <div>
              <Label>Focus Area (optional)</Label>
              <Input
                value={editing ? editing.focusArea : newEntry.focusArea}
                onChange={(e) =>
                  editing
                    ? setEditing({ ...editing, focusArea: e.target.value })
                    : setNewEntry({ ...newEntry, focusArea: e.target.value })
                }
                className="mt-1"
                placeholder="Access Control"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreating(false); setEditing(null); }}>Cancel</Button>
            <Button
              onClick={() => {
                const payload = editing ?? newEntry;
                if (!payload.question.trim() || !payload.answer.trim()) {
                  toast.error("Question and answer are required");
                  return;
                }
                saveEntryMutation.mutate({
                  clientId,
                  question: payload.question.trim(),
                  answer: payload.answer.trim(),
                  focusArea: payload.focusArea?.trim() || undefined,
                  rowId: editing?.rowId,
                });
              }}
              disabled={saveEntryMutation.isPending}
            >
              {saveEntryMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editing ? "Save Changes" : "Add Answer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove master answer?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.question.slice(0, 120)}"
              will no longer be suggested automatically. Harvested answers in completed questionnaires
              are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) deleteEntryMutation.mutate({ clientId, rowId: pendingDelete.rowId });
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
