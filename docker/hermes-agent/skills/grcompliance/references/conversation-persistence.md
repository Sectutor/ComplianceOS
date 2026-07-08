# Conversation Persistence (Frontend)

The AgentPage auto-saves every conversation to localStorage so users can return to previous sessions.

## Architecture

### State: `SavedConversation`
```typescript
interface SavedConversation {
  id: string;
  title: string;          // auto-generated from first user message
  messages: ChatMessage[];
  created_at: number;
  updated_at: number;
  message_count: number;
  pinned?: boolean;
}
```

### Storage
- `localStorage` key: `complianceos_agent_convos`
- Max 100 conversations (`.slice(0, 100)`)
- Loaded on mount: `useState<SavedConversation[]>(() => loadConvos())`

### Auto-Save Triggers

1. **On every message** — `useEffect` with `[messages.length]` dependency:
```typescript
useEffect(() => {
  if (messages.length === 0) return;
  const id = currentConvIdRef.current || `conv_${Date.now()}`;
  if (!currentConvIdRef.current) { currentConvIdRef.current = id; setCurrentConvId(id); }
  const updated = [{ id, title: genTitle(messages), messages, ... }, ...convos.filter(c => c.id !== id)].slice(0, 100);
  setConvos(updated);
  saveConvos(updated);
}, [messages.length]);
```

2. **On navigation away** — `beforeunload` + component `useEffect` cleanup:
```typescript
useEffect(() => {
  const handler = () => { /* same save logic */ };
  window.addEventListener('beforeunload', handler);
  return () => { window.removeEventListener('beforeunload', handler); handler(); };
}, [messages, convos]);
```

### Key Detail: `currentConvIdRef`

Using React state for `currentConvId` alone causes a race: `setCurrentConvId(id)` is async, so the first `useEffect` run generates a new ID each time. A `useRef` persists the ID synchronously across renders:

```typescript
const currentConvIdRef = useRef<string | null>(null);

// In effect:
const id = currentConvIdRef.current || `conv_${Date.now()}`;
if (!currentConvIdRef.current) {
  currentConvIdRef.current = id;
  setCurrentConvId(id);
}
```

### Loading a Saved Conversation

```typescript
const handleLoad = useCallback((conv: SavedConversation) => {
  clearChat();
  setCurrentConvId(conv.id);
  sessionStorage.setItem('agent_restore', JSON.stringify(conv.messages));
  window.location.reload();
}, [clearChat]);
```

On reload, a separate `useEffect` reads `sessionStorage` and re-injects messages (subsequent render picks up the saved state).

### Pin/Unpin

```typescript
const handlePin = useCallback((id: string) => {
  setConvos(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
}, []);
```

Pinned conversations appear in a separate "Pinned" group at the top of the sidebar.

### Sidebar Grouping

Conversations are grouped by date:
```
Pinned → Today → Yesterday → Previous 7 Days → Older
```

```typescript
function groupByDate(convos: SavedConversation[]): { label: string; items: SavedConversation[] }[] {
  const now = Date.now();
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = today.getTime() - 86400000;
  const weekAgo = today.getTime() - 7 * 86400000;
  // ... groups by Pinned, Today, Yesterday, 7 Days, Older
}
```
