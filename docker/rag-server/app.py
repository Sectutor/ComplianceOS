"""
LlamaIndex RAG Server — Cybersecurity Knowledge Query API
PREMIUM FEATURE — Partner tier

Integrates Chroma (vector search) + Neo4j (graph queries).
Provides REST API for Hermes agents to query compliance knowledge.
"""
import os
import logging
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import httpx

# Optional imports — graceful fallback if llama-index not installed
try:
    from llama_index.core import VectorStoreIndex, Document, Settings
    from llama_index.vector_stores.chroma import ChromaVectorStore
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    import chromadb
    HAS_LLAMA = True
except ImportError:
    HAS_LLAMA = False

try:
    from neo4j import GraphDatabase
    HAS_NEO4J = True
except ImportError:
    HAS_NEO4J = False

# ── Config ────────────────────────────────────────────────
CHROMA_URL = os.getenv("CHROMA_URL", "http://chroma:8000")
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "knowledge123")
LLM_API_KEY = os.getenv("LLM_API_KEY", "")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-v4-flash")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("rag-server")

# ── App ───────────────────────────────────────────────────
app = FastAPI(title="GRCompliance RAG Server", version="1.0.0")

# ── Models ────────────────────────────────────────────────
class QueryRequest(BaseModel):
    question: str
    top_k: int = 5

class GraphQuery(BaseModel):
    cypher: str

class IngestRequest(BaseModel):
    text: str
    source: str = "manual"
    metadata: dict = {}

class QueryResponse(BaseModel):
    answer: str
    sources: list = []
    error: Optional[str] = None

# ── Clients (lazy init) ───────────────────────────────────
_chroma_client = None
_neo4j_driver = None
_index = None

def get_chroma():
    global _chroma_client
    if _chroma_client is None and HAS_LLAMA:
        try:
            _chroma_client = chromadb.HttpClient(host=CHROMA_URL.replace("http://", "").replace(":8000", ""),
                                                  port=8000)
            log.info("Connected to Chroma")
        except Exception as e:
            log.warning(f"Chroma unavailable: {e}")
    return _chroma_client

def get_neo4j():
    global _neo4j_driver
    if _neo4j_driver is None and HAS_NEO4J:
        try:
            _neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            log.info("Connected to Neo4j")
        except Exception as e:
            log.warning(f"Neo4j unavailable: {e}")
    return _neo4j_driver

def get_index():
    global _index
    if _index is None and HAS_LLAMA:
        try:
            chroma = get_chroma()
            if chroma:
                collection = chroma.get_or_create_collection("compliance-docs")
                vector_store = ChromaVectorStore(chroma_collection=collection)
                embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
                _index = VectorStoreIndex.from_vector_store(
                    vector_store, embed_model=embed_model
                )
        except Exception as e:
            log.warning(f"Index init failed: {e}")
    return _index

# ── Endpoints ─────────────────────────────────────────────

@app.get("/health")
async def health():
    status = {"status": "ok", "chroma": False, "neo4j": False, "llama": HAS_LLAMA}
    try:
        async with httpx.AsyncClient() as c:
            r = await c.get(f"{CHROMA_URL}/api/v1/health", timeout=5)
            status["chroma"] = r.status_code == 200
    except Exception:
        status["chroma"] = False
    try:
        driver = get_neo4j()
        if driver:
            with driver.session() as s:
                s.run("RETURN 1")
                status["neo4j"] = True
    except Exception:
        status["neo4j"] = False
    return status


@app.post("/query", response_model=QueryResponse)
async def query(req: QueryRequest):
    """Semantic search over ingested compliance documents."""
    idx = get_index()
    if not idx:
        # Fallback: call DeepSeek directly
        return await fallback_llm(req.question)

    try:
        retriever = idx.as_retriever(similarity_top_k=req.top_k)
        nodes = retriever.retrieve(req.question)
        context = "\n\n".join([n.node.text for n in nodes])
        sources = [{"text": n.node.text[:200], "score": float(n.score or 0)} for n in nodes]

        # Call LLM to synthesize answer
        answer = await call_llm(f"Context:\n{context}\n\nQuestion: {req.question}\n\nAnswer concisely based on the context above.")
        return QueryResponse(answer=answer, sources=sources)
    except Exception as e:
        log.error(f"Query failed: {e}")
        return await fallback_llm(req.question)


@app.post("/graph")
async def graph_query(req: GraphQuery):
    """Execute a Cypher query against Neo4j knowledge graph."""
    driver = get_neo4j()
    if not driver:
        raise HTTPException(503, "Neo4j not available")

    try:
        with driver.session() as session:
            result = session.run(req.cypher)
            records = [dict(r) for r in result]
            return {"results": records, "count": len(records)}
    except Exception as e:
        raise HTTPException(400, f"Cypher error: {e}")


@app.post("/ingest")
async def ingest(req: IngestRequest):
    """Ingest a document into Chroma vector store."""
    if not HAS_LLAMA:
        raise HTTPException(503, "LlamaIndex not installed")

    try:
        chroma = get_chroma()
        if not chroma:
            raise HTTPException(503, "Chroma not available")

        collection = chroma.get_or_create_collection("compliance-docs")
        doc_id = f"{req.source}-{hash(req.text) % 10**8}"
        collection.add(
            documents=[req.text],
            metadatas=[{**req.metadata, "source": req.source}],
            ids=[doc_id],
        )
        return {"status": "ok", "doc_id": doc_id}
    except Exception as e:
        raise HTTPException(500, f"Ingest failed: {e}")


# ── Helpers ───────────────────────────────────────────────

async def call_llm(prompt: str) -> str:
    """Direct LLM call when RAG index is unavailable."""
    if not LLM_API_KEY:
        return "LLM not configured. Set LLM_API_KEY."
    try:
        async with httpx.AsyncClient(timeout=30) as c:
            r = await c.post(
                f"{LLM_BASE_URL}/chat/completions",
                json={
                    "model": LLM_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1024,
                },
                headers={"Authorization": f"Bearer {LLM_API_KEY}"},
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"LLM call failed: {e}"


async def fallback_llm(question: str) -> QueryResponse:
    answer = await call_llm(question)
    return QueryResponse(answer=answer, sources=[])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
