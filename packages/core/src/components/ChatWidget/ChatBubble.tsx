import React from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatBubbleProps {
  /** Whether the chat panel is currently open */
  isOpen: boolean;
  /** Number of unread messages to show as a badge */
  badgeCount: number;
  /** Whether the agent has a new message (triggers pulse) */
  hasNewMessage: boolean;
  /** Click handler to toggle the panel */
  onClick: () => void;
}

/**
 * Floating chat bubble button.
 * - Circular button with 💬 / X icon
 * - Badge for unread count
 * - Pulsing animation when the agent has sent a new message
 */
export function ChatBubble({
  isOpen,
  badgeCount,
  hasNewMessage,
  onClick,
}: ChatBubbleProps) {
  return (
    <button
      type="button"
      className={`chat-bubble-btn ${hasNewMessage && !isOpen ? 'chat-bubble-pulse' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close chat' : 'Open chat'}
      title={isOpen ? 'Close chat' : 'Open chat'}
    >
      {isOpen ? (
        <X size={22} />
      ) : (
        <MessageCircle size={22} />
      )}

      {!isOpen && badgeCount > 0 && (
        <span className="chat-bubble-badge">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}

      <style>{`
        .chat-bubble-btn {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--chat-bubble-bg);
          color: var(--chat-bubble-text);
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 12px rgba(37, 99, 235, 0.35);
          position: relative;
          transition: transform 0.15s, box-shadow 0.15s;
          z-index: 10000;
        }

        .chat-bubble-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.45);
        }

        .chat-bubble-btn:active {
          transform: scale(0.95);
        }

        /* Pulsing ring animation for new messages */
        .chat-bubble-pulse {
          animation: bubblePulse 2s ease-in-out infinite;
        }

        @keyframes bubblePulse {
          0% {
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.35);
          }
          50% {
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.35),
                        0 0 0 8px rgba(37, 99, 235, 0.12),
                        0 0 0 16px rgba(37, 99, 235, 0.06);
          }
          100% {
            box-shadow: 0 2px 12px rgba(37, 99, 235, 0.35);
          }
        }

        /* Badge */
        .chat-bubble-badge {
          position: absolute;
          top: -4px;
          right: -4px;
          min-width: 20px;
          height: 20px;
          border-radius: 99px;
          background: var(--chat-badge-bg);
          color: var(--chat-badge-text);
          font-size: 11px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          line-height: 1;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </button>
  );
}
