import { useState, useCallback, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

export interface UseAgentChatReturn {
  messages: ChatMessage[];
  sendMessage: (text: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearChat: () => void;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const AGENT_API_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AGENT_API_URL) ||
  (typeof window !== 'undefined' && (window as any).__ENV__?.AGENT_API_URL) ||
  'http://localhost:9090/api/chat';

const TIMEOUT_MS = 60_000;

// ── Helpers ────────────────────────────────────────────────────────────────────

let nextId = 1;
function uid(): string {
  return `msg_${Date.now()}_${nextId++}`;
}

function parseSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onToken: (text: string) => void,
  onDone: (fullText: string) => void,
  onError: (err: string) => void,
  signal: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    const abortHandler = () => {
      reader.cancel();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal.addEventListener('abort', abortHandler);

    function pump(): void {
      if (signal.aborted) return;

      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            signal.removeEventListener('abort', abortHandler);
            onDone(fullText);
            resolve(fullText);
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('event: token')) {
              // Next line should be data
              continue;
            }

            if (trimmed.startsWith('data: ')) {
              const payload = trimmed.slice(6);
              try {
                const parsed = JSON.parse(payload);
                if (parsed.text) {
                  fullText += parsed.text;
                  onToken(fullText);
                }
                if (parsed.error) {
                  onError(parsed.error);
                  reject(new Error(parsed.error));
                  return;
                }
                if (parsed.done || payload.includes('"done"')) {
                  signal.removeEventListener('abort', abortHandler);
                  onDone(fullText);
                  resolve(fullText);
                  return;
                }
              } catch {
                // Not JSON — treat raw text as token content
                fullText += payload;
                onToken(fullText);
              }
              continue;
            }

            // Handle `event: done` line
            if (trimmed === 'event: done') {
              signal.removeEventListener('abort', abortHandler);
              onDone(fullText);
              resolve(fullText);
              return;
            }

            // Handle bare `data: [DONE]` from some SSE implementations
            if (trimmed === 'data: [DONE]') {
              signal.removeEventListener('abort', abortHandler);
              onDone(fullText);
              resolve(fullText);
              return;
            }
          }

          pump();
        })
        .catch((err) => {
          signal.removeEventListener('abort', abortHandler);
          const msg = err?.message || 'Stream read failed';
          onError(msg);
          reject(err);
        });
    }

    pump();
  });
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAgentChat(): UseAgentChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const conversationIdRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  const clearChat = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setError(null);
    conversationIdRef.current = undefined;
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    // Reset error state
    setError(null);

    // Append user message immediately
    const userMsg: ChatMessage = {
      id: uid(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    // Create a placeholder agent message that will be updated
    const agentMsg: ChatMessage = {
      id: uid(),
      role: 'agent',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, agentMsg]);
    setIsLoading(true);

    // Abort previous in-flight request if any
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Timeout timer
      const timeoutId = setTimeout(() => {
        controller.abort();
        setError('Request timed out after 60 seconds');
        setIsLoading(false);
        // Update the placeholder to show error
        setMessages((prev) =>
          prev.map((m) =>
            m.id === agentMsg.id
              ? { ...m, content: '*Request timed out. Please try again.*' }
              : m,
          ),
        );
      }, TIMEOUT_MS);

      const response = await fetch(AGENT_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: conversationIdRef.current,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(
          `API error ${response.status}${errText ? `: ${errText}` : ''}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      let lastContent = '';

      await parseSSEStream(
        reader,
        // onToken — update agent message progressively
        (fullText) => {
          lastContent = fullText;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMsg.id ? { ...m, content: fullText } : m,
            ),
          );
        },
        // onDone
        (_fullText) => {
          // Ensure final content is set
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMsg.id
                ? { ...m, content: lastContent || _fullText }
                : m,
            ),
          );
          setIsLoading(false);
        },
        // onError
        (errMsg) => {
          setError(errMsg);
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === agentMsg.id
                ? { ...m, content: `*Error: ${errMsg}*` }
                : m,
            ),
          );
        },
        controller.signal,
      );
    } catch (err: any) {
      // Ignore abort errors — they're intentional
      if (err?.name === 'AbortError') {
        // Already handled by timeout above
        return;
      }

      const errMsg = err?.message || 'Failed to send message';
      setError(errMsg);
      setIsLoading(false);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === agentMsg.id
            ? { ...m, content: `*Error: ${errMsg}*` }
            : m,
        ),
      );
    }
  }, [isLoading]);

  return { messages, sendMessage, isLoading, error, clearChat };
}
