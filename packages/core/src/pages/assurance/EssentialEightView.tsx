import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Shield, Target, TrendingUp, BookOpen, AlertCircle, CheckCircle2, Info, ChevronDown, ChevronUp, ArrowRight, ListChecks, ExternalLink, ClipboardCheck, BarChart3 } from "lucide-react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { ESSENTIAL_EIGHT_OFFICIAL_CONTENT } from "./EssentialEightContent";
import { PageGuide } from "@/components/PageGuide";
import { Input } from "@complianceos/ui/ui/input";

const E8_CONTROLS = [
  "Application Control",
  "Patch Applications",
  "Configure Macro Settings",
  "User Application Hardening",
  "Restrict Admin Privileges",
  "Patch Operating Systems",
  "Multi-factor Authentication",
  "Regular Backups",
  "Essential Logging and Monitoring",
];

const MATURITY_LEVELS = [
  { level: 0, label: "Level 0", description: "Control not implemented." },
  { level: 1, label: "Level 1", description: "Basic implementation." },
  { level: 2, label: "Level 2", description: "Mature and enforced organization-wide." },
  { level: 3, label: "Level 3", description: "Optimized and continuously improving." },
];

export default function EssentialEightView() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(id || "0");
  const [activeControlId, setActiveControlId] = useState<string | null>(E8_CONTROLS[0]);

  const { data: assessments, refetch: refetchAssessments } = trpc.essentialEight.listAssessments.useQuery({ clientId });
  const { data: overall } = trpc.essentialEight.calculateOverallScore.useQuery({ clientId });
  const generatePlanMutation = trpc.essentialEight.generateImprovementPlan.useMutation();

  const activeAssessment = useMemo(() => assessments?.find(a => a.controlId === activeControlId), [assessments, activeControlId]);

  return (
    <DashboardLayout>
      <div className="flex flex-col space-y-6 pb-12">
        <Breadcrumb
          items={[
            { label: "Assurance", href: `/clients/${clientId}/assurance` },
            { label: "Essential Eight", active: true },
          ]}
        />

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
              <Shield className="w-10 h-10 text-emerald-600" />
              Essential Eight
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Assess maturity across eight prioritized mitigation strategies and generate improvement plans.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <PageGuide
              title="Essential Eight Guide"
              description="Perform Essential Eight assessments with level-based criteria, targets, and evidence."
              rationale="Align to proven controls that reduce the impact of common cyber threats."
              howToUse={[
                { step: "Select Control", description: "Pick a control from the sidebar." },
                { step: "Assess Levels", description: "Mark achieved levels and criteria; add notes and evidence." },
                { step: "Set Target", description: "Choose a target level and build a roadmap from gaps." }
              ]}
            />
            <Button variant="outline" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              View Benchmarks
            </Button>
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
              <ClipboardCheck className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Global Score Panel */}
        <Card className="border-none bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <TrendingUp className="w-48 h-48" />
          </div>
          <CardContent className="p-8 flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="flex flex-col items-center gap-2">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" stroke="rgba(255,255,255,0.1)" strokeWidth="12" fill="transparent" />
                  <circle
                    cx="80"
                    cy="80"
                    r="70"
                    stroke="#10b981"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={440}
                    strokeDashoffset={440 - (440 * (overall?.overallScore || 0) / 3)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-5xl font-black text-white">{(overall?.overallScore || 0).toFixed(1)}</span>
                  <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Maturity Level</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-white/10 text-emerald-300 border-white/20 px-3 py-1">
                Target: {overall?.overallTarget?.toFixed(1) || "1.5"}
              </Badge>
            </div>

            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-6 w-full">
              {E8_CONTROLS.map((cid) => {
                const a = assessments?.find(x => x.controlId === cid);
                return (
                  <div key={cid} className="space-y-2 group cursor-pointer" onClick={() => setActiveControlId(cid)}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase tracking-wider ${activeControlId === cid ? 'text-white' : 'text-muted-foreground'}`}>
                        {cid}
                      </span>
                      <span className="text-lg font-bold">{(a?.maturityLevel || 0).toFixed(1)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-emerald-500 transition-all duration-700 ${activeControlId === cid ? 'opacity-100 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'opacity-40'}`}
                        style={{ width: `${(a?.maturityLevel || 0) / 3 * 100}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-muted-foreground">Target: {(a?.targetLevel || 1).toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar */}
          <div className="col-span-12 lg:col-span-4 xl:col-span-3 space-y-6">
            {/* Removed redundant 'Essential Eight Page' card */}

            <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden p-2">
              <div className="space-y-1">
                {E8_CONTROLS.map((cid) => {
                  const isActive = activeControlId === cid;
                  const a = assessments?.find(x => x.controlId === cid);
                  const achieved = a?.assessmentAnswers ? (Number(!!a.assessmentAnswers["1"]) + Number(!!a.assessmentAnswers["2"]) + Number(!!a.assessmentAnswers["3"])) : 0;
                  return (
                    <button
                      key={cid}
                      onClick={() => setActiveControlId(cid)}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center justify-between group ${isActive
                        ? "bg-foreground text-background shadow-xl"
                        : "hover:bg-muted"
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${isActive ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground group-hover:bg-border"
                          }`}>
                          {cid.slice(0,3).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold truncate max-w-[180px]">{cid}</span>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                            {achieved}/3 Levels
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Maturity Guidelines moved to sidebar */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-700" />
                  Maturity Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {MATURITY_LEVELS.map(l => (
                  <div key={l.level} className="flex gap-4">
                    <div className="min-w-[40px] h-10 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground">
                      L{l.level}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{l.label}</p>
                      <p className="text-xs text-muted-foreground">{l.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Improvement Plan CTA */}
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-none shadow-none p-6 rounded-3xl">
              <div className="flex flex-col space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <Target className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-900">Need an action plan?</h4>
                  <p className="text-xs text-emerald-700/80 leading-relaxed font-medium">
                    Generate a customized implementation plan based on your current gaps.
                  </p>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md shadow-emerald-600/20 py-6 font-black"
                  disabled={generatePlanMutation.isLoading}
                  onClick={() => {
                    toast.promise(generatePlanMutation.mutateAsync({ clientId }), {
                      loading: "Building your security roadmap...",
                      success: (res) => {
                        setLocation(`/clients/${clientId}/implementation/kanban/${res.planId}`);
                        return `Generated plan with ${res.taskCount} tasks!`;
                      },
                      error: (err) => `Failed to generate plan: ${err.message}`
                    });
                  }}
                >
                  {generatePlanMutation.isLoading ? "Building..." : "Build Roadmap"}
                </Button>
              </div>
            </Card>
          </div>

          {/* Main Assessment */}
          <div className="col-span-12 lg:col-span-8 xl:col-span-9">
            {activeControlId ? (
              <ControlAssessment
                controlId={activeControlId}
                clientId={clientId}
                assessment={activeAssessment}
                onUpdate={refetchAssessments}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-4 p-12 bg-muted rounded-3xl border border-dashed border-border">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center animate-pulse">
                  <Info className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium">Select a control to begin assessment</p>
              </div>
            )}
          </div>
        </div>

        {/* Right-side auxiliary section intentionally removed (AI Advisor Guidance card) */}
      </div>
    </DashboardLayout>
  );
}

function ControlAssessment({ controlId, clientId, assessment, onUpdate }: {
  controlId: string;
  clientId: number;
  assessment: any;
  onUpdate: () => void;
}) {
  const official = ESSENTIAL_EIGHT_OFFICIAL_CONTENT[controlId];
  const [answers, setAnswers] = useState<Record<string, boolean>>(assessment?.assessmentAnswers || {});
  const [quality, setQuality] = useState<Record<string, Record<string, boolean>>>(assessment?.qualityCriteria || {});
  const [levelNotes, setLevelNotes] = useState<Record<string, string>>(assessment?.levelNotes || {});
  const [notes, setNotes] = useState(assessment?.notes || "");
  const [target, setTarget] = useState(assessment?.targetLevel || 1);
  const [outcome, setOutcome] = useState(assessment?.outcome || "not_assessed");
  const [evidenceQualityOverall, setEvidenceQualityOverall] = useState(assessment?.evidenceQuality || "poor");
  const [evidenceQualityByLevel, setEvidenceQualityByLevel] = useState<Record<string, string>>(assessment?.evidenceQualityByLevel || {});
  const [coverage, setCoverage] = useState<{ workstations?: number; servers?: number; networkDevices?: number }>(assessment?.sampleCoverage || {});
  const [dirty, setDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveRef = useRef<number | null>(null);

  useEffect(() => {
    setAnswers(assessment?.assessmentAnswers || {});
    setQuality(assessment?.qualityCriteria || {});
    setLevelNotes(assessment?.levelNotes || {});
    setNotes(assessment?.notes || "");
    setTarget(assessment?.targetLevel || 1);
    setOutcome(assessment?.outcome || "not_assessed");
    setEvidenceQualityOverall(assessment?.evidenceQuality || "poor");
    setEvidenceQualityByLevel(assessment?.evidenceQualityByLevel || {});
    setCoverage(assessment?.sampleCoverage || {});
    setDirty(false);
  }, [assessment, controlId]);

  const updateMutation = trpc.essentialEight.updateMaturity.useMutation({
    onSuccess: () => {
      onUpdate();
      toast.success(`${controlId} updated`);
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`);
    }
  });

  const calculatedMaturity = useMemo(() => {
    let max = 0;
    if (answers["1"] || answers[1 as any]) max = 1; else return 0;
    if (answers["2"] || answers[2 as any]) max = 2; else return 1;
    if (answers["3"] || answers[3 as any]) max = 3; else return 2;
    return max;
  }, [answers]);

  const toggleAnswer = (level: number, value: boolean) => {
    const key = String(level);
    setAnswers(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const toggleQuality = (level: number, index: number, value: boolean) => {
    const key = String(level);
    setQuality(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [String(index)]: value } }));
    setDirty(true);
  };

  const saveAssessment = async () => {
    setIsSaving(true);
    try {
      await updateMutation.mutateAsync({
        clientId,
        controlId,
        maturityLevel: calculatedMaturity,
        targetLevel: target,
        assessmentAnswers: answers,
        qualityCriteria: quality,
        levelNotes,
        notes,
        outcome,
        evidenceQuality: evidenceQualityOverall,
        evidenceQualityByLevel,
        sampleCoverage: coverage
      });
      setDirty(false);
    } catch (e) {
      // error handled in onError
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!dirty) return;
    if (autoSaveRef.current) {
      window.clearTimeout(autoSaveRef.current);
    }
    autoSaveRef.current = window.setTimeout(() => {
      saveAssessment();
    }, 1200);
    return () => {
      if (autoSaveRef.current) {
        window.clearTimeout(autoSaveRef.current);
      }
    };
  }, [answers, quality, levelNotes, notes, target, outcome, evidenceQualityOverall, evidenceQualityByLevel, coverage, dirty]);

  const statusLabel = calculatedMaturity === 3 ? "Optimized" : calculatedMaturity >= 2 ? "Managed" : calculatedMaturity >= 1 ? "Defined" : "Initial";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div className="space-y-2 max-w-2xl">
          <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-600/20 font-black px-3 py-1">
            Essential Eight
          </Badge>
          <h2 className="text-4xl font-black text-foreground tracking-tight">{controlId}</h2>
          <p className="text-muted-foreground font-medium leading-relaxed">
            {official?.fullDescription}
          </p>
        </div>
        <div className="bg-card p-6 rounded-3xl border border-border shadow-sm flex items-center gap-8 px-10">
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest font-black text-muted-foreground mb-1">Maturity</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-emerald-700">{calculatedMaturity.toFixed(1)}</span>
              <span className="text-sm text-muted-foreground font-bold">/ 3.0</span>
            </div>
          </div>
          <div className="h-10 w-px bg-muted"></div>
          <div className="flex flex-col items-center">
            <span className="text-xs uppercase tracking-widest font-black text-muted-foreground mb-1">Status</span>
            <Badge variant={calculatedMaturity > 1.5 ? "success" : calculatedMaturity > 0.5 ? "warning" : "default"} className="font-bold text-sm px-3 py-1">
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Target Level</span>
        <div className="flex bg-muted p-1 rounded-xl">
          {[1, 2, 3].map(i => (
            <button
              key={i}
              onClick={() => { setTarget(i); setDirty(true); }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${target === i ? "bg-card shadow-sm text-emerald-700" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              L{i}
            </button>
          ))}
        </div>
        <div className="h-10 w-px bg-muted mx-4"></div>
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assessment Outcome</span>
        <div className="flex bg-muted p-1 rounded-xl">
          {["not_assessed","effective","alternate_control","ineffective","no_visibility","not_implemented","not_applicable"].map((o) => (
            <button
              key={o}
              onClick={() => { setOutcome(o); setDirty(true); }}
              className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${outcome === o ? "bg-card shadow-sm text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
            >
              {o.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <div className="ml-4 text-xs font-medium text-muted-foreground">
          {isSaving ? "Saving..." : dirty ? "Unsaved changes" : "All changes saved"}
        </div>
      </div>

      <div className="grid gap-8">
        {[1, 2, 3].map(level => {
          const levelDetail = official?.levels.find(l => l.level === level);
          const isAchieved = answers[String(level)];
          return (
            <Card key={`${controlId}-L${level}`} className={`border-none shadow-none overflow-hidden rounded-3xl transition-all ${isAchieved ? "bg-card ring-2 ring-emerald-200" : "bg-card border border-border"
              }`}>
              <div className="grid md:grid-cols-12">
                <div className={`md:col-span-1 p-4 flex flex-col items-center justify-center border-r border-border transition-colors ${isAchieved ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                  <span className="text-sm font-black italic">LVL</span>
                  <span className="text-3xl font-black">{level}</span>
                </div>

                <div className="md:col-span-11 p-8">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${isAchieved ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "text-muted-foreground"}`}>
                          Level {level}
                        </Badge>
                        {level === target && (
                          <Badge className="bg-emerald-500 text-white border-none gap-1 font-bold">
                            <Target className="w-3 h-3" /> Target
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-xl font-bold text-foreground leading-tight">
                        {levelDetail?.description}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        variant={isAchieved ? "default" : "outline"}
                        className={`rounded-2xl h-20 px-10 transition-all font-black text-lg ${isAchieved
                          ? "bg-emerald-600 hover:bg-emerald-700 scale-105 shadow-xl shadow-emerald-600/20"
                          : "hover:border-emerald-600 hover:text-emerald-700"
                          }`}
                        onClick={() => toggleAnswer(level, !isAchieved)}
                      >
                        {isAchieved ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-6 h-6 mb-1" />
                            <span>Achieved</span>
                          </div>
                        ) : "Mark Achieved"}
                      </Button>
                    </div>
                  </div>

        <div className="grid lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-700 flex items-center gap-2">
              <ListChecks className="w-3.5 h-3.5" />
              Activity & Criteria
            </h5>
            <div className="space-y-3">
              {levelDetail?.criteria.map((criterion, idx) => {
                const isChecked = quality[String(level)]?.[String(idx)];
                return (
                  <div
                    key={idx}
                    onClick={() => toggleQuality(level, idx, !isChecked)}
                    className={`flex gap-4 items-start p-4 rounded-2xl transition-all cursor-pointer border ${isChecked
                      ? "bg-emerald-50/50 border-emerald-100"
                      : "bg-card border-border hover:border-border"
                      }`}
                  >
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-all ${isChecked ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20" : "bg-muted text-muted-foreground"
                      }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className={`text-sm font-medium leading-relaxed ${isChecked ? "text-foreground" : "text-muted-foreground"}`}>
                      {criterion}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Evidence Quality (Level {level})</h5>
              <div className="flex bg-muted p-1 rounded-xl">
                {["excellent","good","fair","poor"].map(q => (
                  <button
                    key={q}
                    onClick={() => { setEvidenceQualityByLevel(prev => ({ ...prev, [String(level)]: q })); setDirty(true); }}
                    className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${evidenceQualityByLevel[String(level)] === q ? "bg-card shadow-sm text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>

                    <div className="space-y-6">
                      <div className="bg-muted p-6 rounded-3xl space-y-4">
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                          Next Steps
                        </h5>
                        <div className="space-y-2">
                          {levelDetail?.nextSteps.map((s, i) => (
                            <div key={i} className="flex gap-2 items-start">
                              <span className="text-xs font-black text-emerald-700">#{i + 1}</span>
                              <p className="text-sm text-muted-foreground font-medium">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 -mx-8 -mb-8">
                    <div className="px-8 py-3 bg-muted border-t border-b border-border flex items-center justify-between">
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <ClipboardCheck className="w-3.5 h-3.5" />
                        Implementation Findings & Evidence (Level {level})
                      </h5>
                    </div>
                    <textarea
                      value={levelNotes[String(level)] || ""}
                      onChange={(e) => setLevelNotes(prev => ({ ...prev, [String(level)]: e.target.value }))}
                      placeholder={`Document how your organization satisfies the requirements for Level ${level}...`}
                      className="w-full min-h-[100px] p-8 bg-card text-sm text-muted-foreground placeholder:text-muted-foreground transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-3xl border-none bg-card p-8 space-y-6 shadow-sm border border-border">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Info className="w-5 h-5 text-emerald-700" />
            Assessment Notes & Evidence
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-emerald-700 font-bold"
            onClick={() => window.open("https://www.cyber.gov.au/essential-eight", "_blank")}
          >
            <ExternalLink className="w-4 h-4" />
            Essential Eight Docs
          </Button>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Overall Evidence Quality</p>
            <div className="flex bg-muted p-1 rounded-xl">
              {["excellent","good","fair","poor"].map(q => (
                <button
                  key={q}
                  onClick={() => { setEvidenceQualityOverall(q); setDirty(true); }}
                  className={`px-3 py-2 rounded-lg text-[10px] font-bold transition-all ${evidenceQualityOverall === q ? "bg-card shadow-sm text-emerald-700" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Sample Coverage</p>
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Workstations" type="number" value={coverage.workstations || 0} onChange={(e) => { setCoverage(prev => ({ ...prev, workstations: parseInt(e.target.value || "0") })); setDirty(true); }} />
              <Input placeholder="Servers" type="number" value={coverage.servers || 0} onChange={(e) => { setCoverage(prev => ({ ...prev, servers: parseInt(e.target.value || "0") })); setDirty(true); }} />
              <Input placeholder="Network Devices" type="number" value={coverage.networkDevices || 0} onChange={(e) => { setCoverage(prev => ({ ...prev, networkDevices: parseInt(e.target.value || "0") })); setDirty(true); }} />
            </div>
          </div>
        </div>
        <textarea
          value={notes}
          onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
          placeholder="Add supporting evidence, notes on gaps, or internal discussions here..."
          className="w-full min-h-[150px] p-6 rounded-2xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-emerald-600/20 transition-all outline-none font-medium"
        />
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="px-8 rounded-xl font-bold h-12"
            onClick={() => {
              setAnswers(assessment?.assessmentAnswers || {});
              setQuality(assessment?.qualityCriteria || {});
              setLevelNotes(assessment?.levelNotes || {});
              setNotes(assessment?.notes || "");
              setOutcome(assessment?.outcome || "not_assessed");
              setEvidenceQualityOverall(assessment?.evidenceQuality || "poor");
              setEvidenceQualityByLevel(assessment?.evidenceQualityByLevel || {});
              setCoverage(assessment?.sampleCoverage || {});
              setDirty(false);
            }}
          >
            Reset Changes
          </Button>
          <Button
            className="px-10 rounded-xl font-black h-12 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20"
            onClick={saveAssessment}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Assessment"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
