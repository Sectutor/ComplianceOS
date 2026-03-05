
import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { PageGuide } from "@/components/PageGuide";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@complianceos/ui/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Button } from "@complianceos/ui/ui/button";
import {
  Plus,
  FileText,
  MoreVertical,
  Trash2,
  ExternalLink,
  Search,
  Filter,
  Upload,
  Inbox,
  Send
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@complianceos/ui/ui/dropdown-menu";
import { format } from "date-fns";
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

type Direction = "inbound" | "outbound";

export default function QuestionnairesDashboard() {
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const clientId = parseInt(id || "0");

  const [direction, setDirection] = useState<Direction>("inbound");
  const [statusFilter, setStatusFilter] = useState("all");
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<any>(null);

  // Reset status filter when switching direction tabs
  useEffect(() => { setStatusFilter("all"); }, [direction]);

  const { data: questionnaires, refetch } = trpc.questionnaire.list.useQuery(
    { clientId, direction },
    { enabled: !!clientId }
  );

  const filteredQuestionnaires = questionnaires?.filter(q => {
    if (statusFilter === "all") return true;
    return q.status === statusFilter;
  });

  const deleteMutation = trpc.questionnaire.delete.useMutation({
    onSuccess: () => refetch()
  });

  const handleDelete = (q: any) => setQuestionnaireToDelete(q);

  const confirmDelete = async () => {
    if (questionnaireToDelete) {
      await deleteMutation.mutateAsync({ id: questionnaireToDelete.id });
      setQuestionnaireToDelete(null);
    }
  };

  const statusTabs = (
    <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
      <TabsList className="bg-[#1C4D8D]/10 p-1.5 h-auto flex flex-wrap justify-start gap-2 w-full border border-[#1C4D8D]/20 rounded-xl">
        {["all", "open", "in_progress", "completed"].map(s => (
          <TabsTrigger
            key={s}
            value={s}
            className="data-[state=active]:bg-[#3ABEF9] data-[state=active]:text-white bg-[#1C4D8D] text-white hover:bg-[#3ABEF9] transition-all font-bold border-none px-4 py-2.5 rounded-lg"
          >
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );

  const createButton = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-[#1C4D8D] hover:bg-[#1C4D8D]/90 text-white font-bold shadow-md transition-all hover:scale-[1.02]">
          <Plus className="w-4 h-4 mr-2" />
          {direction === "inbound" ? "New Security Questionnaire" : "New Customer Questionnaire"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() =>
          setLocation(`/clients/${clientId}/questionnaire-workspace?direction=${direction}`)
        }>
          <Upload className="mr-2 h-4 w-4" />
          Upload File
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() =>
          setLocation(`/clients/${clientId}/questionnaire-workspace?mode=template&direction=${direction}`)
        }>
          <FileText className="mr-2 h-4 w-4" />
          Use Template
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const questionnaireTable = (
    <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white" id="quest-table-list">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#1C4D8D] hover:bg-[#1C4D8D] border-none">
            <TableHead className="text-white font-semibold py-4">Questionnaire</TableHead>
            <TableHead className="text-white font-semibold py-4">Progress</TableHead>
            <TableHead className="text-white font-semibold py-4">Status</TableHead>
            <TableHead className="text-white font-semibold py-4">
              {direction === "inbound" ? "Sender" : "Vendor / Recipient"}
            </TableHead>
            <TableHead className="text-white font-semibold py-4">Date Added</TableHead>
            <TableHead className="text-white font-semibold py-4">Due Date</TableHead>
            <TableHead className="w-[50px] text-white font-semibold py-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredQuestionnaires?.map((q) => (
            <TableRow
              key={q.id}
              onClick={() => setLocation(`/clients/${clientId}/questionnaires/${q.id}`)}
              className="cursor-pointer hover:bg-muted/30 transition-colors border-slate-100"
            >
              <TableCell className="font-medium">
                <div className="font-semibold">{q.name}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-full max-w-[100px] bg-slate-100 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${q.progress}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{q.progress ?? 0}%</span>
                </div>
              </TableCell>
              <TableCell>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                  q.status === "completed" ? "bg-emerald-100 text-emerald-700" :
                  q.status === "in_progress" ? "bg-[#3ABEF9]/10 text-[#1C4D8D]" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {q.status === "completed" && <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />}
                  {q.status === "in_progress" && <div className="w-2 h-2 rounded-full bg-[#3ABEF9] mr-2" />}
                  {q.status === "open" && <div className="w-2 h-2 rounded-full bg-slate-400 mr-2" />}
                  {q.status?.replace("_", " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                </span>
              </TableCell>
              <TableCell>{q.senderName || q.vendorName || "-"}</TableCell>
              <TableCell>{format(new Date(q.createdAt!), "MM/dd/yyyy")}</TableCell>
              <TableCell>{q.dueDate ? format(new Date(q.dueDate), "MM/dd/yyyy") : "-"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setLocation(`/clients/${clientId}/questionnaires/${q.id}`); }}>
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); handleDelete(q); }}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {filteredQuestionnaires?.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="py-16">
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <FileText className="h-8 w-8 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700">No questionnaires yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {direction === "inbound"
                        ? "Add a security questionnaire you've received to get started."
                        : "Create a questionnaire to send to your vendors."}
                    </p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Questionnaires</h1>
            <p className="text-muted-foreground mt-1">Manage inbound assessments you must answer and outbound assessments you send to vendors.</p>
          </div>
          <div className="flex gap-2 items-center">
            <PageGuide
              title="Questionnaires"
              description="Manage incoming and outgoing security assessments."
              rationale="Streamlines the vendor risk assessment process using AI automation."
              howToUse={[
                { step: "Security Questionnaire (Inbound)", description: "Track questionnaires businesses send to you to answer.", targetId: "dir-tab-inbound" },
                { step: "Customer Security Questionnaire (Outbound)", description: "Manage questionnaires you send to your vendors.", targetId: "dir-tab-outbound" },
                { step: "Manage List", description: "Open or delete existing assessments from the list.", targetId: "quest-table-list" }
              ]}
              integrations={[
                { name: "Knowledge Base", description: "Source for AI answers." },
                { name: "Evidence Library", description: "Attach proofs." }
              ]}
            />
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            {createButton}
          </div>
        </div>

        {/* Direction tabs */}
        <Tabs value={direction} onValueChange={(v) => setDirection(v as Direction)} className="w-full">
          <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl h-auto gap-1">
            <TabsTrigger
              id="dir-tab-inbound"
              value="inbound"
              className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <Inbox className="h-4 w-4" />
              Security Questionnaire
              <span className="text-xs opacity-70 font-normal">(Inbound)</span>
            </TabsTrigger>
            <TabsTrigger
              id="dir-tab-outbound"
              value="outbound"
              className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <Send className="h-4 w-4" />
              Customer Security Questionnaire
              <span className="text-xs opacity-70 font-normal">(Outbound)</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inbound" className="space-y-4 mt-0">
            <div className="space-y-4 mb-4">
              {statusTabs}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search questionnaires..." className="pl-10 border-[#1C4D8D]/20 focus-visible:ring-[#3ABEF9]" />
                </div>
                <div className="text-sm text-muted-foreground ml-auto">
                  {filteredQuestionnaires?.length || 0} assessment{filteredQuestionnaires?.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {questionnaireTable}
          </TabsContent>

          <TabsContent value="outbound" className="space-y-4 mt-0">
            <div className="space-y-4 mb-4">
              {statusTabs}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search questionnaires..." className="pl-10 border-[#1C4D8D]/20 focus-visible:ring-[#3ABEF9]" />
                </div>
                <div className="text-sm text-muted-foreground ml-auto">
                  {filteredQuestionnaires?.length || 0} assessment{filteredQuestionnaires?.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>
            {questionnaireTable}
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!questionnaireToDelete} onOpenChange={(open) => !open && setQuestionnaireToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Questionnaire?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <b>{questionnaireToDelete?.name}</b>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
            >
              Delete Questionnaire
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
