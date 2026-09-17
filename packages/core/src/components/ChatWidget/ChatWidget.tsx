import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SendHorizontal, Trash2, Bot } from 'lucide-react';
import { ChatBubble } from './ChatBubble';
import { ChatMessage } from './ChatMessage';
import { useAgentChat } from '../../hooks/useAgentChat';
import './chat-widget.css';

/**
 * Quick-action chips shown above the input.
 */
const QUICK_ACTIONS = [
  { label: 'Show NIS2 gaps', prompt: 'Show NIS2 gaps' },
  { label: 'Scan for evidence', prompt: 'Scan for evidence' },
  { label: 'Generate report', prompt: 'Generate report' },
] as const;

/**
 * ChatWidget — Floating chat interface for the ComplianceOS agent.
 *
 * Features:
 * - Floating bubble button (bottom-right, fixed position)
 * - Expands to a 380px × 500px panel
 * - Message input with send
 * - Quick-action chips: "Show NIS2 gaps", "Scan for evidence", "Generate report"
 * - SSE streaming agent responses via useAgentChat
 * - Dark mode support via CSS variables
 * - Responsive: full-screen on mobile (<640px)
 */
export function ChatWidget() {
  const { messages, sendMessage, isLoading, error, clearChat } =
    useAgentChat();

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [badgeCount, setBadgeCount] = useState(0);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevMessagesLenRef = useRef(messages.length);

  // ── Auto-scroll to bottom when new messages arrive ───────────────────────
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // ── Badge tracking: count new agent messages while panel is closed ───────
  useEffect(() => {
    if (!isOpen && messages.length > prevMessagesLenRef.current) {
      const newMsgs = messages.slice(prevMessagesLenRef.current);
      const agentNewCount = newMsgs.filter((m) => m.role === 'agent' && m.content).length;
      if (agentNewCount > 0) {
        setBadgeCount((c) => c + agentNewCount);
        setHasNewMessage(true);
      }
    }
    prevMessagesLenRef.current = messages.length;
  }, [messages, isOpen]);

  // ── Reset badge when panel opens ─────────────────────────────────────────
  const handleToggle = useCallback(() => {
    setIsOpen((o) => {
      if (!o) {
        // Opening: reset badge and new-message indicator
        setBadgeCount(0);
        setHasNewMessage(false);
      }
      return !o;
    });
  }, []);

  // ── Send message ─────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;

    setInputValue('');
    sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  // ── Handle Enter to send (Shift+Enter for newline) ──────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // ── Handle quick action chip click ──────────────────────────────────────
  const handleQuickAction = useCallback(
    (prompt: string) => {
      setInputValue(prompt);
      // Auto-send after brief delay so the input fills first
      setTimeout(() => {
        sendMessage(prompt);
      }, 50);
    },
    [sendMessage],
  );

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputValue(e.target.value);
      // Auto-resize
      const el = e.target;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
    },
    [],
  );

  // ── Focus input when panel opens ─────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  return (
    <div className="chat-widget-container">
      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="chat-panel">
          {/* Header */}
          <div className="chat-header">
            <span className="chat-header-title">
              <Bot size={16} />
              Compliance Agent
            </span>
            <div className="chat-header-actions">
              <button
                className="chat-header-btn"
                onClick={clearChat}
                title="Clear conversation"
                aria-label="Clear conversation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="chat-error-banner">
              <span>⚠ {error}</span>
              <button onClick={() => clearChat()}>Dismiss</button>
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              <div className="chat-messages-empty">
                <div className="chat-messages-empty-icon">
                  <Bot size={40} />
                </div>
                <div className="chat-messages-empty-text">
                  Ask me anything about your compliance posture —
                  gaps, evidence, reports, and more.
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isLastAgent = msg.role === 'agent' &&
                  msg === messages[messages.length - 1];
                return (
                  <ChatMessage
                    key={msg.id}
                    message={msg}
                    isLoading={isLastAgent ? isLoading : false}
                  />
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick action chips */}
          <div className="chat-quick-chips">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                className="chat-quick-chip"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isLoading}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <div className="chat-input-area">
            <textarea
              ref={inputRef}
              className="chat-input"
              placeholder="Ask a compliance question…"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isLoading}
              aria-label="Chat input"
            />
            <button
              className="chat-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              aria-label="Send message"
            >
              <SendHorizontal size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Bubble Button ────────────────────────────────────────────────── */}
      <ChatBubble
        isOpen={isOpen}
        badgeCount={badgeCount}
        hasNewMessage={hasNewMessage}
        onClick={handleToggle}
      />
    </div>
  );
}
