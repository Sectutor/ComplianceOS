/**
 * Company Memory Cortex (VFS) - data contract + hooks
 * ================================================================================
 * UI-side typed view of the `memory.*` tRPC procedures backing the OpenViking-style
 * Virtual Filesystem ("memory:///") and Mem0-style adaptive fact memory
 * (registered as `memory:` on the AppRouter via `createMemoryRouter` in
 * `packages/core/src/server/routers/memoryRouter.ts`; engine in
 * `packages/core/src/lib/memory/vfsMemoryEngine.ts` + `vfsSyncBridge.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - the router factory is `any`-typed
 * on the AppRouter side, so every consumer goes through THIS module instead of raw
 * `trpc.memory.*` (raw access resolves to DecoratedQuery and breaks tsc). If a
 * procedure is unavailable the HTTP call fails and every consumer degrades to the
 * EMPTY_* frozen shapes below.
 *
 * ---------------------------------------------------------------------------
 * Procedures (all client-scoped; server resolves clientId from ctx.user):
 *
 * 1) memory.getTree        (query)
 *    input:  { rootPath?: string }                       (whole input optional)
 *    output: VfsTreeNode[] - recursive tree, auto-bootstraps baseline structure
 *
 * 2) memory.getNode        (query)
 *    input:  { path: string }
 *    output: NodeDetail { node: MemoryNode, relations: NodeRelation[] }
 *            (NOT_FOUND TRPCError when the path does not exist / is inactive)
 *
 * 3) memory.listDirectory  (query)
 *    input:  { path?: string }                           (defaults to "/")
 *    output: VfsNodeSummary[] - immediate children with L0 summaries
 *
 * 4) memory.search         (query)
 *    input:  { query: string, pathPrefix?: string, nodeType?: string,
 *              limit?: number }                          (limit defaults to 10)
 *    output: SearchResult[] - hybrid title/path/L0/content scoring, sorted desc
 *
 * 5) memory.writeNode      (mutation)
 *    input:  { path, title, nodeType?, contentL2?, summaryL0?, metadata? }
 *    output: the upserted MemoryNode (narrowed here to WriteResult { path })
 *
 * 6) memory.deleteNode     (mutation)
 *    input:  { path }
 *    output: { deletedCount }                            (node + child paths)
 *
 * 7) memory.extractFacts   (mutation)
 *    input:  { text, source? }                           (source default "user_input")
 *    output: { savedCount, facts }
 *
 * 8) memory.ingestWeb      (mutation)
 *    input:  { url, title, content, summary?, frameworks?, category? }
 *    output: the ingested MemoryNode (narrowed here to IngestResult { path })
 *
 * 9) memory.syncAppData    (mutation)
 *    input:  none
 *    output: SyncResult - relational app data (policies/controls/vendors/...)
 *            mirrored into VFS nodes
 *
 * 10) memory.bootstrapDefaults (mutation)
 *    input:  none
 *    output: { success: true }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Node discriminator stored in company_memory_nodes.node_type. */
export type VfsNodeType =
  | "folder"
  | "document"
  | "fact"
  | "web_intel"
  | "asset_profile";

/**
 * Recursive VFS tree entry returned by memory.getTree.
 * Mirrors `VfsTreeNode` in vfsMemoryEngine.ts (children always present).
 */
export interface VfsTreeNode {
  id: number;
  /** Absolute VFS path, e.g. "/policies/access_control.md". */
  path: string;
  title: string;
  nodeType: string;
  summaryL0?: string;
  children: VfsTreeNode[];
}

/**
 * Flat directory row returned by memory.listDirectory.
 * Timestamps serialize to ISO strings across the tRPC JSON boundary.
 */
export interface VfsNodeSummary {
  id: number;
  path: string;
  parentPath: string;
  nodeType: string;
  title: string;
  summaryL0: string;
  metadata: Record<string, unknown> | null;
  updatedAt: string;
}

/**
 * Full memory document node (narrowed `CompanyMemoryNode`).
 * `createdAt`/`updatedAt` arrive as ISO strings over tRPC JSON.
 */
export interface MemoryNode {
  id: number;
  clientId?: number;
  path: string;
  parentPath?: string;
  nodeType: string;
  title: string;
  summaryL0: string | null;
  contentL2: string | null;
  metadata?: {
    tags?: string[];
    source?: string;
    url?: string;
    author?: string;
    confidence?: number;
    frameworks?: string[];
    extractedFactsCount?: number;
    lastVerified?: string;
  } | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** One directed knowledge-graph edge out of a node (memory.getNode). */
export interface NodeRelation {
  targetId: number;
  targetPath: string;
  relationType: string;
  description?: string;
}

/** Output of memory.getNode: the document plus its outgoing relations. */
export interface NodeDetail {
  node: MemoryNode;
  relations: NodeRelation[];
}

/** One ranked hit returned by memory.search. */
export interface SearchResult {
  id: number;
  path: string;
  title: string;
  nodeType: string;
  summaryL0: string;
  snippet?: string;
  /** Relevance score in [0, 1], sorted descending by the engine. */
  score: number;
  metadata?: Record<string, unknown> | null;
}

/** Output of memory.search. */
export type SearchResults = SearchResult[];

/* --- procedure inputs ------------------------------------------------ */

export interface GetTreeInput {
  rootPath?: string;
}

export interface GetNodeInput {
  path: string;
}

export interface ListDirectoryInput {
  path?: string;
}

export interface SearchInput {
  query: string;
  pathPrefix?: string;
  nodeType?: string;
  limit?: number;
}

export interface WriteNodeInput {
  path: string;
  title: string;
  nodeType?: VfsNodeType;
  contentL2?: string;
  summaryL0?: string;
  metadata?: Record<string, unknown>;
}

export interface DeleteNodeInput {
  path: string;
}

export interface ExtractFactsInput {
  text: string;
  source?: string;
}

export interface IngestWebInput {
  url: string;
  title: string;
  content: string;
  summary?: string;
  frameworks?: string[];
  category?: string;
}

/* --- procedure outputs (narrowed views; runtime is a superset) ------- */

/** Output of memory.writeNode - the UI only needs the final VFS path. */
export interface WriteResult {
  path: string;
}

/** Output of memory.deleteNode - node plus all child paths removed. */
export interface DeleteResult {
  deletedCount: number;
}

/** Output of memory.extractFacts - atomic facts persisted under /facts. */
export interface FactsResult {
  savedCount: number;
  facts: string[];
}

/** Output of memory.ingestWeb - the UI navigates to the new node path. */
export interface IngestResult {
  path: string;
}

/**
 * Output of memory.syncAppData (vfsSyncBridge.SyncStats). Counters beyond the
 * four consumed by the UI stay optional so older bridges remain compatible.
 */
export interface SyncResult {
  totalNodesCreated: number;
  policiesSynced: number;
  controlsSynced: number;
  vendorsSynced: number;
  risksSynced?: number;
  incidentsSynced?: number;
  evidenceSynced?: number;
  findingsSynced?: number;
}

/** Output of memory.bootstrapDefaults. */
export interface BootstrapResult {
  success: boolean;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

/** Frozen empty tree (memory.getTree unavailable or empty). */
export const EMPTY_TREE: VfsTreeNode[] = Object.freeze([]) as unknown as VfsTreeNode[];

/** Frozen empty directory listing. */
export const EMPTY_DIRECTORY: VfsNodeSummary[] = Object.freeze([]) as unknown as VfsNodeSummary[];

/** Frozen empty detail payload - safe "no node selected" placeholder. */
export const EMPTY_NODE_DETAIL: NodeDetail = Object.freeze({
  node: Object.freeze({
    id: 0,
    path: "",
    parentPath: "/",
    nodeType: "document",
    title: "",
    summaryL0: null,
    contentL2: null,
    metadata: null,
    createdAt: "",
    updatedAt: "",
  }) as unknown as MemoryNode,
  relations: Object.freeze([]) as unknown as NodeRelation[],
}) as unknown as NodeDetail;

/** Frozen empty result set (memory.search unavailable or empty query). */
export const EMPTY_SEARCH_RESULTS: SearchResults = Object.freeze([]) as unknown as SearchResults;

/* ------------------------------------------------------------------ */
/* Narrowed tRPC hook shapes (runtime is a superset)                   */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export interface MutationLike<TInput, TResult> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TResult>;
  /** react-query v4 alias kept for existing consumers. */
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
  reset: () => void;
}

interface QueryOptions<TData> {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
  refetchInterval?: number | false;
  /**
   * Forwarded verbatim to keep legacy call sites byte-compatible. Note that
   * @tanstack/react-query v5 ignores query-level callbacks - consumers that
   * need load-time effects should observe `data` instead.
   */
  onSuccess?: (data: TData) => void;
}

interface MutationOptions<TInput, TResult> {
  onSuccess?: (data: TResult, variables: TInput) => void;
  onError?: (error: { message: string }) => void;
}

interface MemoryTrpc {
  memory: {
    getTree: {
      useQuery: (
        input?: GetTreeInput,
        opts?: QueryOptions<VfsTreeNode[]>
      ) => QueryLike<VfsTreeNode[]>;
    };
    getNode: {
      useQuery: (
        input: GetNodeInput,
        opts?: QueryOptions<NodeDetail>
      ) => QueryLike<NodeDetail>;
    };
    listDirectory: {
      useQuery: (
        input: ListDirectoryInput,
        opts?: QueryOptions<VfsNodeSummary[]>
      ) => QueryLike<VfsNodeSummary[]>;
    };
    search: {
      useQuery: (
        input: SearchInput,
        opts?: QueryOptions<SearchResults>
      ) => QueryLike<SearchResults>;
    };
    writeNode: {
      useMutation: (
        opts?: MutationOptions<WriteNodeInput, WriteResult>
      ) => MutationLike<WriteNodeInput, WriteResult>;
    };
    deleteNode: {
      useMutation: (
        opts?: MutationOptions<DeleteNodeInput, DeleteResult>
      ) => MutationLike<DeleteNodeInput, DeleteResult>;
    };
    extractFacts: {
      useMutation: (
        opts?: MutationOptions<ExtractFactsInput, FactsResult>
      ) => MutationLike<ExtractFactsInput, FactsResult>;
    };
    ingestWeb: {
      useMutation: (
        opts?: MutationOptions<IngestWebInput, IngestResult>
      ) => MutationLike<IngestWebInput, IngestResult>;
    };
    syncAppData: {
      useMutation: (
        opts?: MutationOptions<void, SyncResult>
      ) => MutationLike<void, SyncResult>;
    };
    bootstrapDefaults: {
      useMutation: (
        opts?: MutationOptions<void, BootstrapResult>
      ) => MutationLike<void, BootstrapResult>;
    };
  };
}

const memoryApi = trpc as unknown as MemoryTrpc;

/* ------------------------------------------------------------------ */
/* Hooks - retry: false (UI-STANDARD 16)                               */
/* ------------------------------------------------------------------ */

/**
 * Recursive VFS hierarchy rooted at `/` (auto-bootstraps the baseline tree
 * server-side on first call). Pass a `rootPath` to scope the snapshot.
 */
export function useMemoryTree(
  input?: GetTreeInput | null,
  enabled = true
): QueryLike<VfsTreeNode[]> {
  return memoryApi.memory.getTree.useQuery(input ?? {}, {
    enabled,
    retry: false,
    staleTime: 15_000,
  });
}

/**
 * Read one memory node with its outgoing relations. Throws NOT_FOUND
 * server-side for inactive paths - callers should render the EMPTY_NODE_DETAIL
 * degradation branch on `error`.
 */
export function useMemoryNode(
  path: string,
  opts?: {
    enabled?: boolean;
    onSuccess?: (data: NodeDetail) => void;
  }
): QueryLike<NodeDetail> {
  return memoryApi.memory.getNode.useQuery({ path }, {
    enabled: opts?.enabled !== false && !!path,
    retry: false,
    staleTime: 10_000,
    onSuccess: opts?.onSuccess,
  });
}

/**
 * Immediate children of a directory with L0 summaries (defaults to root).
 */
export function useMemoryListDirectory(
  path?: string,
  enabled = true
): QueryLike<VfsNodeSummary[]> {
  return memoryApi.memory.listDirectory.useQuery(
    { path: path ?? "/" },
    { enabled, retry: false, staleTime: 15_000 }
  );
}

/**
 * Hybrid memory search across titles, L0 summaries, raw content and paths.
 * Caller decides when the query runs (e.g. `query.trim().length > 1`).
 */
export function useMemorySearch(
  input: SearchInput,
  opts?: { enabled?: boolean }
): QueryLike<SearchResults> {
  return memoryApi.memory.search.useQuery(input, {
    enabled: opts?.enabled,
    retry: false,
    staleTime: 10_000,
  });
}

/**
 * Create or update a VFS node (auto-creates parent folders server-side).
 */
export function useWriteMemoryNode(opts?: {
  onSuccess?: (data: WriteResult, variables: WriteNodeInput) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.writeNode.useMutation(opts);
}

/**
 * Soft-delete a node and all of its child paths.
 */
export function useDeleteMemoryNode(opts?: {
  onSuccess?: (data: DeleteResult, variables: DeleteNodeInput) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.deleteNode.useMutation(opts);
}

/**
 * Mem0-style adaptive fact extraction - parses atomic facts out of free text
 * and persists each one under `/facts/<source>_<timestamp>_<slug>`.
 */
export function useExtractFacts(opts?: {
  onSuccess?: (data: FactsResult, variables: ExtractFactsInput) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.extractFacts.useMutation(opts);
}

/**
 * One-click ingestion of regulatory / cloud web intelligence into VFS.
 */
export function useIngestWebIntel(opts?: {
  onSuccess?: (data: IngestResult, variables: IngestWebInput) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.ingestWeb.useMutation(opts);
}

/**
 * Mirror all relational app data (policies, controls, vendors, findings...)
 * into the VFS so every bot sees live corporate state.
 */
export function useSyncAppData(opts?: {
  onSuccess?: (data: SyncResult) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.syncAppData.useMutation(opts);
}

/**
 * Re-seed the default VFS architecture and baseline policies.
 */
export function useBootstrapMemoryDefaults(opts?: {
  onSuccess?: (data: BootstrapResult) => void;
  onError?: (error: { message: string }) => void;
}) {
  return memoryApi.memory.bootstrapDefaults.useMutation(opts);
}
