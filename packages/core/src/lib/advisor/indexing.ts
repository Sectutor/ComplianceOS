import { getDb } from '../../db';
import { embeddings } from '../../schema';
import { generateEmbedding, prepareTextForEmbedding, createSearchableText } from './embeddings';
import { eq, and } from 'drizzle-orm';
import { logger } from '../logger';

export interface IndexingResult {
    docId: string;
    chunks: number;
    tokens: number;
}

export class IndexingService {
    /**
     * Index a comprehensive document
     * Splits into chunks, embeds each, and stores in the DB
     */
    static async indexDocument(
        clientId: number,
        docType: string,
        docId: string,
        content: string | Record<string, any>,
        metadata: Record<string, any> = {}
    ): Promise<IndexingResult> {
        if (!clientId) throw new Error('Client ID is required for indexing');

        const db = await getDb();
        const startTime = Date.now();

        // 1. Prepare text content
        const textContent = typeof content === 'string'
            ? content
            : createSearchableText(content);

        if (!textContent || textContent.trim().length === 0) {
            logger.warn(`[Indexing] Skipping empty document: ${docType}/${docId}`);
            return { docId, chunks: 0, tokens: 0 };
        }

        // 2. Remove existing chunks for this document to avoid duplicates
        await this.deleteDocumentIndex(clientId, docType, docId);

        // 3. Chunk the text
        const chunks = prepareTextForEmbedding(textContent);

        // 4. Generate embeddings and store
        let totalTokens = 0;
        let indexedChunks = 0;

        // Process sequentially to keep memory usage predictable (embeddings can be large)
        for (let i = 0; i < chunks.length; i++) {
            const chunkText = chunks[i];
            try {
                const { embedding, tokens } = await generateEmbedding(chunkText);
                totalTokens += tokens;

                await db.insert(embeddings).values({
                    clientId,
                    docType,
                    docId: docId.toString(),
                    content: chunkText,
                    embeddingVector: embedding,
                    metadata: {
                        ...metadata,
                        chunkIndex: i,
                        totalChunks: chunks.length
                    },
                    createdAt: new Date(),
                });

                indexedChunks++;
            } catch (error) {
                logger.error(`[Indexing] Failed to index chunk ${i} for ${docType}/${docId}:`, error);
                // Continue with next chunk? Or fail hard?
                // For RAG, partial indexing is better than nothing, but we log error.
            }
        }

        const duration = Date.now() - startTime;
        logger.info(`[Indexing] Indexed ${docType}/${docId} (${indexedChunks} chunks) in ${duration}ms`);

        return {
            docId,
            chunks: indexedChunks,
            tokens: totalTokens
        };
    }

    /**
     * Delete all embeddings for a specific document
     */
    static async deleteDocumentIndex(
        clientId: number,
        docType: string,
        docId: string
    ): Promise<void> {
        const db = await getDb();
        await db.delete(embeddings)
            .where(
                and(
                    eq(embeddings.clientId, clientId),
                    eq(embeddings.docType, docType),
                    eq(embeddings.docId, docId.toString())
                )
            );
    }

    /**
     * Re-index an existing entity by fetching it from DB and passing to indexDocument
     * (Placeholder for future implementation where we pass entity loaders)
     */
    static async reindexEntity(
        clientId: number,
        entityType: 'policy' | 'control' | 'evidence',
        entityId: number
    ): Promise<void> {
        // Implementation depends on having access to entity data loaders
        // This will be called by admin tools
    }
}
