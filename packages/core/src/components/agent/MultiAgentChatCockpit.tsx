import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Search, 
  Terminal, 
  Globe, 
  ShieldCheck, 
  Play, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Cpu, 
  ExternalLink, 
  FileText, 
  Code2, 
  Share2, 
  Plus, 
  Monitor, 
  Sliders, 
  RotateCw, 
  ChevronRight, 
  ArrowRight,
  Maximize2,
  Lock,
  Zap,
  User,
  Power
} from "lucide-react";
import { toast } from "sonner";

export function MultiAgentChatCockpit() {
  const { data: teammates, refetch: refetchTeammates } = trpc.teammates.listTeammates.useQuery();
  const { data: routines, refetch: refetchRoutines } = trpc.teammates.listRoutines.useQuery();

  const [activeChannelId, setActiveChannelId] = useState<string>("war_room");
  const [searchFilter, setSearchFilter] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [isTakingControl, setIsTakingControl] = useState(false);

  const { data: messages, refetch: refetchMessages, isLoading: loadingMessages } = trpc.teammates.listMessages.useQuery(
    { channelId: activeChannelId },
    { refetchInterval: 3000 }
  );

  const sendMessageMutation = trpc.teammates.sendMessage.useMutation({
    onSuccess: () => {
      setInputMessage("");
      refetchMessages();
      refetchTeammates();
    },
    onError: (err) => {
      toast.error(`Message failed: ${err.message}`);
    }
  });

  const toggleRoutineMutation = trpc.teammates.toggleRoutine.useMutation({
    onSuccess: (data) => {
      toast.success(`Routine ${data.name} is now ${data.status}.`);
      refetchRoutines();
    }
  });

  const takeControlMutation = trpc.teammates.takeControlSandbox.useMutation({
    onSuccess: (data) => {
      setIsTakingControl(!isTakingControl);
      toast.success(data.message);
    }
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Determine active target info
  const isWarRoom = activeChannelId === "war_room";
  const activeBot = teammates?.find(t => t.id === activeChannelId) || teammates?.[0];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Detect mentions in prompt
    const mentions: string[] = [];
    if (inputMessage.toLowerCase().includes("@hermes")) mentions.push("hermes_orchestrator");
    if (inputMessage.toLowerCase().includes("@alex")) mentions.push("alex_tprm");
    if (inputMessage.toLowerCase().includes("@morgan")) mentions.push("morgan_iac");
    if (inputMessage.toLowerCase().includes("@riley")) mentions.push("riley_evidence");

    sendMessageMutation.mutate({
      channelId: activeChannelId,
      content: inputMessage,
      mentions
    });
  };

  const handleInsertPromptChip = (chip: string) => {
    setInputMessage(chip);
  };

  // Ensure Hermes is always first in list
  const sortedTeammates = [...(teammates || [])].sort((a, b) => {
    if (a.id === "hermes_orchestrator") return -1;
    if (b.id === "hermes_orchestrator") return 1;
    return 0;
  });

  const filteredTeammates = sortedTeammates.filter(t => 
    t.name.toLowerCase().includes(searchFilter.toLowerCase()) || 
    t.role.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const activeRoutines = routines?.filter(r => 
    isWarRoom ? true : r.teammateId === activeChannelId
  );

  return (
    <div className="flex flex-col lg:flex-row h-[780px] bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      
      {/* ========================================================================= */}
      {/* COLUMN 1: Channels & Agent Threads List (Left Sidebar)                   */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-72 border-r border-border bg-card flex flex-col shrink-0">
        {/* Search Bar */}
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search bots or threads..."
              className="pl-9 h-9 text-xs bg-background border-border text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Thread Channels */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Pinned: Fleet War Room */}
          <button
            type="button"
            onClick={() => setActiveChannelId("war_room")}
            className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
              isWarRoom
                ? "bg-primary/10 border border-primary/40 shadow-xs"
                : "hover:bg-muted/60 border border-transparent"
            }`}
          >
            <div className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-base shrink-0 shadow-xs">
              🌐
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground truncate"># Fleet-War-Room</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  All Bots
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                Multi-agent collaboration stream
              </p>
            </div>
          </button>

          <div className="pt-3 pb-1 px-2 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Direct Bot Threads
            </span>
            <span className="text-[10px] text-muted-foreground">{teammates?.length || 0} online</span>
          </div>

          {/* Bot Individual Channels */}
          {filteredTeammates?.map((tm) => {
            const isSelected = activeChannelId === tm.id;
            const isHermes = tm.id === "hermes_orchestrator";
            return (
              <button
                key={tm.id}
                type="button"
                onClick={() => setActiveChannelId(tm.id)}
                className={`w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-3 ${
                  isSelected
                    ? "bg-primary/10 border border-primary/40 shadow-xs"
                    : isHermes
                    ? "bg-primary/5 hover:bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/60 border border-transparent"
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg shadow-inner ${
                    isHermes ? "bg-primary/10 border-primary/30" : "bg-muted border-border"
                  }`}>
                    {tm.avatar}
                  </div>
                  <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${
                    tm.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-emerald-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-semibold text-xs text-foreground truncate">{tm.name}</span>
                      {isHermes && (
                        <Badge variant="outline" className="text-[8px] py-0 px-1 border-primary/40 text-primary bg-primary/10 font-bold">
                          CHIEF
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground">{tm.lastActive}</span>
                  </div>
                  <div className="text-[10px] text-primary font-medium truncate">{tm.role}</div>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {tm.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Fleet Status Footer */}
        <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Autonomous Mode: <strong>Active</strong></span>
          </div>
          <Badge variant="outline" className="text-[10px] bg-background">
            E2B v6.8
          </Badge>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 2: Active Conversation Stream (Middle)                            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-background border-r border-border">
        {/* Active Conversation Header */}
        <div className="p-3.5 border-b border-border bg-card/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-lg">
              {isWarRoom ? "🌐" : activeBot?.avatar}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-foreground">
                  {isWarRoom ? "Fleet War Room (All Agents)" : `${activeBot?.name} — ${activeBot?.role}`}
                </h3>
                <Badge variant="outline" className="text-[10px] border-border text-muted-foreground bg-muted/40">
                  {isWarRoom ? "Multi-Agent Broadcast" : activeBot?.model}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isWarRoom 
                  ? "Mention @Alex, @Morgan, or @Riley to delegate tasks and observe autonomous inter-bot coordination."
                  : activeBot?.description}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchMessages()}
              className="h-8 text-xs border-border text-foreground hover:bg-accent"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
              Sync
            </Button>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages?.map((msg) => {
            const isUser = msg.senderId === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center text-base shrink-0 shadow-inner mt-0.5">
                    {msg.senderAvatar}
                  </div>
                )}

                <div className={`space-y-1.5 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
                  {/* Sender Name & Role */}
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="font-semibold text-foreground">{msg.senderName}</span>
                    {msg.senderRole && (
                      <span className="text-primary font-medium text-[10px]">({msg.senderRole})</span>
                    )}
                    <span className="text-muted-foreground text-[10px]">{msg.timestamp}</span>
                  </div>

                  {/* Delegated Banner if inter-agent handoff */}
                  {msg.delegatedTo && (
                    <div className="bg-primary/10 border border-primary/30 rounded-lg px-2.5 py-1 text-[11px] text-primary flex items-center gap-1.5 font-medium">
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Inter-Agent Delegation Hand-off triggered</span>
                    </div>
                  )}

                  {/* Message Bubble Card */}
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-xs"
                        : "bg-card border border-border text-foreground rounded-tl-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Headless Browser Session Preview (if present) */}
                    {msg.browserPreview && (
                      <div className="mt-3 bg-muted/40 border border-border rounded-xl p-2.5 text-foreground space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 font-semibold text-sky-600 dark:text-sky-400">
                            <Globe className="w-3.5 h-3.5" />
                            <span>{msg.browserPreview.title}</span>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-background">
                            Live Sandbox Completed
                          </Badge>
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground bg-background px-2 py-1 rounded border border-border truncate">
                          {msg.browserPreview.url}
                        </div>
                        <div className="space-y-1 pt-1">
                          {msg.browserPreview.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attachments & Artifacts */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5 pt-1 border-t border-border/50">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="bg-background border border-border rounded-lg px-2 py-1 flex items-center gap-1.5 text-[10px] text-foreground font-medium shadow-2xs"
                          >
                            <FileText className="w-3 h-3 text-primary" />
                            <span>{att.title}</span>
                            {att.size && <span className="text-muted-foreground font-normal">({att.size})</span>}
                            <Badge variant="outline" className="text-[8px] py-0 px-1 text-emerald-600 bg-emerald-50 border-emerald-300">
                              {att.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-sm shrink-0 shadow-xs mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Interactive Input Bar */}
        <div className="p-3 border-t border-border bg-card">
          {/* Quick Prompt Suggestion Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px]">
            <span className="text-muted-foreground text-[10px] uppercase font-bold shrink-0">Quick Directives:</span>
            <button
              type="button"
              onClick={() => handleInsertPromptChip("@Hermes Coordinate fleet for complete SOC 2 Type II audit readiness")}
              className="shrink-0 bg-primary/10 hover:bg-primary/20 border border-primary/40 text-primary px-2 py-0.5 rounded-md font-medium transition-all"
            >
              @Hermes Coordinate Fleet
            </button>
            <button
              type="button"
              onClick={() => handleInsertPromptChip("@Alex Harvest Datadog SOC 2 report and calculate vendor risk")}
              className="shrink-0 bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md transition-all"
            >
              @Alex Harvest SOC 2
            </button>
            <button
              type="button"
              onClick={() => handleInsertPromptChip("@Morgan Audit AWS S3 encryption & create Terraform PR")}
              className="shrink-0 bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md transition-all"
            >
              @Morgan Fix S3 IaC Drift
            </button>
            <button
              type="button"
              onClick={() => handleInsertPromptChip("@Riley Run quarterly user access review across GitHub & Workspace")}
              className="shrink-0 bg-muted/60 hover:bg-muted border border-border text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-md transition-all"
            >
              @Riley Execute UAR Review
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={isWarRoom ? "Message all bots... type @Hermes, @Alex, @Morgan, or @Riley to direct specific tasks" : `Message ${activeBot?.name}...`}
              className="text-xs bg-background border-border text-foreground"
            />
            <Button
              type="submit"
              disabled={sendMessageMutation.isLoading || !inputMessage.trim()}
              className="px-4 shadow-sm font-medium shrink-0 text-xs"
            >
              {sendMessageMutation.isLoading ? (
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 mr-1" />
                  Send
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMN 3: Active Bot's Virtual Computer & Cockpit (Right Sidebar)         */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-80 bg-card flex flex-col shrink-0 overflow-y-auto">
        {/* Computer Screen Header */}
        <div className="p-3.5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4 text-primary" />
            <h4 className="font-bold text-xs text-foreground">
              {isWarRoom ? "Fleet Virtual Cockpit" : `${activeBot?.name}'s Virtual Computer`}
            </h4>
          </div>
          <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
            Sandbox Live
          </Badge>
        </div>

        <div className="p-3.5 space-y-4">
          {/* Virtual Screencast Display */}
          <div className="bg-background border border-border rounded-xl overflow-hidden shadow-xs">
            {/* Browser / Sandbox Chrome Header */}
            <div className="bg-muted/50 px-3 py-1.5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>
              <div className="font-mono text-[9px] text-muted-foreground truncate max-w-[150px]">
                {activeBot?.sandboxType === "browser" ? "https://trust.vendor.com" : "sandbox://alpine:3.19"}
              </div>
              <Lock className="w-2.5 h-2.5 text-muted-foreground" />
            </div>

            {/* Virtual Screen Content */}
            <div className="p-3 bg-muted/20 min-h-[140px] flex flex-col justify-between text-[11px]">
              <div>
                <div className="font-semibold text-foreground flex items-center gap-1.5 mb-1">
                  {activeBot?.sandboxType === "browser" ? <Globe className="w-3.5 h-3.5 text-sky-500" /> : <Terminal className="w-3.5 h-3.5 text-emerald-500" />}
                  <span>{activeBot?.name} Active Workspace</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Executing headless browser & container automation in an isolated virtual sandbox.
                </p>
              </div>

              <div className="bg-background/80 border border-border/80 rounded-lg p-2 font-mono text-[9px] space-y-0.5">
                <div className="text-emerald-600 dark:text-emerald-400">✓ Auth Token: Active (AES-256)</div>
                <div className="text-muted-foreground">→ DOM Resolution: 1920x1080 Headless</div>
                <div className="text-muted-foreground">→ Network Stream: Encrypted VPC</div>
              </div>
            </div>

            {/* Take Control Footer */}
            <div className="p-2 border-t border-border bg-card flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Stream: 30 FPS</span>
              <Button
                variant={isTakingControl ? "destructive" : "outline"}
                size="sm"
                onClick={() => takeControlMutation.mutate({ teammateId: activeBot?.id || "alex_tprm" })}
                className="h-7 text-[10px] font-semibold"
              >
                {isTakingControl ? "Release Control" : "Take Control"}
              </Button>
            </div>
          </div>

          {/* Active Bot Routines */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Active Routines
              </span>
              <span className="text-[10px] text-muted-foreground">{activeRoutines?.length || 0} scheduled</span>
            </div>

            <div className="space-y-2">
              {activeRoutines?.map((routine) => {
                const isActive = routine.status === "active" || routine.status === "running";
                return (
                  <div
                    key={routine.id}
                    className="p-2.5 bg-background border border-border rounded-xl text-xs space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground truncate text-[11px]">{routine.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRoutineMutation.mutate({ routineId: routine.id, active: !isActive })}
                        className={`h-5 text-[9px] px-1.5 font-bold ${
                          isActive ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "text-muted-foreground"
                        }`}
                      >
                        {isActive ? "ACTIVE" : "PAUSED"}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Schedule: {routine.schedule}</span>
                      <span>Next: {routine.nextRun}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Evidence Deposit Vault */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Recent Evidence Artifacts
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="p-2 bg-background border border-border rounded-lg flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 truncate">
                  <FileText className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">Stripe_SOC2_2026.pdf</span>
                </div>
                <Badge variant="outline" className="text-[8px] border-emerald-400 text-emerald-600">
                  Verified
                </Badge>
              </div>
              <div className="p-2 bg-background border border-border rounded-lg flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 truncate">
                  <Code2 className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="truncate">s3_kms_encryption.tf</span>
                </div>
                <Badge variant="outline" className="text-[8px] border-blue-400 text-blue-600">
                  Staged PR
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
