import React, { useCallback } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../hooks/useAgentChat';

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

/**
 * Simple markdown renderer for basic formatting.
 * Supports: **bold**, newlines → <br>, code blocks, inline code, lists.
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const remaining = text;
  let key = 0;

  // Process code blocks first (fenced ```...```)
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(remaining)) !== null) {
    // Push text before this code block
    if (match.index > lastIndex) {
      parts.push(
        ...renderInlineMarkdown(remaining.slice(lastIndex, match.index), key++),
      );
    }

    const lang = match[1] || '';
    const code = match[2] || '';

    parts.push(
      <CodeBlock key={`code-${key++}`} code={code} language={lang} />,
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  if (lastIndex < remaining.length) {
    parts.push(...renderInlineMarkdown(remaining.slice(lastIndex), key++));
  }

  return parts;
}

function renderInlineMarkdown(text: string, baseKey: number): React.ReactNode[] {
  // Split by double newlines to create paragraph breaks
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, pIdx) => {
    const key = `${baseKey}-p-${pIdx}`;

    if (!para.trim()) {
      return null;
    }

    // Check for list items
    const listLines = para.split('\n');
    if (
      listLines.some(
        (l) => l.match(/^[\s]*[-*+]\s/) || l.match(/^[\s]*\d+[.)]\s/),
      )
    ) {
      const isOrdered = listLines.some((l) => l.match(/^\s*\d+[.)]\s/));
      const items = listLines
        .filter((l) => l.trim())
        .map((l, lIdx) => {
          const content = l
            .replace(/^[\s]*[-*+]\s+/, '')
            .replace(/^\s*\d+[.)]\s+/, '');
          return (
            <li key={`${key}-li-${lIdx}`}>
              {renderInlineFormatting(content, `${key}-li-${lIdx}`)}
            </li>
          );
        });

      return isOrdered ? (
        <ol key={key}>{items}</ol>
      ) : (
        <ul key={key}>{items}</ul>
      );
    }

    // Check for horizontal rule
    if (/^---+\s*$/.test(para.trim())) {
      return <hr key={key} />;
    }

    // Single line break within a paragraph (hard break)
    const inlineElements: React.ReactNode[] = [];
    const lines = para.split('\n');
    lines.forEach((line, lIdx) => {
      if (lIdx > 0) {
        inlineElements.push(<br key={`${key}-br-${lIdx}`} />);
      }
      inlineElements.push(
        ...renderInlineFormatting(line, `${key}-l-${lIdx}`),
      );
    });

    return <p key={key}>{inlineElements}</p>;
  });
}

function renderInlineFormatting(
  text: string,
  baseKey: string,
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`([^`]+)`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = regex.exec(text)) !== null) {
    // Text before match
    if (m.index > lastIdx) {
      parts.push(text.slice(lastIdx, m.index));
    }

    if (m[1]?.startsWith('**')) {
      // Bold
      parts.push(<strong key={`${baseKey}-b-${idx++}`}>{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      // Inline code
      parts.push(
        <code key={`${baseKey}-c-${idx++}`}>{m[3]}</code>,
      );
    }

    lastIdx = regex.lastIndex;
  }

  // Remaining text
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Code block component with a copy button.
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <pre>
      {language && (
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: '10px',
            fontSize: '10px',
            opacity: 0.5,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {language}
        </span>
      )}
      <button
        className="chat-copy-btn"
        onClick={handleCopy}
        title="Copy code"
        aria-label="Copy code to clipboard"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? ' Copied' : ' Copy'}
      </button>
      <code>{code}</code>
    </pre>
  );
}

/**
 * Format a timestamp for display.
 */
function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isToday) return time;

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  }) + ` ${time}`;
}

/**
 * Individual chat message component.
 * Renders user or agent messages with avatars, markdown, and timestamps.
 */
export function ChatMessage({ message, isLoading }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const showLoading = isLoading && isUser === false && !message.content;

  return (
    <div className={`chat-msg ${isUser ? 'chat-msg-user' : 'chat-msg-agent'}`}>
      {/* Avatar */}
      <div
        className={`chat-msg-avatar ${isUser ? 'chat-msg-avatar-user' : 'chat-msg-avatar-agent'}`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message bubble */}
      <div>
        <div className="chat-msg-bubble">
          {showLoading ? (
            <span className="chat-loading-dots">
              <span />
              <span />
              <span />
            </span>
          ) : (
            renderMarkdown(message.content)
          )}
        </div>

        {/* Timestamp (on hover) */}
        {message.timestamp > 0 && message.content && (
          <div className="chat-msg-timestamp">
            {formatTimestamp(message.timestamp)}
          </div>
        )}
      </div>
    </div>
  );
}
