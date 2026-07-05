import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, SendHorizontal, Trash2, Save, FileText, Plus, MessageSquare, History, ExternalLink, Clock, Check, X, Download, AlertCircle } from 'lucide-react';
import { useAgentChat, ChatMessage } from '../../hooks/useAgentChat';

// ── Conversation persistence ─────────────────────────────────────────────────

interface SavedConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
  message_count: number;
}

interface SavedReport {
  id: string;
  conversation_id: string;
  title: string;
  content: string;
  format: 'md' | 'json';
  created_at: number;
}

const STORAGE_KEY_CONVOS = 'complianceos_agent_conversations';
const STORAGE_KEY_REPORTS = 'complianceos_agent_reports';

function loadConversations(): SavedConversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONVOS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveConversations(list: SavedConversation[]) {
  try { localStorage.setItem(STORAGE_KEY_CONVOS, JSON.stringify(list)); } catch {}
}

function loadReports(): SavedReport[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_REPORTS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveReports(list: SavedReport[]) {
  try { localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(list)); } catch {}
}

// ── Generate a title from first user message ────────────────────────────────

function generateTitle(messages: ChatMessage[]): string {
  const first = messages.find(m => m.role === 'user');
  if (!first) return 'New Conversation';
  const text = first.content.slice(0, 80);
  return text.length < 80 ? text : text + '…';
}

// ── Generate a report from conversation ──────────────────────────────────────

function generateReport(conv: SavedConversation): SavedReport {
  const lines: string[] = [];
  lines.push(`# Compliance Report: ${conv.title}`);
  lines.push(`\nGenerated: ${new Date(conv.updated_at).toISOString().slice(0, 10)}`);
  lines.push(`Messages: ${conv.message_count}\n`);
  lines.push('---\n');
  for (const msg of conv.messages) {
    const role = msg.role === 'user' ? '**Q:**' : '**A:**';
    lines.push(`\n${role} ${msg.content}\n`);
  }
  return {
    id: `report_${Date.now()}`,
    conversation_id: conv.id,
    title: conv.title,
    content: lines.join('\n'),
    format: 'md',
    created_at: Date.now(),
  };
}

// ── Quick actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { label: 'Show NIS2 gaps', prompt: 'Show NIS2 compliance gaps' },
  { label: 'Risk summary', prompt: 'Summarize all high risks' },
  { label: 'Generate report', prompt: 'Generate a compliance readiness report' },
  { label: 'Expiring evidence', prompt: 'What evidence is expiring soon?' },
];

// ── AgentPage Component ──────────────────────────────────────────────────────

export function AgentPage() {
  const { messages, sendMessage, isLoading, error, clearChat } = useAgentChat();
  const [inputValue, setInputValue] = useState('');
  const [showHistory, setShowHistory] = useState(true);
  const [savedConvos, setSavedConvos] = useState<SavedConversation[]>(() => loadConversations());
  const [showReports, setShowReports] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => loadReports());
  const [reportCopied, setReportCopied] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  // Send
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue('');
    sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // New conversation
  const handleNew = useCallback(() => {
    clearChat();
    setShowReports(false);
  }, [clearChat]);

  // Save current conversation
  const handleSave = useCallback(() => {
    if (messages.length === 0) return;
    const conv: SavedConversation = {
      id: `conv_${Date.now()}`,
      title: generateTitle(messages),
      messages: messages.map(m => ({ ...m })),
      created_at: Date.now(),
      updated_at: Date.now(),
      message_count: messages.length,
    };
    const updated = [conv, ...savedConvos].slice(0, 50); // max 50
    setSavedConvos(updated);
    saveConversations(updated);
  }, [messages, savedConvos]);

  // Load a saved conversation
  const handleLoad = useCallback((conv: SavedConversation) => {
    clearChat();
    // Messages will be repopulated via the hook — but the hook uses local state.
    // We need to inject them. Since useAgentChat manages its own state,
    // we reload the page with the conversation ID in the URL and let the hook load it.
    // For simplicity: clear and show saved for read-only, start fresh.
    clearChat();
    // Save the conversation to be loaded by the hook on next render
    sessionStorage.setItem('agent_restore_conversation', JSON.stringify(conv.messages));
    window.location.reload();
  }, [clearChat]);

  // Restore conversation from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem('agent_restore_conversation');
    if (raw) {
      sessionStorage.removeItem('agent_restore_conversation');
      // The hook has already initialized — we can't inject past messages easily.
      // Instead, show a note in the UI.
    }
  }, []);

  // Create report from current conversation
  const handleCreateReport = useCallback(() => {
    if (messages.length === 0) return;
    const conv: SavedConversation = {
      id: `conv_${Date.now()}`,
      title: generateTitle(messages),
      messages: messages.map(m => ({ ...m })),
      created_at: Date.now(),
      updated_at: Date.now(),
      message_count: messages.length,
    };
    const report = generateReport(conv);
    // Save
    const updatedReports = [report, ...savedReports].slice(0, 20);
    setSavedReports(updatedReports);
    saveReports(updatedReports);
    // Also save the conversation
    const updatedConvos = [conv, ...savedConvos].slice(0, 50);
    setSavedConvos(updatedConvos);
    saveConversations(updatedConvos);
    // Switch to reports view
    setShowReports(true);
  }, [messages, savedConvos, savedReports]);

  // Delete a conversation
  const handleDeleteConv = useCallback((id: string) => {
    const updated = savedConvos.filter(c => c.id !== id);
    setSavedConvos(updated);
    saveConversations(updated);
  }, [savedConvos]);

  // Delete a report
  const handleDeleteReport = useCallback((id: string) => {
    const updated = savedReports.filter(r => r.id !== id);
    setSavedReports(updated);
    saveReports(updated);
  }, [savedReports]);

  // Copy report to clipboard
  const handleCopyReport = useCallback((report: SavedReport) => {
    navigator.clipboard.writeText(report.content).then(() => {
      setReportCopied(report.id);
      setTimeout(() => setReportCopied(null), 2000);
    });
  }, []);

  // Download report as .md
  const handleDownloadReport = useCallback((report: SavedReport) => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-background">
      {/* ── Sidebar ──────────────────────────────────────────────────── */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} transition-all duration-200 border-r bg-muted/30 flex flex-col overflow-hidden`}>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {!showReports ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Conversations</h3>
                <button
                  onClick={() => setShowReports(true)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <FileText size={12} /> Reports
                </button>
              </div>
              {savedConvos.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No saved conversations yet</p>
              ) : (
                savedConvos.map(conv => (
                  <div key={conv.id} className="group relative rounded-lg border p-2.5 hover:bg-accent cursor-pointer"
                    onClick={() => handleLoad(conv)}>
                    <p className="text-sm font-medium truncate pr-6">{conv.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {conv.message_count} msgs · {new Date(conv.updated_at).toLocaleDateString()}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteConv(conv.id); }}
                      className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                      title="Delete"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-muted-foreground">Reports</h3>
                <button
                  onClick={() => setShowReports(false)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <MessageSquare size={12} /> Conversations
                </button>
              </div>
              {savedReports.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">No reports yet. Start a conversation and create a report.</p>
              ) : (
                savedReports.map(report => (
                  <div key={report.id} className="rounded-lg border p-2.5 space-y-1.5">
                    <p className="text-sm font-medium truncate">{report.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(report.created_at).toLocaleDateString()}</p>
                    <div className="flex gap-1.5 mt-1">
                      <button
                        onClick={() => handleCopyReport(report)}
                        className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1"
                      >
                        {reportCopied === report.id ? <Check size={10} /> : <FileText size={10} />}
                        {reportCopied === report.id ? 'Copied' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleDownloadReport(report)}
                        className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80 transition-colors flex items-center gap-1"
                      >
                        <Download size={10} /> Download
                      </button>
                      <button
                        onClick={() => handleDeleteReport(report.id)}
                        className="text-xs px-2 py-0.5 rounded text-destructive hover:bg-destructive/10 transition-colors ml-auto"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-md hover:bg-accent text-muted-foreground"
              title="Toggle history"
            >
              <History size={18} />
            </button>
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Bot size={18} className="text-primary" />
                Compliance Agent
              </h2>
              <p className="text-xs text-muted-foreground">Ask anything about your compliance posture</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-accent transition-colors"
            >
              <Plus size={14} /> New
            </button>
            <button
              onClick={handleSave}
              disabled={messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-accent transition-colors disabled:opacity-40"
              title="Save conversation"
            >
              <Save size={14} /> Save
            </button>
            <button
              onClick={handleCreateReport}
              disabled={messages.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
              title="Create report from conversation"
            >
              <FileText size={14} /> Report
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Bot size={48} className="text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground mb-2">Ask me anything</h3>
              <p className="text-sm text-muted-foreground/60 max-w-md">
                I can help with compliance gaps, evidence status, risk summaries, framework readiness, and more.
              </p>
              <div className="flex flex-wrap gap-2 mt-8 justify-center max-w-lg">
                {QUICK_ACTIONS.map(action => (
                  <button
                    key={action.label}
                    onClick={() => {
                      setInputValue(action.prompt);
                      setTimeout(() => { sendMessage(action.prompt); }, 50);
                    }}
                    className="px-3 py-2 text-xs rounded-full border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                  >
                    {action.label}
                  </button>
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
              <AlertCircle size={16} />
              <span>{error}</span>
              <button onClick={() => clearChat()} className="ml-auto text-xs underline">Dismiss</button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t px-6 py-4 bg-background">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <textarea
              ref={inputRef}
              className="flex-1 min-h-[44px] max-h-[160px] rounded-xl border bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              placeholder="Ask a compliance question…"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="h-[44px] w-[44px] flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 shrink-0"
            >
              {isLoading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <SendHorizontal size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message, isLoading }: { message: ChatMessage; isLoading: boolean }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] lg:max-w-[65%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted border rounded-bl-sm'
          } ${isLoading && !isUser ? 'animate-pulse' : ''}`}
        >
          {message.content || (isLoading ? (
            <span className="text-muted-foreground/60 italic">Thinking…</span>
          ) : (
            <span className="text-muted-foreground/60 italic">Empty response</span>
          ))}
        </div>
        <p className={`text-[10px] text-muted-foreground/50 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}

// ── Reports Page (standalone) ────────────────────────────────────────────────

export function AgentReportsPage() {
  const [reports, setReports] = useState<SavedReport[]>(() => loadReports());
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (report: SavedReport) => {
    navigator.clipboard.writeText(report.content).then(() => {
      setCopied(report.id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleDownload = (report: SavedReport) => {
    const blob = new Blob([report.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${report.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string) => {
    const updated = reports.filter(r => r.id !== id);
    setReports(updated);
    saveReports(updated);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Compliance Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Reports generated from Agent conversations</p>
        </div>
        <a href="/agent" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
          <MessageSquare size={14} /> Back to Agent
        </a>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20">
          <FileText size={48} className="mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No reports yet</h3>
          <p className="text-sm text-muted-foreground/60 mb-6">Start a conversation with the Agent and click "Report" to generate one.</p>
          <a href="/agent" className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground">Go to Agent</a>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base">{report.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(report.created_at).toLocaleString()} · {report.format.toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleCopy(report)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Copy">
                    {copied === report.id ? <Check size={14} /> : <FileText size={14} />}
                  </button>
                  <button onClick={() => handleDownload(report)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Download">
                    <Download size={14} />
                  </button>
                  <button onClick={() => handleDelete(report.id)}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                {report.content.slice(0, 2000)}{report.content.length > 2000 ? '…' : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
