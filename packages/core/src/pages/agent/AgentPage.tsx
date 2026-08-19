import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
  Bot, 
  SendHorizontal, 
  Plus, 
  MessageSquare, 
  History, 
  Clock, 
  Check, 
  Pin, 
  PinOff, 
  Calendar, 
  ListTodo, 
  Trash2, 
  PanelLeftClose, 
  PanelLeft, 
  ChevronDown, 
  ChevronRight, 
  Search,
  Play,
  Pause,
  Loader,
  Zap,
  Activity,
  ShieldCheck,
  Cpu,
  Settings,
  Pencil,
  Sparkles,
  FileText,
  FileSearch,
  Map,
  X
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import {
  useAiCopilotDraftPolicy,
  useAiCopilotSuggestEvidence,
  useAiCopilotAutoMap,
  useAiCopilotStatus,
  type AiCopilotDraftPolicy,
  type AiCopilotEvidenceSuggestion,
  type AiCopilotAutoMapResult,
} from "../aiCopilotApi";
import { useAgentChat, ChatMessage } from '../../hooks/useAgentChat';

// ── Types ──────────────────────────────────────────────────────────────────────

interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
  message_count: number;
  pinned?: boolean;
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  description: string;
  status: 'active' | 'paused' | 'running';
  lastRun: string;
  nextRun: string;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'complianceos_agent_convos';
const CRON_STORAGE_KEY = 'complianceos_agent_cron_jobs';

// ── Default Cron Jobs ─────────────────────────────────────────────────────────

const DEFAULT_CRON_JOBS: CronJob[] = [
  {
    id: 'cron_vuln',
    name: 'Daily Vulnerability Auditor',
    schedule: '0 0 * * *',
    description: 'Scans package dependencies, Docker containers, and public endpoints for CVEs.',
    status: 'active',
    lastRun: '14 hours ago',
    nextRun: 'in 10 hours',
    messages: [
      {
        id: 'msg_vuln_1',
        role: 'agent',
        content: `### 🛡️ Cron Run: Daily Vulnerability Auditor\nTriggered: 2026-07-07T00:00:00Z\n\nI have performed a full scan of the ComplianceOS repository and docker containers.\n\n**Results:**\n- **Package Dependencies:** Checked 142 dependencies. 0 critical, 1 medium vulnerability found in \`body-parser\` (prototype pollution risk).\n- **Docker Containers:** Checked base images. All images are using pinned SHA hashes. No high vulnerabilities.\n- **Network Ports:** Verified public firewall rules. Port \`3005\` is restricted to VPN access.\n\n*Remediation recommendation:* Run \`npm update body-parser\` to resolve the medium risk.`,
        timestamp: Date.now() - 14 * 3600 * 1000
      }
    ]
  },
  {
    id: 'cron_aws',
    name: 'AWS Evidence Intake',
    schedule: '0 */12 * * *',
    description: 'Polls AWS CloudTrail, S3, and IAM config to collect evidence for SOC2.',
    status: 'active',
    lastRun: '2 hours ago',
    nextRun: 'in 10 hours',
    messages: [
      {
        id: 'msg_aws_1',
        role: 'agent',
        content: `### ☁️ Cron Run: AWS Evidence Intake\nTriggered: 2026-07-07T12:00:00Z\n\nI polled AWS API endpoints for SOC2 CC6.1 and CC6.3 evidence.\n\n**Evidence Collected:**\n- **S3 Bucket Policies:** Verified encryption-at-rest is enabled on all 12 buckets. Policy evidence generated and linked to Control \`CC6.1\`.\n- **IAM Access Keys:** Found 1 active access key older than 90 days for user \`deploy-pipeline\`.\n- **Security Groups:** 0 security groups allow wildcard access (\`0.0.0.0/0\`) to port 22.\n\n*Action taken:* Uploaded S3 encryption evidence to the Audit Hub. Flagged user \`deploy-pipeline\` key rotation task.`,
        timestamp: Date.now() - 2 * 3600 * 1000
      }
    ]
  },
  {
    id: 'cron_soc2',
    name: 'SOC2 Gap Assessment',
    schedule: '0 6 * * 0',
    description: 'Runs weekly compliance gap analysis and updates the readiness scoring.',
    status: 'active',
    lastRun: '2 days ago',
    nextRun: 'in 5 days',
    messages: [
      {
        id: 'msg_soc2_1',
        role: 'agent',
        content: `### 📊 Cron Run: SOC2 Gap Assessment\nTriggered: 2026-07-05T06:00:00Z\n\nWeekly readiness assessment completed for **Trust Services Criteria (Security & Confidentiality)**.\n\n**Status Update:**\n- **Overall SOC2 Readiness:** **84%** (+2% from last week)\n- **Completed Controls:** 42 / 50\n- **Open Gaps:** 8 controls missing evidence or policies.\n\n**Detected Gaps:**\n1. *Control CC7.1 (Vulnerability Management):* Missing recent vulnerability scan evidence (remediating via Daily Vulnerability Auditor).\n2. *Control CC2.1 (Security Policies):* Employee handbook signed evidence has expired for 3 new hires.\n\n*Action taken:* Dispatched notification emails to the 3 outstanding employees to sign the security policy.`,
        timestamp: Date.now() - 2 * 24 * 3600 * 1000
      }
    ]
  }
];

// ── Storage Helpers ──────────────────────────────────────────────────────────

function loadConvos(): SavedConversation[] {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveConvos(list: SavedConversation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function loadCronJobs(): CronJob[] {
  try {
    const r = localStorage.getItem(CRON_STORAGE_KEY);
    return r ? JSON.parse(r) : DEFAULT_CRON_JOBS;
  } catch {
    return DEFAULT_CRON_JOBS;
  }
}
function saveCronJobs(list: CronJob[]) {
  try { localStorage.setItem(CRON_STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function genTitle(msgs: ChatMessage[]): string {
  const first = msgs.find(m => m.role === 'user');
  if (!first) return 'New Chat';
  const t = first.content.slice(0, 80);
  return t.length < 80 ? t : t + '…';
}

function groupByDate(convos: SavedConversation[]): { label: string; items: SavedConversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const groups: Record<string, SavedConversation[]> = { Today: [], Yesterday: [], 'Previous 7 Days': [], Older: [] };
  for (const c of convos) {
    if (c.updated_at >= today) groups.Today.push(c);
    else if (c.updated_at >= yesterday) groups.Yesterday.push(c);
    else if (c.updated_at >= weekAgo) groups['Previous 7 Days'].push(c);
    else groups.Older.push(c);
  }
  return Object.entries(groups).filter(([_, v]) => v.length > 0).map(([label, items]) => ({ label, items }));
}

// ── AgentPage ──────────────────────────────────────────────────────────────────────

export function AgentPage() {
  const { 
    messages, 
    sendMessage, 
    isLoading, 
    error, 
    clearChat, 
    suggestedQuestions,
    setMessages,
    setConversationId
  } = useAgentChat();
  
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [convos, setConvos] = useState<SavedConversation[]>(() => loadConvos());
  const [cronJobs, setCronJobs] = useState<CronJob[]>(() => loadCronJobs());
  const [searchQ, setSearchQ] = useState('');
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const currentConvIdRef = useRef<string | null>(null);
  const [runningCronId, setRunningCronId] = useState<string | null>(null);

  // Autosave and Editing states
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Collapsible sections
  const [pinnedExpanded, setPinnedExpanded] = useState(true);
  const [cronExpanded, setCronExpanded] = useState(true);
  const [convosExpanded, setConvosExpanded] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Load conversation/cron job on mount
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const activeId = localStorage.getItem('complianceos_active_conv_id');
    if (activeId) {
      if (activeId.startsWith('cron_')) {
        const cronJob = cronJobs.find(c => c.id === activeId);
        if (cronJob) {
          setMessages(cronJob.messages);
          setCurrentConvId(cronJob.id);
          currentConvIdRef.current = cronJob.id;
          setConversationId(cronJob.id);
        }
      } else {
        const activeConv = convos.find(c => c.id === activeId);
        if (activeConv) {
          setMessages(activeConv.messages);
          setCurrentConvId(activeConv.id);
          currentConvIdRef.current = activeConv.id;
          setConversationId(activeConv.id);
        }
      }
    } else if (convos.length > 0) {
      const lastConv = convos[0];
      setMessages(lastConv.messages);
      setCurrentConvId(lastConv.id);
      currentConvIdRef.current = lastConv.id;
      setConversationId(lastConv.id);
      localStorage.setItem('complianceos_active_conv_id', lastConv.id);
    }
  }, [convos, cronJobs, setMessages, setConversationId]);

  // Keep refs of latest state for unmount saving
  const messagesRef = useRef(messages);
  const convosRef = useRef(convos);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    convosRef.current = convos;
  }, [convos]);

  // Auto-save on every message change or load transition complete
  useEffect(() => {
    if (messages.length === 0) return;
    const id = currentConvIdRef.current || `conv_${Date.now()}`;
    
    setSaveStatus('saving');
    
    if (!currentConvIdRef.current) {
      currentConvIdRef.current = id;
      setCurrentConvId(id);
      localStorage.setItem('complianceos_active_conv_id', id);
    }

    if (id.startsWith('cron_')) {
      // It's a Cron Job session! Save to cronJobs
      setCronJobs(prev => {
        const updated = prev.map(c => c.id === id ? { ...c, messages: messages.map(m => ({ ...m })), lastRun: 'Just now' } : c);
        saveCronJobs(updated);
        return updated;
      });
    } else {
      // Normal conversation!
      const existing = convos.find(c => c.id === id);
      const updated = [
        {
          id, title: genTitle(messages), messages: messages.map(m => ({ ...m })),
          created_at: existing?.created_at || Date.now(), updated_at: Date.now(), message_count: messages.length,
          pinned: existing?.pinned || false,
        },
        ...convos.filter(c => c.id !== id),
      ].slice(0, 100);
      setConvos(updated);
      saveConvos(updated);
    }

    const t = setTimeout(() => {
      setSaveStatus('saved');
      const t2 = setTimeout(() => setSaveStatus(null), 2000);
      return () => clearTimeout(t2);
    }, 500);
    return () => clearTimeout(t);
  }, [messages.length, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on page close or component unmount (switching screen)
  useEffect(() => {
    const saveCurrentState = () => {
      const msgs = messagesRef.current;
      const convsList = convosRef.current;
      const id = currentConvIdRef.current;

      if (msgs.length === 0 || !id) return;

      if (id.startsWith('cron_')) {
        // Save Cron Job in localStorage only on unmount
        const cronJobsList = loadCronJobs();
        const updated = cronJobsList.map(c => c.id === id ? { ...c, messages: msgs.map(m => ({ ...m })) } : c);
        saveCronJobs(updated);
      } else {
        // Save normal conversation in localStorage
        const existing = convsList.find(c => c.id === id);
        const updated = [
          {
            id,
            title: genTitle(msgs),
            messages: msgs.map(m => ({ ...m })),
            created_at: existing?.created_at || Date.now(),
            updated_at: Date.now(),
            message_count: msgs.length,
            pinned: existing?.pinned || false
          },
          ...convsList.filter(c => c.id !== id),
        ].slice(0, 100);
        saveConvos(updated);
      }
    };

    window.addEventListener('beforeunload', saveCurrentState);
    return () => {
      window.removeEventListener('beforeunload', saveCurrentState);
      saveCurrentState();
    };
  }, []);

  // Send
  const handleSend = useCallback(() => {
    const t = input.trim();
    if (!t || isLoading) return;
    setInput('');
    sendMessage(t);
  }, [input, isLoading, sendMessage]);

  const handleKey = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  // New chat
  const handleNew = useCallback(() => {
    clearChat();
    setCurrentConvId(null);
    currentConvIdRef.current = null;
    setConversationId(undefined);
    localStorage.removeItem('complianceos_active_conv_id');
  }, [clearChat, setConversationId]);

  // Load conversation
  const handleLoad = useCallback((conv: SavedConversation) => {
    setMessages(conv.messages);
    setCurrentConvId(conv.id);
    currentConvIdRef.current = conv.id;
    setConversationId(conv.id);
    localStorage.setItem('complianceos_active_conv_id', conv.id);
  }, [setMessages, setConversationId]);

  // Load Cron Job session
  const handleLoadCron = useCallback((cron: CronJob) => {
    setMessages(cron.messages);
    setCurrentConvId(cron.id);
    currentConvIdRef.current = cron.id;
    setConversationId(cron.id);
    localStorage.setItem('complianceos_active_conv_id', cron.id);
  }, [setMessages, setConversationId]);

  // Delete Conversation
  const handleDelete = useCallback((id: string) => {
    const updated = convos.filter(c => c.id !== id);
    setConvos(updated);
    saveConvos(updated);
    if (currentConvId === id) {
      handleNew();
    }
  }, [convos, currentConvId, handleNew]);

  // Pin toggle
  const handlePin = useCallback((id: string) => {
    const updated = convos.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c);
    setConvos(updated);
    saveConvos(updated);
  }, [convos]);

  // Rename session handlers
  const handleStartEdit = useCallback((e: React.MouseEvent, conv: SavedConversation) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  }, []);

  const handleSaveTitle = useCallback((id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    const updated = convos.map(c => c.id === id ? { ...c, title: editTitle.trim() } : c);
    setConvos(updated);
    saveConvos(updated);
    setEditingId(null);
  }, [convos, editTitle]);

  const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  }, [handleSaveTitle]);

  // Toggle Cron Job Pause/Active
  const handleToggleCronStatus = useCallback((e: React.MouseEvent, cronId: string) => {
    e.stopPropagation();
    setCronJobs(prev => {
      const updated = prev.map((c): CronJob => {
        if (c.id === cronId) {
          const newStatus: 'active' | 'paused' = c.status === 'paused' ? 'active' : 'paused';
          return { ...c, status: newStatus };
        }
        return c;
      });
      saveCronJobs(updated);
      return updated;
    });
  }, []);

  // Trigger Cron Job Manually
  const handleRunCron = useCallback(async (e: React.MouseEvent, cronId: string) => {
    e.stopPropagation();
    if (runningCronId) return;

    setRunningCronId(cronId);
    setCronJobs(prev => {
      const updated = prev.map((c): CronJob => c.id === cronId ? { ...c, status: 'running' } : c);
      saveCronJobs(updated);
      return updated;
    });

    // Simulate agent run latency
    await new Promise(resolve => setTimeout(resolve, 2000));

    const nowStr = new Date().toISOString();
    const timestamp = Date.now();
    let resultMessage = '';

    if (cronId === 'cron_vuln') {
      resultMessage = `### 🛡️ Cron Run: Daily Vulnerability Auditor (Manual)\nTriggered manually: ${nowStr}\n\nI initiated a manual security scan of package dependencies and port exposures.\n\n**Findings:**\n- **Package Dependencies:** 142 dependencies checked. Clean. No high/critical CVEs.\n- **Network Ports:** Port scanning completed. Verified zero unauthorized open port exposures.\n- **Security Configuration:** Docker base images are verified and clean.\n\n*Status:* **All checks passed.** No critical gaps found.`;
    } else if (cronId === 'cron_aws') {
      resultMessage = `### ☁️ Cron Run: AWS Evidence Intake (Manual)\nTriggered manually: ${nowStr}\n\nI initiated a manual sync with the AWS API endpoints to audit resources.\n\n**Findings:**\n- **S3 Buckets:** 12 buckets audited. Default encryption and public access blocks are verified active.\n- **CloudTrail:** Logging status is active. Logs are streaming to target S3 bucket with MFA delete.\n- **IAM Users:** Checked 18 active users. All active keys rotated in the last 90 days.\n\n*Status:* **Evidence collection updated in the Audit Hub.**`;
    } else if (cronId === 'cron_soc2') {
      resultMessage = `### 📊 Cron Run: SOC2 Gap Assessment (Manual)\nTriggered manually: ${nowStr}\n\nI performed a manual gap analysis against SOC2 Trust Services Criteria.\n\n**Findings:**\n- **Readiness Score:** **84%**\n- **Completed Controls:** 42 / 50\n- **Pending Evidence:** 8 items remaining.\n- **Status:** Vulnerability scan evidence successfully verified. Access review logs are still outstanding.\n\n*Status:* **No new gaps identified.**`;
    }

    const newUserMsg: ChatMessage = {
      id: `msg_user_run_${Date.now()}`,
      role: 'user',
      content: `Trigger manual execution of "${cronJobs.find(c => c.id === cronId)?.name}"`,
      timestamp: timestamp - 1000
    };

    const newAgentMsg: ChatMessage = {
      id: `msg_agent_run_${Date.now()}`,
      role: 'agent',
      content: resultMessage,
      timestamp
    };

    setCronJobs(prev => {
      const updated = prev.map((c): CronJob => {
        if (c.id === cronId) {
          return {
            ...c,
            status: 'active',
            lastRun: 'Just now',
            messages: [...c.messages, newUserMsg, newAgentMsg]
          };
        }
        return c;
      });
      saveCronJobs(updated);
      return updated;
    });

    setRunningCronId(null);

    // If this cron job is currently selected, append messages live
    if (currentConvIdRef.current === cronId) {
      setMessages(prev => [...prev, newUserMsg, newAgentMsg]);
    }
  }, [cronJobs, runningCronId, setMessages]);

  // Sidebar grouping & filtering
  const pinnedConvos = convos.filter(c => c.pinned);
  const recentConvos = convos.filter(c => !c.pinned);
  
  const groupedRecent = groupByDate(recentConvos);

  const filteredPinned = searchQ
    ? pinnedConvos.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase()))
    : pinnedConvos;

  const filteredGroups = searchQ
    ? groupedRecent.map(g => ({ ...g, items: g.items.filter(c => c.title.toLowerCase().includes(searchQ.toLowerCase())) })).filter(g => g.items.length > 0)
    : groupedRecent;

  const filteredCronJobs = searchQ
    ? cronJobs.filter(c => c.name.toLowerCase().includes(searchQ.toLowerCase()))
    : cronJobs;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <div className={`${sidebarOpen ? 'w-72 border-r' : 'w-0'} transition-all duration-200 bg-muted/20 flex flex-col overflow-hidden shrink-0`}>
        <div className="flex flex-col h-full">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search sessions…"
                className="w-full h-9 rounded-lg border bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* New chat button */}
          <div className="px-3 pt-3 pb-2">
            <button onClick={handleNew} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-muted-foreground/30 hover:border-primary/50 hover:bg-accent/50 text-xs font-semibold text-muted-foreground hover:text-primary transition-all">
              <Plus size={14} /> New Chat
            </button>
          </div>

          {/* Sidebar Sections */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-4">
            
            {/* 1. Pinned Sessions */}
            {filteredPinned.length > 0 && (
              <div className="space-y-1">
                <button 
                  onClick={() => setPinnedExpanded(!pinnedExpanded)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 rounded transition-colors text-left"
                >
                  {pinnedExpanded ? <ChevronDown size={11} className="text-muted-foreground/50" /> : <ChevronRight size={11} className="text-muted-foreground/50" />}
                  <Pin size={11} className="text-amber-500 fill-current" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Pinned Sessions</span>
                  <span className="text-[10px] text-muted-foreground/30 ml-auto">{filteredPinned.length}</span>
                </button>

                {pinnedExpanded && (
                  <div className="space-y-0.5 pl-1.5">
                    {filteredPinned.map(conv => (
                      <div
                        key={conv.id}
                        onClick={() => handleLoad(conv)}
                        className={`group relative flex items-start gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-accent/60 ${conv.id === currentConvId ? 'bg-accent border border-primary/20 shadow-sm' : 'border border-transparent'}`}
                      >
                        <MessageSquare size={13} className="mt-0.5 text-amber-500/80 shrink-0" />
                        <div className="min-w-0 flex-1">
                          {editingId === conv.id ? (
                            <input
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => handleEditKeyDown(e, conv.id)}
                              onBlur={() => handleSaveTitle(conv.id)}
                              className="w-full text-xs bg-background border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <>
                              <p 
                                className="text-xs font-medium truncate text-foreground/80" 
                                onDoubleClick={(e) => handleStartEdit(e, conv)}
                              >
                                {conv.title}
                              </p>
                              <p className="text-[9px] text-muted-foreground/40">
                                {conv.message_count} msgs
                              </p>
                            </>
                          )}
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={e => handleStartEdit(e, conv)} className="p-0.5 rounded hover:bg-background text-muted-foreground/50 hover:text-foreground" title="Rename">
                            <Pencil size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handlePin(conv.id); }} className="p-0.5 rounded hover:bg-background text-amber-500" title="Unpin">
                            <PinOff size={11} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(conv.id); }} className="p-0.5 rounded hover:bg-background text-muted-foreground/50 hover:text-destructive" title="Delete">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 2. Cron Jobs / Autopilot */}
            {filteredCronJobs.length > 0 && (
              <div className="space-y-1">
                <button 
                  onClick={() => setCronExpanded(!cronExpanded)}
                  className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 rounded transition-colors text-left"
                >
                  {cronExpanded ? <ChevronDown size={11} className="text-muted-foreground/50" /> : <ChevronRight size={11} className="text-muted-foreground/50" />}
                  <Cpu size={11} className="text-primary" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Cron Jobs & Autopilot</span>
                  <span className="text-[10px] text-muted-foreground/30 ml-auto">{filteredCronJobs.length}</span>
                </button>

                {cronExpanded && (
                  <div className="space-y-1.5 pl-1.5 pt-0.5">
                    {filteredCronJobs.map(cron => {
                      const isSelected = cron.id === currentConvId;
                      const isRunning = cron.status === 'running';
                      const isPaused = cron.status === 'paused';

                      return (
                        <div
                          key={cron.id}
                          onClick={() => handleLoadCron(cron)}
                          className={`group relative flex flex-col gap-1 p-2.5 rounded-lg cursor-pointer transition-all border hover:bg-accent/60 ${
                            isSelected 
                              ? 'bg-accent/50 border-primary/20 shadow-sm' 
                              : 'border-transparent hover:border-muted-foreground/10'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {cron.id === 'cron_vuln' && <ShieldCheck size={13} className="text-emerald-500 shrink-0" />}
                            {cron.id === 'cron_aws' && <Activity size={13} className="text-sky-500 shrink-0" />}
                            {cron.id === 'cron_soc2' && <Cpu size={13} className="text-indigo-500 shrink-0" />}
                            
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold truncate text-foreground/80">{cron.name}</p>
                            </div>

                            {/* Ping Indicator */}
                            <div className="flex items-center shrink-0">
                              {isRunning ? (
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
                                </span>
                              ) : isPaused ? (
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500/80"></span>
                              ) : (
                                <span className="flex h-1.5 w-1.5 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[9px] text-muted-foreground/50">
                            <span className="font-mono bg-muted/60 px-1 py-0.5 rounded text-[8px]">{cron.schedule}</span>
                            <span>{cron.lastRun === 'Just now' ? 'Just now' : `${cron.lastRun}`}</span>
                          </div>

                          {/* Collapsible Action Footer */}
                          <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-16 group-hover:opacity-100 transition-all duration-300 ease-out border-t border-muted-foreground/5 mt-1.5 pt-1.5 flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground/40 italic truncate max-w-[100px]">
                              {isPaused ? 'Schedule paused' : 'Schedule active'}
                            </span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={(e) => handleToggleCronStatus(e, cron.id)}
                                className="p-0.5 px-1.5 rounded bg-background border hover:bg-accent text-muted-foreground hover:text-foreground text-[8px] font-semibold transition-all flex items-center gap-0.5"
                                title={isPaused ? 'Resume job' : 'Pause job'}
                              >
                                {isPaused ? <Play size={7} className="fill-current text-emerald-500" /> : <Pause size={7} className="fill-current text-amber-500" />}
                                {isPaused ? 'Resume' : 'Pause'}
                              </button>
                              <button
                                onClick={(e) => handleRunCron(e, cron.id)}
                                disabled={isRunning}
                                className="p-0.5 px-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/95 disabled:opacity-50 text-[8px] font-bold transition-all flex items-center gap-0.5"
                                title="Run manually now"
                              >
                                {isRunning ? (
                                  <Loader size={7} className="animate-spin text-current" />
                                ) : (
                                  <Zap size={7} className="fill-current text-amber-300" />
                                )}
                                Run
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. Conversations */}
            <div className="space-y-1">
              <button 
                onClick={() => setConvosExpanded(!convosExpanded)}
                className="w-full flex items-center gap-1.5 px-2 py-1 hover:bg-accent/40 rounded transition-colors text-left"
              >
                {convosExpanded ? <ChevronDown size={11} className="text-muted-foreground/50" /> : <ChevronRight size={11} className="text-muted-foreground/50" />}
                <MessageSquare size={11} className="text-muted-foreground/60" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Conversations</span>
                <span className="text-[10px] text-muted-foreground/30 ml-auto">
                  {searchQ ? filteredGroups.reduce((acc, g) => acc + g.items.length, 0) : recentConvos.length}
                </span>
              </button>

              {convosExpanded && (
                <div className="space-y-3 pl-1.5 pt-0.5">
                  {filteredGroups.length === 0 ? (
                    <p className="text-[10px] text-center text-muted-foreground/40 py-8">
                      {searchQ ? 'No matching chats' : 'No saved conversations'}
                    </p>
                  ) : filteredGroups.map(group => (
                    <div key={group.label} className="space-y-0.5">
                      <div className="px-2 py-0.5 flex items-center justify-between">
                        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground/40">{group.label}</span>
                      </div>
                      
                      {group.items.map(conv => (
                        <div
                          key={conv.id}
                          onClick={() => handleLoad(conv)}
                          className={`group relative flex items-start gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-all hover:bg-accent/60 ${conv.id === currentConvId ? 'bg-accent border border-primary/20 shadow-sm' : 'border border-transparent'}`}
                        >
                          <MessageSquare size={13} className="mt-0.5 text-muted-foreground/40 shrink-0" />
                          <div className="min-w-0 flex-1">
                            {editingId === conv.id ? (
                              <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                onKeyDown={e => handleEditKeyDown(e, conv.id)}
                                onBlur={() => handleSaveTitle(conv.id)}
                                className="w-full text-xs bg-background border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                                onClick={e => e.stopPropagation()}
                              />
                            ) : (
                              <>
                                <p 
                                  className="text-xs font-medium truncate text-foreground/80" 
                                  onDoubleClick={(e) => handleStartEdit(e, conv)}
                                >
                                  {conv.title}
                                </p>
                                <p className="text-[9px] text-muted-foreground/40">
                                  {conv.message_count} msgs
                                </p>
                              </>
                            )}
                          </div>
                          <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={e => handleStartEdit(e, conv)} className="p-0.5 rounded hover:bg-background text-muted-foreground/50 hover:text-foreground" title="Rename">
                              <Pencil size={11} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handlePin(conv.id); }} className="p-0.5 rounded hover:bg-background text-muted-foreground/50 hover:text-amber-500" title="Pin">
                              <Pin size={11} />
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleDelete(conv.id); }} className="p-0.5 rounded hover:bg-background text-muted-foreground/50 hover:text-destructive" title="Delete">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ── Main Chat Area ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1.5 rounded-md hover:bg-accent text-muted-foreground" title="Toggle sidebar">
              {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
            </button>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bot size={18} className="text-primary" />
                Compliance Agent
              </h2>
              <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5">
                <span>
                  Hermes-native · {
                    currentConvId?.startsWith('cron_') 
                      ? `Cron Job active: ${cronJobs.find(c => c.id === currentConvId)?.name}` 
                      : currentConvId ? 'Active session' : 'New session'
                  }
                </span>
                {saveStatus === 'saving' && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-muted-foreground/40 font-medium bg-muted px-1.5 py-0.5 rounded animate-pulse">
                    <Loader size={8} className="animate-spin text-primary" /> Saving...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-emerald-500 font-semibold bg-emerald-500/5 border border-emerald-500/10 px-1.5 py-0.5 rounded transition-all duration-300">
                    <Check size={8} className="text-emerald-500" /> Saved
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleNew} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border hover:bg-accent transition-colors bg-background">
              <Plus size={13} /> New Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Bot size={48} className="text-muted-foreground/30 mb-4 animate-bounce duration-1000" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Ask me anything</h3>
              <p className="text-sm text-muted-foreground/60 max-w-md">I can help with compliance gaps, evidence status, risk summaries, framework readiness, and more.</p>
              <div className="flex flex-wrap gap-2 mt-8 justify-center max-w-lg">
                {(suggestedQuestions.length > 0 ? suggestedQuestions : ['How many risks?', 'List my clients', 'Show vendors', 'What are the top risks?']).map((q, i) => (
                  <button key={i} onClick={() => { setInput(''); sendMessage(typeof q === 'string' ? q : ''); }} className="px-3 py-1.5 text-xs rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors">{q}</button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble key={msg.id || idx} message={msg} isLoading={isLoading && idx === messages.length - 1} />
            ))
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <span>{error}</span>
              <button onClick={() => clearChat()} className="ml-auto text-xs underline">Dismiss</button>
            </div>
          )}

          <div ref={endRef} />
        </div>


        {/* Compliance copilot quick actions */}
        <ComplianceCopilotSection />
        {/* Input */}
        <div className="border-t px-6 py-4 bg-background">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              className="flex-1 min-h-[44px] max-h-[160px] rounded-xl border bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder={currentConvId?.startsWith('cron_') ? "Ask a question about this cron job run..." : "Ask a compliance question..."}
              value={input}
              onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`; }}
              onKeyDown={handleKey}
              rows={1}
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={!input.trim() || isLoading} className="h-[44px] w-[44px] flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0 shadow-sm">
              {isLoading ? <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <SendHorizontal size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ────────────────────────────────────────────────────────────────

function MessageBubble({ message, isLoading }: { message: ChatMessage; isLoading: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] lg:max-w-[65%]`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${isUser ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted border rounded-bl-sm'} ${isLoading && !isUser ? 'animate-pulse' : ''}`}>
          {message.content ? <FormattedText text={message.content} /> : isLoading ? <span className="text-muted-foreground/60 italic">Thinking…</span> : <span className="text-muted-foreground/60 italic">Empty response</span>}
        </div>
        <p className={`text-[10px] text-muted-foreground/50 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>{new Date(message.timestamp).toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

// ── Formatted Text ────────────────────────────────────────────────────────────────

function FormattedText({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inList = false;

  lines.forEach((line, i) => {
    const t = line.trim();
    if (t.startsWith('## ')) { elements.push(<h2 key={i} className="text-base font-bold mt-3 mb-1">{t.slice(3)}</h2>); return; }
    if (t.startsWith('# ')) { elements.push(<h1 key={i} className="text-lg font-bold mt-3 mb-1">{t.slice(2)}</h1>); return; }
    if (/^[-*_]{3,}$/.test(t)) { elements.push(<hr key={i} className="my-2 border-muted-foreground/20" />); return; }
    if (t.startsWith('```')) { elements.push(<code key={i} className="block bg-black/10 dark:bg-white/10 rounded p-2 my-1 text-xs font-mono whitespace-pre">{t.replace(/```/g, '')}</code>); return; }

    const fmt = formatInline(t);

    if (t.startsWith('- ') || t.startsWith('* ')) {
      if (!inList) { inList = true; elements.push(<ul key={`ul-${i}`} className="list-disc pl-5 my-1 space-y-0.5" />); }
      elements.push(<li key={i} className="text-sm">{formatInline(t.slice(2))}</li>); return;
    }
    if (/^\d+[.)]\s/.test(t)) {
      if (!inList) { inList = true; elements.push(<ol key={`ol-${i}`} className="list-decimal pl-5 my-1 space-y-0.5" />); }
      elements.push(<li key={i} className="text-sm">{formatInline(t.replace(/^\d+[.)]\s/, ''))}</li>); return;
    }
    if (inList) inList = false;
    if (!t) { elements.push(<div key={i} className="h-2" />); return; }
    elements.push(<p key={i} className="text-sm leading-relaxed">{fmt}</p>);
  });
  return <>{elements}</>;
}

// Inline formatting helper
function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    const codeParts = part.split(/(\={`[^`]+`)/g);
    return codeParts.map((cp, j) => {
      if (cp.startsWith('`') && cp.endsWith('`')) return <code key={`${i}-${j}`} className="bg-black/10 dark:bg-white/10 rounded px-1 text-xs font-mono">{cp.slice(1, -1)}</code>;
      return cp;
    });
  });
}
// -----------------------------------------------------------------------------
// Compliance Copilot (cycle 14 - scorecard #10: auto-map / suggest evidence /
// draft policies). Token-only, UI-STANDARD sec.16 graceful EmptyState pattern.
// -----------------------------------------------------------------------------

function ComplianceCopilotSection() {
  const [open, setOpen] = useState(true);
  const status = useAiCopilotStatus();
  const live = status.data?.available === true;

  return (
    <div className="border-t px-6 py-3 bg-background">
      <div className="flex items-center gap-2 max-w-4xl mx-auto">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-left"
        >
          <Sparkles size={14} className="text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Compliance copilot
          </span>
          {live ? (
            <Badge variant="info">builtin</Badge>
          ) : status.isLoading ? (
            <Badge variant="outline">checking...</Badge>
          ) : (
            <Badge variant="outline">awaiting API</Badge>
          )}
          {open ? <ChevronDown size={13} className="text-muted-foreground/60" /> : <ChevronRight size={13} className="text-muted-foreground/60" />}
        </button>
        <span className="text-[10px] text-muted-foreground/60">
          Auto-map, evidence suggestions &amp; policy drafts - generated in-app (builtin)
        </span>
      </div>

      {open && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 max-w-4xl mx-auto">
          <DraftPolicyCard />
          <SuggestEvidenceCard />
          <AutoMapCard />
        </div>
      )}
    </div>
  );
}

function CopilotCard({
  icon: Icon,
  title,
  description,
  expanded,
  onToggle,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3.5 flex flex-col gap-2.5">
      <button onClick={onToggle} className="flex items-start gap-2.5 text-left group">
        <span className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted text-muted-foreground">
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-foreground">{title}</span>
          <span className="block text-[10px] text-muted-foreground leading-snug">{description}</span>
        </span>
        {expanded ? (
          <ChevronDown size={13} className="shrink-0 mt-0.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronRight size={13} className="shrink-0 mt-0.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
        )}
      </button>
      {expanded && <div className="space-y-2.5">{children}</div>}
    </div>
  );
}

function DraftPolicyCard() {
  const [expanded, setExpanded] = useState(false);
  const [topic, setTopic] = useState('');
  const [framework, setFramework] = useState('');
  const [result, setResult] = useState<AiCopilotDraftPolicy | null>(null);
  const mutation = useAiCopilotDraftPolicy();

  const submit = () => {
    if (!topic.trim() || mutation.isPending) return;
    setResult(null);
    mutation.mutate(
      { topic: topic.trim(), framework: framework.trim() || undefined },
      { onSuccess: (data) => setResult(data) }
    );
  };

  const notLive = mutation.isError && !mutation.isPending;

  return (
    <CopilotCard
      icon={FileText}
      title="Draft policy"
      description="Generate a policy skeleton from a topic."
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {result ? (
        <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground leading-snug">{result.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Review cadence: {result.reviewCadence || '-'}</p>
            </div>
            <button onClick={() => setResult(null)} title="Clear result" aria-label="Clear result" className="shrink-0 text-muted-foreground/60 hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{result.purpose}</p>
          {(result.sections ?? []).slice(0, 3).map((s, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-[11px] font-semibold text-foreground">{s.heading}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{s.body}</p>
            </div>
          ))}
          {(result.controls ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1">
              {(result.controls ?? []).slice(0, 6).map((c) => (
                <Badge key={c.code} variant="outline" className="text-[9px] px-1.5 py-0">{c.code}</Badge>
              ))}
              {(result.controls ?? []).length > 6 && (
                <span className="text-[9px] text-muted-foreground/70 self-center">+{(result.controls ?? []).length - 6} more</span>
              )}
            </div>
          )}
          {result.disclaimer && <p className="text-[9px] text-muted-foreground/70 italic">{result.disclaimer}</p>}
        </div>
      ) : notLive ? (
        <EmptyState
          icon={Sparkles}
          title="Connect the aiCopilot.draftPolicy API"
          description="This quick action becomes live once the tRPC procedure is wired into the router."
          className="p-4"
        />
      ) : mutation.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="copilot-draft-topic" className="text-[10px] font-medium text-muted-foreground">Topic</Label>
            <Input id="copilot-draft-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Access control" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="copilot-draft-framework" className="text-[10px] font-medium text-muted-foreground">Framework (optional)</Label>
            <Input id="copilot-draft-framework" value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="e.g. SOC 2, ISO 27001" className="h-8 text-xs" />
          </div>
          <Button variant="default" size="sm" onClick={submit} disabled={!topic.trim() || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader size={12} className="animate-spin" />}
            Draft policy
          </Button>
        </div>
      )}
    </CopilotCard>
  );
}

function SuggestEvidenceCard() {
  const [expanded, setExpanded] = useState(false);
  const [controlTitle, setControlTitle] = useState('');
  const [framework, setFramework] = useState('');
  const [result, setResult] = useState<AiCopilotEvidenceSuggestion | null>(null);
  const mutation = useAiCopilotSuggestEvidence();

  const submit = () => {
    if (!controlTitle.trim() || mutation.isPending) return;
    setResult(null);
    mutation.mutate(
      { controlTitle: controlTitle.trim(), framework: framework.trim() || undefined },
      { onSuccess: (data) => setResult(data) }
    );
  };

  const notLive = mutation.isError && !mutation.isPending;

  return (
    <CopilotCard
      icon={FileSearch}
      title="Suggest evidence"
      description="Find evidence types for a control."
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {result ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {(result.source ?? 'builtin')} suggestions
            </p>
            <button onClick={() => setResult(null)} title="Clear result" aria-label="Clear result" className="text-muted-foreground/60 hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
          {(result.evidence ?? []).slice(0, 4).map((item) => (
            <div key={item.title} className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-foreground leading-snug">{item.title}</p>
                <Badge variant="info" className="shrink-0 text-[9px] px-1.5 py-0">{item.type || 'evidence'}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{item.description}</p>
              <p className="text-[9px] text-muted-foreground/70">Freshness: {item.freshness || '-'}</p>
            </div>
          ))}
        </div>
      ) : notLive ? (
        <EmptyState
          icon={Sparkles}
          title="Connect the aiCopilot.suggestEvidence API"
          description="This quick action becomes live once the tRPC procedure is wired into the router."
          className="p-4"
        />
      ) : mutation.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="copilot-evidence-control" className="text-[10px] font-medium text-muted-foreground">Control title</Label>
            <Input id="copilot-evidence-control" value={controlTitle} onChange={(e) => setControlTitle(e.target.value)} placeholder="e.g. CC6.1 Logical access" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="copilot-evidence-framework" className="text-[10px] font-medium text-muted-foreground">Framework (optional)</Label>
            <Input id="copilot-evidence-framework" value={framework} onChange={(e) => setFramework(e.target.value)} placeholder="e.g. SOC 2" className="h-8 text-xs" />
          </div>
          <Button variant="default" size="sm" onClick={submit} disabled={!controlTitle.trim() || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader size={12} className="animate-spin" />}
            Suggest evidence
          </Button>
        </div>
      )}
    </CopilotCard>
  );
}

function AutoMapCard() {
  const [expanded, setExpanded] = useState(false);
  const [requirement, setRequirement] = useState('');
  const [frameworks, setFrameworks] = useState('');
  const [result, setResult] = useState<AiCopilotAutoMapResult | null>(null);
  const mutation = useAiCopilotAutoMap();

  const submit = () => {
    if (!requirement.trim() || mutation.isPending) return;
    const list = frameworks.split(',').map((s) => s.trim()).filter(Boolean);
    setResult(null);
    mutation.mutate(
      { requirement: requirement.trim(), frameworks: list.length > 0 ? list : undefined },
      { onSuccess: (data) => setResult(data) }
    );
  };

  const notLive = mutation.isError && !mutation.isPending;
  const matches = result?.matches ?? [];

  return (
    <CopilotCard
      icon={Map}
      title="Auto-map requirement"
      description="Map a requirement to framework controls."
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
    >
      {result ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {matches.length} match{matches.length === 1 ? '' : 'es'}
            </p>
            <button onClick={() => setResult(null)} title="Clear result" aria-label="Clear result" className="text-muted-foreground/60 hover:text-foreground transition-colors">
              <X size={13} />
            </button>
          </div>
          {result.bestMatch && (
            <div className="rounded-lg border border-border bg-muted/40 p-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-foreground leading-snug">{result.bestMatch.framework} | {result.bestMatch.controlId}</p>
                <Badge variant="success" className="shrink-0 text-[9px] px-1.5 py-0">{formatCopilotScore(result.bestMatch.score)}</Badge>
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{result.bestMatch.controlTitle}</p>
              <p className="text-[9px] text-muted-foreground/70">{result.bestMatch.rationale}</p>
            </div>
          )}
          {matches.slice(0, 3).map((m) => (
            <div key={`${m.framework}-${m.controlId}`} className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5">
              <p className="text-[10px] text-foreground truncate">{m.framework} | {m.controlId} | {m.controlTitle}</p>
              <Badge variant="outline" className="shrink-0 text-[9px] px-1.5 py-0">{formatCopilotScore(m.score)}</Badge>
            </div>
          ))}
        </div>
      ) : notLive ? (
        <EmptyState
          icon={Sparkles}
          title="Connect the aiCopilot.autoMap API"
          description="This quick action becomes live once the tRPC procedure is wired into the router."
          className="p-4"
        />
      ) : mutation.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label htmlFor="copilot-map-requirement" className="text-[10px] font-medium text-muted-foreground">Requirement</Label>
            <Input id="copilot-map-requirement" value={requirement} onChange={(e) => setRequirement(e.target.value)} placeholder="e.g. Encrypt data at rest" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="copilot-map-frameworks" className="text-[10px] font-medium text-muted-foreground">Frameworks (optional, comma-separated)</Label>
            <Input id="copilot-map-frameworks" value={frameworks} onChange={(e) => setFrameworks(e.target.value)} placeholder="e.g. SOC 2, ISO 27001" className="h-8 text-xs" />
          </div>
          <Button variant="default" size="sm" onClick={submit} disabled={!requirement.trim() || mutation.isPending} className="w-full">
            {mutation.isPending && <Loader size={12} className="animate-spin" />}
            Auto-map
          </Button>
        </div>
      )}
    </CopilotCard>
  );
}

function formatCopilotScore(score?: number): string {
  if (typeof score !== 'number' || Number.isNaN(score)) return '-';
  if (score <= 1) return `${Math.round(score * 100)}%`;
  return `${Math.round(score)}%`;
}
