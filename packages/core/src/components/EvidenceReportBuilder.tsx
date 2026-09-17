import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Plus,
  Trash2,
  GripVertical,
  FileText,
  Download,
  Eye,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import EvidenceReportPreview from "./EvidenceReportPreview";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportSection {
  id: string;
  title: string;
  description?: string;
  evidenceIds: number[];
  order: number;
}

interface ControlWithEvidence {
  controlId: number;
  controlName: string;
  controlStatus: string | null;
  evidenceItems: {
    id: number;
    evidenceId: string;
    description: string | null;
    status: string | null;
    owner: string | null;
    framework: string | null;
    files: any[];
  }[];
}

interface GeneratedReport {
  id: string;
  title: string;
  clientId: number;
  framework?: string;
  sections: ReportSection[];
  executiveSummary?: string;
  tableOfContents: { section: string; page: number }[];
  generatedAt: string;
  evidenceCount: number;
  controlCount: number;
  status: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface EvidenceReportBuilderProps {
  clientId: number;
}

export default function EvidenceReportBuilder({ clientId }: EvidenceReportBuilderProps) {
  // Step management
  const [step, setStep] = useState<
    "configure" | "build" | "preview" | "export"
  >("configure");

  // Form state - Step 1
  const [title, setTitle] = useState("");
  const [framework, setFramework] = useState<string>("");
  const [includeExecutiveSummary, setIncludeExecutiveSummary] = useState(true);
  const [includeTableOfContents, setIncludeTableOfContents] = useState(true);
  const [includeAppendices, setIncludeAppendices] = useState(true);

  // Sections state - Step 2
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [selectedEvidence, setSelectedEvidence] = useState<number[]>([]);

  // Generated report
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null);
  const [pdfHtml, setPdfHtml] = useState<string>("");

  // Fetch evidence grouped by control
  const { data: controlsData, isLoading: loadingControls } =
    trpc.evidenceReport.getEvidenceByFramework.useQuery(
      { clientId, framework: framework || undefined },
      { enabled: !!clientId }
    );

  // Mutations
  const generateMutation = trpc.evidenceReport.generate.useMutation({
    onSuccess: (data: any) => {
      setGeneratedReport(data);
      setStep("preview");
    },
    onError: (error: any) => {
      console.error("Generate failed:", error);
    },
  });

  const exportPdfQuery = trpc.evidenceReport.exportPdf.useQuery(
    { report: generatedReport! },
    { enabled: false }
  );

  const saveDraftMutation = trpc.evidenceReport.saveDraft.useMutation();

  // ── Helpers ─────────────────────────────────────────────────────────────

  const addSection = useCallback(() => {
    const newSection: ReportSection = {
      id: `section-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: `Section ${sections.length + 1}`,
      description: "",
      evidenceIds: [],
      order: sections.length,
    };
    setSections((prev) => [...prev, newSection]);
  }, [sections.length]);

  const removeSection = useCallback((sectionId: string) => {
    setSections((prev) =>
      prev
        .filter((s) => s.id !== sectionId)
        .map((s, i) => ({ ...s, order: i }))
    );
  }, []);

  const updateSection = useCallback(
    (sectionId: string, updates: Partial<ReportSection>) => {
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const moveSection = useCallback(
    (index: number, direction: "up" | "down") => {
      setSections((prev) => {
        const next = [...prev];
        const target = direction === "up" ? index - 1 : index + 1;
        if (target < 0 || target >= next.length) return next;
        [next[index], next[target]] = [next[target], next[index]];
        return next.map((s, i) => ({ ...s, order: i }));
      });
    },
    []
  );

  const toggleEvidenceInSection = useCallback(
    (sectionId: string, evidenceId: number) => {
      setSections((prev) =>
        prev.map((s) => {
          if (s.id !== sectionId) return s;
          const has = s.evidenceIds.includes(evidenceId);
          return {
            ...s,
            evidenceIds: has
              ? s.evidenceIds.filter((id) => id !== evidenceId)
              : [...s.evidenceIds, evidenceId],
          };
        })
      );
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!title.trim()) return;
    if (sections.length === 0) return;

    try {
      await generateMutation.mutateAsync({
        clientId,
        title: title.trim(),
        framework: framework || undefined,
        sections,
        includeExecutiveSummary,
        includeTableOfContents,
        includeAppendices,
      });
    } catch (err) {
      console.error("Failed to generate report:", err);
    }
  }, [
    title,
    framework,
    sections,
    includeExecutiveSummary,
    includeTableOfContents,
    includeAppendices,
    clientId,
    generateMutation,
  ]);

  const handleExportPdf = useCallback(async () => {
    if (!generatedReport) return;
    try {
      const html = await exportPdfQuery.refetch();
      if (html.data) {
        setPdfHtml(html.data);
        // Open print dialog with the HTML
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(html.data);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 500);
        }
      }
    } catch (err) {
      console.error("Failed to export PDF:", err);
    }
  }, [generatedReport, exportPdfQuery]);

  const handleSaveDraft = useCallback(async () => {
    if (!title.trim() || sections.length === 0) return;
    try {
      await saveDraftMutation.mutateAsync({
        clientId,
        title: title.trim(),
        config: {
          clientId,
          title: title.trim(),
          framework: framework || undefined,
          sections,
          includeExecutiveSummary,
          includeTableOfContents,
          includeAppendices,
        },
      });
    } catch (err) {
      console.error("Failed to save draft:", err);
    }
  }, [
    title,
    framework,
    sections,
    includeExecutiveSummary,
    includeTableOfContents,
    includeAppendices,
    clientId,
    saveDraftMutation,
  ]);

  // ── Render: Step 1 Configure ────────────────────────────────────────

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>
            Set the title, framework, and general options for your evidence report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Report Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., SOC 2 Evidence Package Q1 2026"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Framework (optional)</label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger>
                <SelectValue placeholder="All Frameworks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">All Frameworks</SelectItem>
                <SelectItem value="ISO 27001">ISO 27001</SelectItem>
                <SelectItem value="SOC 2">SOC 2</SelectItem>
                <SelectItem value="HIPAA">HIPAA</SelectItem>
                <SelectItem value="GDPR">GDPR</SelectItem>
                <SelectItem value="NIST CSF">NIST CSF</SelectItem>
                <SelectItem value="PCI DSS">PCI DSS</SelectItem>
                <SelectItem value="NIS2">NIS2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Report Sections</label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="exec-summary"
                checked={includeExecutiveSummary}
                onCheckedChange={(v) => setIncludeExecutiveSummary(v === true)}
              />
              <label htmlFor="exec-summary" className="text-sm cursor-pointer">
                Include Executive Summary
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="toc"
                checked={includeTableOfContents}
                onCheckedChange={(v) => setIncludeTableOfContents(v === true)}
              />
              <label htmlFor="toc" className="text-sm cursor-pointer">
                Include Table of Contents
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="appendix"
                checked={includeAppendices}
                onCheckedChange={(v) => setIncludeAppendices(v === true)}
              />
              <label htmlFor="appendix" className="text-sm cursor-pointer">
                Include Appendix with Raw Data
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          onClick={() => setStep("build")}
          disabled={!title.trim()}
        >
          Next: Build Sections
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── Render: Step 2 Build Sections ───────────────────────────────────

  const renderBuildStep = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Build Report Sections</h3>
          <p className="text-sm text-muted-foreground">
            Create sections and assign evidence items to each one.
          </p>
        </div>
        <Button onClick={addSection} variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" />
          Add Section
        </Button>
      </div>

      {loadingControls ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls / Evidence Panel */}
          <div className="lg:col-span-1 space-y-2 max-h-[600px] overflow-y-auto border rounded-lg p-3">
            <h4 className="text-sm font-semibold mb-2">Available Evidence by Control</h4>
            {controlsData?.map((control: ControlWithEvidence) => (
              <Card key={control.controlId} className="mb-2">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">
                      {control.controlName}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {control.controlStatus || "unknown"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {control.evidenceItems.map((ev) => (
                      <div
                        key={ev.id}
                        className={`text-xs p-1.5 rounded cursor-pointer transition-colors ${
                          selectedEvidence.includes(ev.id)
                            ? "bg-primary/10 border border-primary/30"
                            : "hover:bg-muted border border-transparent"
                        }`}
                        onClick={() => {
                          setSelectedEvidence((prev) =>
                            prev.includes(ev.id)
                              ? prev.filter((id) => id !== ev.id)
                              : [...prev, ev.id]
                          );
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-mono">{ev.evidenceId}</span>
                          {ev.status && (
                            <Badge
                              variant={
                                ev.status === "passed" || ev.status === "compliant"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-[10px]"
                            >
                              {ev.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-muted-foreground truncate mt-0.5">
                          {ev.description || "No description"}
                        </p>
                      </div>
                    ))}
                    {control.evidenceItems.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">
                        No evidence items
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {(!controlsData || controlsData.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No controls or evidence found for this client.
              </p>
            )}
          </div>

          {/* Sections Panel */}
          <div className="lg:col-span-2 space-y-4">
            {sections.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">
                  No sections yet. Click "Add Section" to get started.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Then select evidence items from the left panel and add them to sections.
                </p>
              </div>
            ) : (
              sections.map((section, index) => (
                <Card key={section.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <button
                          onClick={() => moveSection(index, "up")}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <Input
                            value={section.title}
                            onChange={(e) =>
                              updateSection(section.id, { title: e.target.value })
                            }
                            className="font-medium text-base max-w-sm"
                            placeholder="Section title"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSection(section.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>

                        <Textarea
                          value={section.description || ""}
                          onChange={(e) =>
                            updateSection(section.id, { description: e.target.value })
                          }
                          placeholder="Section description (optional)"
                          className="text-sm"
                          rows={2}
                        />

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              Assigned Evidence ({section.evidenceIds.length})
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6"
                              onClick={() => {
                                // Add all selected evidence to this section
                                const existing = new Set(section.evidenceIds);
                                const toAdd = selectedEvidence.filter(
                                  (id) => !existing.has(id)
                                );
                                updateSection(section.id, {
                                  evidenceIds: [...section.evidenceIds, ...toAdd],
                                });
                                setSelectedEvidence([]);
                              }}
                              disabled={selectedEvidence.length === 0}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Selected ({selectedEvidence.length})
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {section.evidenceIds.map((evId) => {
                              // Find evidence name from controls data
                              let evLabel = `Evidence #${evId}`;
                              for (const c of controlsData || []) {
                                const found = c.evidenceItems.find(
                                  (e: any) => e.id === evId
                                );
                                if (found) {
                                  evLabel = found.evidenceId;
                                  break;
                                }
                              }
                              return (
                                <Badge
                                  key={evId}
                                  variant="secondary"
                                  className="text-xs cursor-pointer"
                                  onClick={() =>
                                    toggleEvidenceInSection(section.id, evId)
                                  }
                                >
                                  {evLabel}
                                  <span className="ml-1">&times;</span>
                                </Badge>
                              );
                            })}
                            {section.evidenceIds.length === 0 && (
                              <span className="text-xs text-muted-foreground italic">
                                No evidence assigned. Select evidence from the left panel and click "Add Selected".
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep("configure")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back: Configure
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <FileText className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={sections.length === 0 || generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>Generating...</>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                Generate & Preview
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Render: Step 3 Preview ──────────────────────────────────────────

  const renderPreviewStep = () => {
    if (!generatedReport) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No report generated yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Preview Report</h3>
            <p className="text-sm text-muted-foreground">
              Review your generated report below before exporting.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setStep("build")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Edit Sections
            </Button>
            <Button onClick={() => setStep("export")}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>

        <EvidenceReportPreview report={generatedReport} />
      </div>
    );
  };

  // ── Render: Step 4 Export ────────────────────────────────────────────

  const renderExportStep = () => {
    if (!generatedReport) {
      return (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No report to export.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Report</CardTitle>
            <CardDescription>
              Your report is ready. Export as PDF or go back to make changes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-2 border-primary/20 hover:border-primary cursor-pointer transition-colors"
                onClick={handleExportPdf}
              >
                <CardContent className="p-6 text-center">
                  <Download className="h-10 w-10 mx-auto mb-3 text-primary" />
                  <h4 className="font-semibold mb-1">Export as PDF</h4>
                  <p className="text-sm text-muted-foreground">
                    Opens the report in a new window with the browser print dialog
                  </p>
                </CardContent>
              </Card>

              <Card className="border hover:border-primary/40 cursor-pointer transition-colors"
                onClick={() => setStep("preview")}
              >
                <CardContent className="p-6 text-center">
                  <Eye className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                  <h4 className="font-semibold mb-1">Review Again</h4>
                  <p className="text-sm text-muted-foreground">
                    Go back to the preview to review the full report
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep("preview")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Preview
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedReport(null);
                    setSections([]);
                    setStep("configure");
                  }}
                >
                  Start New Report
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ── Main Render ──────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {["configure", "build", "preview", "export"].map((s, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm cursor-pointer ${
                step === s
                  ? "bg-primary text-primary-foreground font-medium"
                  : ["configure", "build", "preview", "export"].indexOf(step) > i
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => {
                // Only allow navigating to completed steps
                const currentIdx = ["configure", "build", "preview", "export"].indexOf(step);
                const targetIdx = i;
                if (targetIdx <= currentIdx) {
                  setStep(s as any);
                }
              }}
            >
              {i === 0 && <FileText className="h-3 w-3" />}
              {i === 1 && <FileText className="h-3 w-3" />}
              {i === 2 && <Eye className="h-3 w-3" />}
              {i === 3 && <Download className="h-3 w-3" />}
              <span>
                {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
            </div>
            {i < 3 && <div className="h-px w-8 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {step === "configure" && renderConfigureStep()}
      {step === "build" && renderBuildStep()}
      {step === "preview" && renderPreviewStep()}
      {step === "export" && renderExportStep()}
    </div>
  );
}
