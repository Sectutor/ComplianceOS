/**
 * Enhanced Embedding Retrieval with pgvector Support
 * Provides SQL-based vector similarity search with in-memory fallback
 */

import { getDb } from '../../db';
import { embeddings } from '../../schema';
import { sql, desc, and, eq } from 'drizzle-orm';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import { logger } from '../logger';

export interface RetrievalResult {
    docId: string;
    docType: string;
    content: string;
    similarity: number;
    metadata?: Record<string, any>;
}

export interface RetrievalOptions {
    limit?: number;
    threshold?: number; // Minimum similarity score (0-1)
    docTypes?: string[]; // Filter by document types
    clientId?: number; // Filter by client
}

/**
 * Search for similar documents using pgvector (preferred) or in-memory fallback
 */
export async function searchSimilar(
    query: string,
    options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
    const {
        limit = 10,
        threshold = 0.5, // Lowered from 0.7 for broader recall
        docTypes,
        clientId,
    } = options;

    const db = await getDb();
    if (!db) {
        throw new Error('Database not available');
    }

    // Generate query embedding
    const { embedding: queryEmbedding } = await generateEmbedding(query);

    try {
        // Try pgvector-based search first
        const pgResults = await searchWithPgvector(db, queryEmbedding, {
            limit,
            threshold,
            docTypes: docTypes || [],
            clientId: clientId,
        });

        // If pgvector returns empty, try in-memory fallback (handles rows with embeddingData but no embeddingVector)
        if (pgResults.length === 0) {
            logger.info(`[Retrieval] pgvector returned 0 results for query "${query.substring(0, 50)}...", trying in-memory fallback`);
            const inMemoryResults = await searchWithInMemory(db, queryEmbedding, {
                limit,
                threshold,
                docTypes: docTypes || [],
                clientId: clientId,
            });
            logger.info(`[Retrieval] In-memory fallback returned ${inMemoryResults.length} results`);
            return inMemoryResults;
        }

        return pgResults;
    } catch (error: any) {
        logger.warn(`pgvector search failed, falling back to in-memory: ${error.message}`);

        // Fallback to in-memory cosine similarity
        return await searchWithInMemory(db, queryEmbedding, {
            limit,
            threshold,
            docTypes: docTypes || [],
            clientId: clientId,
        });
    }
}

/**
 * Search using pgvector SQL similarity
 */
async function searchWithPgvector(
    db: any,
    queryEmbedding: number[],
    options: RetrievalOptions
): Promise<RetrievalResult[]> {
    const { limit, threshold, docTypes, clientId } = options;

    // Build WHERE conditions
    const conditions: any[] = [
        sql`${embeddings.embeddingVector} IS NOT NULL`
    ];

    if (docTypes && docTypes.length > 0) {
        // Fix: Use proper SQL array syntax
        conditions.push(sql`${embeddings.docType} IN (${sql.join(docTypes.map(t => sql`${t}`), sql`, `)})`);
    }

    if (clientId !== undefined) {
        conditions.push(eq(embeddings.clientId, clientId));
    }

    // Convert query embedding to pgvector format
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // Query with cosine similarity using pgvector operator
    const results = await db
        .select({
            id: embeddings.id,
            docId: embeddings.docId,
            docType: embeddings.docType,
            content: embeddings.content,
            metadata: embeddings.metadata,
            similarity: sql<number>`1 - (${embeddings.embeddingVector} <=> ${vectorStr}::vector)`,
        })
        .from(embeddings)
        .where(and(...conditions))
        .orderBy(sql`${embeddings.embeddingVector} <=> ${vectorStr}::vector`)
        .limit(limit);

    // Filter by threshold and format
    return results
        .filter((r: any) => r.similarity >= (threshold || 0))
        .map((r: any) => ({
            docId: r.docId,
            docType: r.docType,
            content: r.content || '',
            similarity: r.similarity,
            metadata: r.metadata || {},
        }));
}

/**
 * Fallback: In-memory cosine similarity search
 */
async function searchWithInMemory(
    db: any,
    queryEmbedding: number[],
    options: RetrievalOptions
): Promise<RetrievalResult[]> {
    const { limit, threshold, docTypes, clientId } = options;

    // Build WHERE conditions
    const conditions: any[] = [];

    if (docTypes && docTypes.length > 0) {
        // Fix: Use proper SQL IN syntax
        conditions.push(sql`${embeddings.docType} IN (${sql.join(docTypes.map(t => sql`${t}`), sql`, `)})`);
    }

    if (clientId !== undefined) {
        conditions.push(eq(embeddings.clientId, clientId));
    }

    // Fetch all embeddings (with filters)
    const query = db.select().from(embeddings);

    if (conditions.length > 0) {
        query.where(and(...conditions));
    }

    const allEmbeddings = await query;

    // Calculate similarities in-memory
    const results: RetrievalResult[] = [];

    for (const emb of allEmbeddings) {
        let embedding: number[];

        // Try vector column first, fallback to JSON
        if (emb.embeddingVector) {
            embedding = emb.embeddingVector as any;
        } else if (emb.embeddingData) {
            try {
                embedding = JSON.parse(emb.embeddingData);
            } catch {
                continue; // Skip invalid embeddings
            }
        } else {
            continue; // No embedding data
        }

        const similarity = cosineSimilarity(queryEmbedding, embedding);

        if (similarity >= (threshold || 0)) {
            results.push({
                docId: emb.docId,
                docType: emb.docType,
                content: emb.content || '',
                similarity,
                metadata: emb.metadata || {},
            });
        }
    }

    // Sort by similarity and limit
    return results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
}

/**
 * Retrieve controls similar to query
 */
export async function retrieveControls(
    query: string,
    framework?: string,
    limit: number = 5
): Promise<RetrievalResult[]> {
    const options: RetrievalOptions = {
        limit,
        threshold: 0.6,
        docTypes: ['control'],
    };

    const results = await searchSimilar(query, options);

    // Additional filtering by framework if specified
    if (framework) {
        return results.filter(r =>
            r.metadata?.framework?.toLowerCase() === framework.toLowerCase()
        );
    }

    return results;
}

/**
 * Retrieve catalog technologies similar to query
 */
export async function retrieveCatalogTech(
    controlId: string,
    framework: string,
    vendorPreference: string,
    limit: number = 5
): Promise<RetrievalResult[]> {
    const query = `${controlId} ${framework} ${vendorPreference} technology solution implementation`;

    return await searchSimilar(query, {
        limit,
        threshold: 0.5,
        docTypes: ['catalog'],
    });
}

/**
 * Retrieve policies similar to query
 */
export async function retrievePolicies(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    return await searchSimilar(query, {
        limit,
        threshold: 0.3, // Lowered from 0.6 for better recall
        docTypes: ['policy'],
        clientId,
    });
}

/**
 * Retrieve evidence similar to query
 */
export async function retrieveEvidence(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    if (!clientId) return [];

    return await searchSimilar(query, {
        limit,
        threshold: 0.6,
        docTypes: ['evidence'],
        clientId,
    });
}

/**
 * Retrieve vendor information similar to query
 */
export async function retrieveVendorInfo(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    if (!clientId) return [];

    return await searchSimilar(query, {
        limit,
        threshold: 0.5,
        docTypes: ['vendor'],
        clientId,
    });
}

/**
 * Retrieve risks similar to query
 */
export async function retrieveRisks(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    if (!clientId) return [];

    return await searchSimilar(query, {
        limit,
        threshold: 0.5,
        docTypes: ['risk'],
        clientId,
    });
}

/**
 * Retrieve client controls similar to query
 */
export async function retrieveClientControls(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    if (!clientId) return [];

    return await searchSimilar(query, {
        limit,
        threshold: 0.5,
        docTypes: ['control'],
        clientId,
    });
}

/**
 * Retrieve knowledge articles similar to query
 */
export async function retrieveKnowledge(
    query: string,
    limit: number = 5
): Promise<RetrievalResult[]> {
    return await searchSimilar(query, {
        limit,
        threshold: 0.65,
        docTypes: ['knowledge'],
    });
}

/**
 * Retrieve knowledge base entries (Q&A) similar to query
 */
export async function retrieveKnowledgeBase(
    query: string,
    clientId?: number,
    limit: number = 5
): Promise<RetrievalResult[]> {
    if (!clientId) return [];

    return await searchSimilar(query, {
        limit,
        threshold: 0.6,
        docTypes: ['knowledge_base'],
        clientId,
    });
}

/**
 * Hybrid search: Combine semantic and keyword search
 */
export async function hybridSearch(
    query: string,
    options: RetrievalOptions = {}
): Promise<RetrievalResult[]> {
    const db = await getDb();
    if (!db) {
        throw new Error('Database not available');
    }

    // Get semantic results
    const semanticResults = await searchSimilar(query, {
        ...options,
        limit: (options.limit || 10) * 2, // Get more for reranking
    });

    // TODO: Add keyword search using full-text search
    // For now, just return semantic results
    // In future, combine with PostgreSQL full-text search and rerank

    return semanticResults.slice(0, options.limit || 10);
}
