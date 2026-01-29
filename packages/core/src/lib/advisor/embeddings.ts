/**
 * Embedding Generation Utility
 * Uses the global LLM provider system via LLMService
 */

import { llmService } from '../llm/service';

export interface EmbeddingResult {
    embedding: number[];
    tokens: number;
}

/**
 * Generate embedding for a single text using the centralized LLMService
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
    }

    try {
        const embedding = await llmService.getEmbeddings(text);

        // Note: llmService.getEmbeddings doesn't currently return token count in the return value
        // but it tracks it internally. We'll estimate it here for the return type compatibility
        // or just return 0 if precise count isn't critical for the caller immediately.
        const estimatedTokens = Math.ceil(text.length / 4);

        return {
            embedding,
            tokens: estimatedTokens,
        };
    } catch (error: any) {
        console.error('Embedding generation failed:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Generate embeddings for multiple texts in batch
 * Automatically handles batching to stay within API limits
 */
export async function generateEmbeddingsBatch(
    texts: string[],
    batchSize: number = 100
): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
        return [];
    }

    const results: EmbeddingResult[] = [];

    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        try {
            // Note: llmService.getEmbeddings is single-text for now.
            // We'll iterate the batch. Efficiency improvement: Updating llmService to support batching later.
            // For now, parallelize slightly or sequential.

            const batchPromises = batch.map(text => generateEmbedding(text));
            const batchResults = await Promise.all(batchPromises);

            results.push(...batchResults);

            console.log(`✅ Generated embeddings for batch ${i / batchSize + 1} (${batch.length} items)`);
        } catch (error: any) {
            console.error(`Batch ${i / batchSize + 1} failed:`, error);
            throw new Error(`Failed to generate embeddings for batch: ${error.message}`);
        }
    }

    return results;
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Prepare text for embedding (chunking for long documents)
 */
export function prepareTextForEmbedding(
    text: string,
    maxTokens: number = 1024
): string[] {
    // Simple chunking strategy: split by paragraphs/sections
    const chunks: string[] = [];
    const paragraphs = text.split(/\n\n+/);

    let currentChunk = '';

    for (const para of paragraphs) {
        // Rough token estimation: ~4 chars per token
        const estimatedTokens = (currentChunk + para).length / 4;

        if (estimatedTokens > maxTokens && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            currentChunk = para;
        } else {
            currentChunk += (currentChunk ? '\n\n' : '') + para;
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
}

/**
 * Create a searchable text summary from an object
 */
export function createSearchableText(obj: Record<string, any>): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        if (value == null) continue;

        if (typeof value === 'string') {
            parts.push(value);
        } else if (typeof value === 'number') {
            parts.push(value.toString());
        } else if (Array.isArray(value)) {
            parts.push(value.join(' '));
        } else if (typeof value === 'object') {
            parts.push(createSearchableText(value));
        }
    }

    return parts.join(' ').trim();
}


/**
 * Generate embeddings for multiple texts in batch
 * Automatically handles batching to stay within API limits
 */



