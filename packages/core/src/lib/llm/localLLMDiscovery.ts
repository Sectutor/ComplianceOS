/**
 * Enterprise Local LLM Discovery, Health Check & Model Catalog Engine
 * Supports Ollama, LM Studio, vLLM, LocalAI, and custom on-prem OpenAI-compatible runtimes.
 */

export interface DiscoveredLocalRuntime {
  id: string;
  name: string;
  type: "ollama" | "lmstudio" | "vllm" | "localai" | "custom";
  baseUrl: string;
  isOnline: boolean;
  version?: string;
  latencyMs?: number;
  models: {
    id: string;
    name: string;
    size?: string;
    format?: string;
    family?: string;
    parameterSize?: string;
    quantizationLevel?: string;
    supportsEmbeddings?: boolean;
  }[];
  errorMessage?: string;
}

export interface RecommendedLocalModel {
  id: string;
  name: string;
  runtime: "ollama" | "lmstudio" | "vllm" | "any";
  tier: "workstation" | "pro_workstation" | "enterprise_gpu";
  ramVramRequirement: string;
  primaryUseCase: "Risk & Reasoning" | "General Compliance & Policies" | "Code & IaC" | "Vector Embeddings" | "Ultra-Fast Triage";
  description: string;
  pullCommand: string;
  supportsEmbeddings: boolean;
}

/**
 * Fetch JSON with a hard wall-clock timeout that covers BOTH connection
 * establishment and response-body reading (the body is read while the abort
 * signal is still armed). Uses AbortController+setTimeout so it works on
 * every Node version with global fetch. Rejects with an Error whose `name`
 * is 'AbortError' when the timeout fires, or `HTTP <status>` on non-2xx —
 * callers treat both as graceful offline failures.
 */
export async function fetchJsonBounded(
    url: string,
    init: Omit<RequestInit, "signal"> & { timeoutMs?: number } = {},
    timeoutMs: number = 2500,
    httpErrorLabel?: string
): Promise<any> {
    // Convenience: callers may pass `timeoutMs` inside `init` instead of
    // positionally (keeps the timeout next to the headers in object-literal
    // call sites). It is stripped before forwarding to fetch.
    const rawInit = init as any;
    let effectiveTimeoutMs = timeoutMs;
    let fetchInit: Omit<RequestInit, "signal"> = init;
    if (rawInit && typeof rawInit.timeoutMs === "number") {
        effectiveTimeoutMs = rawInit.timeoutMs;
        const shallow = { ...rawInit };
        delete shallow.timeoutMs;
        fetchInit = shallow;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), effectiveTimeoutMs);
    try {
        const res = await fetch(url, { ...fetchInit, signal: controller.signal });
        if (!res.ok) {
            throw new Error(httpErrorLabel ? `HTTP ${res.status} from ${httpErrorLabel}` : `HTTP ${res.status}`);
        }
        return await res.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

export class LocalLLMDiscoveryService {
  public static readonly DEFAULT_PROBES = [
    { type: "ollama" as const, name: "Ollama", baseUrl: "http://127.0.0.1:11434" },
    { type: "lmstudio" as const, name: "LM Studio", baseUrl: "http://127.0.0.1:1234/v1" },
    { type: "vllm" as const, name: "vLLM / TGI GPU Cluster", baseUrl: "http://127.0.0.1:8000/v1" },
    { type: "localai" as const, name: "LocalAI / llama.cpp", baseUrl: "http://127.0.0.1:8080/v1" },
  ];

  public static readonly RECOMMENDED_MODELS: RecommendedLocalModel[] = [
    // ── Workstation Tier (8GB - 16GB RAM / VRAM) ──────────────────────────────
    {
      id: "deepseek-r1:8b",
      name: "DeepSeek R1 (8B)",
      runtime: "ollama",
      tier: "workstation",
      ramVramRequirement: "8 GB RAM / 6 GB VRAM",
      primaryUseCase: "Risk & Reasoning",
      description: "Exceptional mathematical and chain-of-thought reasoning for risk modeling and audit gap analysis on standard laptops.",
      pullCommand: "ollama run deepseek-r1:8b",
      supportsEmbeddings: false,
    },
    {
      id: "qwen2.5:7b",
      name: "Qwen 2.5 (7B)",
      runtime: "ollama",
      tier: "workstation",
      ramVramRequirement: "8 GB RAM / 6 GB VRAM",
      primaryUseCase: "General Compliance & Policies",
      description: "State-of-the-art multilingual policy drafting, control cross-mapping, and JSON schema outputs.",
      pullCommand: "ollama run qwen2.5:7b",
      supportsEmbeddings: false,
    },
    {
      id: "llama3.2:3b",
      name: "Llama 3.2 (3B)",
      runtime: "ollama",
      tier: "workstation",
      ramVramRequirement: "4 GB RAM / 3 GB VRAM",
      primaryUseCase: "Ultra-Fast Triage",
      description: "Ultra-lightweight sub-second response model for rapid triage and evidence classification.",
      pullCommand: "ollama run llama3.2:3b",
      supportsEmbeddings: false,
    },
    {
      id: "nomic-embed-text",
      name: "Nomic Embed Text (v1.5)",
      runtime: "ollama",
      tier: "workstation",
      ramVramRequirement: "2 GB RAM",
      primaryUseCase: "Vector Embeddings",
      description: "High-performance 8192 context embedding model for 100% offline semantic search across company policies and evidence.",
      pullCommand: "ollama pull nomic-embed-text",
      supportsEmbeddings: true,
    },

    // ── Pro Workstation Tier (24GB - 32GB RAM / Mac M-Series 36GB+) ───────────
    {
      id: "deepseek-r1:14b",
      name: "DeepSeek R1 (14B)",
      runtime: "ollama",
      tier: "pro_workstation",
      ramVramRequirement: "16 GB RAM / 12 GB VRAM",
      primaryUseCase: "Risk & Reasoning",
      description: "Sweet spot for deep compliance reasoning, complex threat modeling, and audit simulation without external APIs.",
      pullCommand: "ollama run deepseek-r1:14b",
      supportsEmbeddings: false,
    },
    {
      id: "qwen2.5-coder:14b",
      name: "Qwen 2.5 Coder (14B)",
      runtime: "ollama",
      tier: "pro_workstation",
      ramVramRequirement: "16 GB RAM / 12 GB VRAM",
      primaryUseCase: "Code & IaC",
      description: "Dedicated coder model for automated Terraform fix scripts, Dockerfile remediation, and AppSec vulnerability patches.",
      pullCommand: "ollama run qwen2.5-coder:14b",
      supportsEmbeddings: false,
    },
    {
      id: "mistral-nemo:12b",
      name: "Mistral NeMo (12B)",
      runtime: "ollama",
      tier: "pro_workstation",
      ramVramRequirement: "14 GB RAM / 10 GB VRAM",
      primaryUseCase: "General Compliance & Policies",
      description: "High precision 128k context model built by Mistral & NVIDIA for detailed audit reports.",
      pullCommand: "ollama run mistral-nemo:12b",
      supportsEmbeddings: false,
    },
    {
      id: "bge-large-en-v1.5",
      name: "BGE Large English (v1.5)",
      runtime: "ollama",
      tier: "pro_workstation",
      ramVramRequirement: "4 GB RAM",
      primaryUseCase: "Vector Embeddings",
      description: "Top-tier vector embedding model for enterprise pgvector semantic search.",
      pullCommand: "ollama pull bge-large-en-v1.5",
      supportsEmbeddings: true,
    },

    // ── Enterprise GPU Cluster Tier (48GB - 80GB+ VRAM / vLLM Server) ────────
    {
      id: "deepseek-r1:70b",
      name: "DeepSeek R1 (70B Llama Distill)",
      runtime: "any",
      tier: "enterprise_gpu",
      ramVramRequirement: "48 GB VRAM / Dedicated Server",
      primaryUseCase: "Risk & Reasoning",
      description: "Frontier-class reasoning on-prem matching GPT-4o / Claude 3.7 Sonnet for high-security enterprise audit rooms.",
      pullCommand: "ollama run deepseek-r1:70b",
      supportsEmbeddings: false,
    },
    {
      id: "llama3.3:70b",
      name: "Llama 3.3 (70B Instruct)",
      runtime: "any",
      tier: "enterprise_gpu",
      ramVramRequirement: "48 GB VRAM / Dedicated Server",
      primaryUseCase: "General Compliance & Policies",
      description: "Flagship open-weights model for full-stack multi-agent autonomous enterprise governance.",
      pullCommand: "ollama run llama3.3:70b",
      supportsEmbeddings: false,
    },
    {
      id: "qwen2.5-72b-instruct",
      name: "Qwen 2.5 (72B Instruct)",
      runtime: "any",
      tier: "enterprise_gpu",
      ramVramRequirement: "48 GB VRAM / Dedicated Server",
      primaryUseCase: "General Compliance & Policies",
      description: "Top-ranked global open weights model for complex multinational compliance frameworks.",
      pullCommand: "ollama run qwen2.5:72b",
      supportsEmbeddings: false,
    },
  ];

  /**
   * Scan and detect running local LLM runtimes on the host machine / local network.
   */
  public async scanLocalRuntimes(customUrls: string[] = []): Promise<DiscoveredLocalRuntime[]> {
    const probesToRun = [
      ...LocalLLMDiscoveryService.DEFAULT_PROBES,
      ...customUrls.map((url, idx) => ({
        type: "custom" as const,
        name: `Custom On-Prem Endpoint #${idx + 1}`,
        baseUrl: url,
      })),
    ];

    const results = await Promise.all(
      probesToRun.map((probe) => this.probeRuntime(probe))
    );

    return results;
  }

  /**
   * Probe a single runtime endpoint with low timeout (1500ms).
   */
  public async probeRuntime(probe: { type: string; name: string; baseUrl: string }): Promise<DiscoveredLocalRuntime> {
    const startTime = Date.now();
    const cleanBaseUrl = probe.baseUrl.replace(/\/+$/, "");

    try {
      if (probe.type === "ollama") {
        // Ollama native API: /api/tags — hard 2s bound (connect + body read)
        const data: any = await fetchJsonBounded(
          `${cleanBaseUrl}/api/tags`,
          { headers: { Accept: "application/json" } },
          2000,
          "Ollama"
        );
        const models = (data.models || []).map((m: any) => ({
          id: m.name || m.model,
          name: m.name || m.model,
          size: m.size ? `${(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB` : undefined,
          format: m.details?.format,
          family: m.details?.family,
          parameterSize: m.details?.parameter_size,
          quantizationLevel: m.details?.quantization_level,
          supportsEmbeddings: /embed|bge|nomic|minilm/i.test(m.name || ""),
        }));

        // Fetch version if available
        let version: string | undefined;
        try {
          const vRes = await fetch(`${cleanBaseUrl}/api/version`);
          if (vRes.ok) {
            const vData = await vRes.json();
            version = vData.version;
          }
        } catch {
          // ignore
        }

        return {
          id: `local_ollama_${cleanBaseUrl}`,
          name: probe.name,
          type: "ollama",
          baseUrl: `${cleanBaseUrl}/v1`, // OpenAI-compatible proxy endpoint
          isOnline: true,
          version,
          latencyMs: Date.now() - startTime,
          models,
        };
      }

      // OpenAI-Compatible standard: LM Studio, vLLM, LocalAI, Custom
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const targetModelsUrl = cleanBaseUrl.endsWith("/v1")
        ? `${cleanBaseUrl}/models`
        : `${cleanBaseUrl}/v1/models`;

      const res = await fetch(targetModelsUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} from ${probe.name}`);
      }

      const data: any = await res.json();
      const models = (data.data || []).map((m: any) => ({
        id: m.id,
        name: m.id,
        supportsEmbeddings: /embed|bge|nomic|minilm/i.test(m.id || ""),
      }));

      return {
        id: `local_${probe.type}_${cleanBaseUrl}`,
        name: probe.name,
        type: probe.type as any,
        baseUrl: cleanBaseUrl.endsWith("/v1") ? cleanBaseUrl : `${cleanBaseUrl}/v1`,
        isOnline: true,
        latencyMs: Date.now() - startTime,
        models,
      };
    } catch (err: any) {
      return {
        id: `local_${probe.type}_${cleanBaseUrl}`,
        name: probe.name,
        type: probe.type as any,
        baseUrl: probe.baseUrl,
        isOnline: false,
        models: [],
        errorMessage: err.name === "AbortError" ? "Connection timed out" : err.message || "Offline",
      };
    }
  }

  /**
   * Helper: Cleans reasoning tokens (e.g. <think>...</think> from DeepSeek R1) and extracts valid JSON.
   */
  public static cleanLocalModelOutput(rawText: string): string {
    if (!rawText) return "";

    // Strip <think> ... </think> reasoning tags
    let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return cleaned;
  }
}

export const localLLMDiscovery = new LocalLLMDiscoveryService();
