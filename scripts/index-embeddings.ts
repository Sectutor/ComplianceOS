/**
 * Embedding Indexing Script
 * Indexes controls, policies, and catalog for semantic search
 */

// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { controls, policyTemplates, controlTechMappings, embeddings } from '../schema';
import { generateEmbedding, generateEmbeddingsBatch, createSearchableText } from '../lib/advisor/embeddings';
import { loadAllCatalogs } from '../lib/advisor/catalog';
import { eq } from 'drizzle-orm';

interface IndexProgress {
    total: number;
    indexed: number;
    failed: number;
    skipped: number;
}

/**
 * Index all controls
 */
async function indexControls(): Promise<IndexProgress> {
    console.log('\n📚 Indexing controls...');
    const progress: IndexProgress = { total: 0, indexed: 0, failed: 0, skipped: 0 };

    const db = await getDb();
    if (!db) {
        console.error('Database not available');
        return progress;
    }

    const allControls = await db.select().from(controls);
    progress.total = allControls.length;

    for (const control of allControls) {
        try {
            const searchText = createSearchableText({
                controlId: control.controlId,
                name: control.name,
                description: control.description,
                framework: control.framework,
                category: control.category,
                implementationGuidance: control.implementationGuidance,
            });

            const { embedding: embVector } = await generateEmbedding(searchText);

            // Check if already indexed
            const existing = await db
                .select()
                .from(embeddings)
                .where(eq(embeddings.docId, control.id.toString()))
                .limit(1);

            if (existing.length > 0) {
                // Update existing
                await db
                    .update(embeddings)
                    .set({
                        embeddingData: JSON.stringify(embVector),
                        embeddingVector: embVector,
                        content: searchText,
                        metadata: {
                            controlId: control.controlId,
                            name: control.name,
                            framework: control.framework,
                            category: control.category,
                        },
                    })
                    .where(eq(embeddings.id, existing[0].id));
                progress.skipped++;
            } else {
                // Insert new
                await db.insert(embeddings).values({
                    docId: control.id.toString(),
                    docType: 'control',
                    embeddingData: JSON.stringify(embVector),
                    embeddingVector: embVector,
                    content: searchText,
                    metadata: {
                        controlId: control.controlId,
                        name: control.name,
                        framework: control.framework,
                        category: control.category,
                    },
                });
                progress.indexed++;
            }

            if ((progress.indexed + progress.skipped) % 10 === 0) {
                console.log(`  Progress: ${progress.indexed + progress.skipped}/${progress.total}`);
            }
        } catch (error) {
            console.error(`Failed to index control ${control.controlId}:`, error);
            progress.failed++;
        }
    }

    console.log(`✅ Controls: ${progress.indexed} indexed, ${progress.skipped} updated, ${progress.failed} failed`);
    return progress;
}

/**
 * Index policy templates
 */
async function indexPolicyTemplates(): Promise<IndexProgress> {
    console.log('\n📄 Indexing policy templates...');
    const progress: IndexProgress = { total: 0, indexed: 0, failed: 0, skipped: 0 };

    const db = await getDb();
    if (!db) return progress;

    const templates = await db.select().from(policyTemplates);
    progress.total = templates.length;

    for (const template of templates) {
        try {
            const searchText = createSearchableText({
                templateId: template.templateId,
                name: template.name,
                content: template.content,
                frameworks: template.frameworks,
            });

            const { embedding: embVector } = await generateEmbedding(searchText);

            const existing = await db
                .select()
                .from(embeddings)
                .where(eq(embeddings.docId, `template-${template.id}`))
                .limit(1);

            if (existing.length > 0) {
                await db
                    .update(embeddings)
                    .set({
                        embeddingData: JSON.stringify(embVector),
                        embeddingVector: embVector,
                        content: searchText,
                        metadata: {
                            templateId: template.templateId,
                            name: template.name,
                            frameworks: template.frameworks,
                        },
                    })
                    .where(eq(embeddings.id, existing[0].id));
                progress.skipped++;
            } else {
                await db.insert(embeddings).values({
                    docId: `template-${template.id}`,
                    docType: 'policy_template',
                    embeddingData: JSON.stringify(embVector),
                    embeddingVector: embVector,
                    content: searchText,
                    metadata: {
                        templateId: template.templateId,
                        name: template.name,
                        frameworks: template.frameworks,
                    },
                });
                progress.indexed++;
            }
        } catch (error) {
            console.error(`Failed to index template ${template.templateId}:`, error);
            progress.failed++;
        }
    }

    console.log(`✅ Policy templates: ${progress.indexed} indexed, ${progress.skipped} updated, ${progress.failed} failed`);
    return progress;
}

/**
 * Index technology catalog from YAML files
 */
async function indexCatalog(): Promise<IndexProgress> {
    console.log('\n🛠️  Indexing technology catalog...');
    const progress: IndexProgress = { total: 0, indexed: 0, failed: 0, skipped: 0 };

    const db = await getDb();
    if (!db) return progress;

    try {
        const catalogs = await loadAllCatalogs();

        for (const [framework, catalog] of catalogs) {
            for (const control of catalog.controls) {
                for (const tech of control.technologies) {
                    progress.total++;

                    try {
                        const searchText = createSearchableText({
                            techId: tech.id,
                            vendor: tech.vendor,
                            service: tech.service,
                            description: tech.description,
                            controlCode: control.code,
                            controlName: control.name,
                            framework,
                        });

                        const { embedding: embVector } = await generateEmbedding(searchText);

                        // Check if technology is already in control_tech_mappings table
                        const existing = await db
                            .select()
                            .from(controlTechMappings)
                            .where(eq(controlTechMappings.techId, tech.id))
                            .limit(1);

                        let mappingId: number;

                        if (existing.length > 0) {
                            mappingId = existing[0].id;
                            progress.skipped++;
                        } else {
                            // Insert into control_tech_mappings
                            const [inserted] = await db.insert(controlTechMappings).values({
                                controlCode: control.code,
                                framework,
                                techId: tech.id,
                                vendor: tech.vendor,
                                serviceName: tech.service,
                                description: tech.description,
                                pros: tech.pros,
                                cons: tech.cons,
                                implementationEffort: tech.implementation_effort,
                                maturityLevel: tech.maturity_level,
                                references: tech.references,
                            }).returning();

                            mappingId = inserted.id;
                        }

                        // Index embedding
                        const existingEmb = await db
                            .select()
                            .from(embeddings)
                            .where(eq(embeddings.docId, mappingId.toString()))
                            .limit(1);

                        if (existingEmb.length > 0) {
                            await db
                                .update(embeddings)
                                .set({
                                    embeddingData: JSON.stringify(embVector),
                                    embeddingVector: embVector,
                                    content: searchText,
                                    metadata: {
                                        techId: tech.id,
                                        vendor: tech.vendor,
                                        controlCode: control.code,
                                        framework,
                                    },
                                })
                                .where(eq(embeddings.id, existingEmb[0].id));
                        } else {
                            await db.insert(embeddings).values({
                                docId: mappingId.toString(),
                                docType: 'catalog',
                                embeddingData: JSON.stringify(embVector),
                                embeddingVector: embVector,
                                content: searchText,
                                metadata: {
                                    techId: tech.id,
                                    vendor: tech.vendor,
                                    controlCode: control.code,
                                    framework,
                                },
                            });
                            progress.indexed++;
                        }

                        if ((progress.indexed + progress.skipped) % 5 === 0) {
                            console.log(`  Progress: ${progress.indexed + progress.skipped}/${progress.total}`);
                        }
                    } catch (error) {
                        console.error(`Failed to index tech ${tech.id}:`, error);
                        progress.failed++;
                    }
                }
            }
        }

        console.log(`✅ Catalog: ${progress.indexed} indexed, ${progress.skipped} updated, ${progress.failed} failed`);
    } catch (error) {
        console.error('Catalog indexing failed:', error);
    }

    return progress;
}

/**
 * Main indexing function
 */
async function main() {
    console.log('🚀 Starting embedding indexing...\n');
    console.log('This will generate embeddings for:');
    console.log('  - Controls');
    console.log('  - Policy templates');
    console.log('  - Technology catalog');
    console.log('\n⚠️  Note: This will use LLM API and may incur costs.\n');

    const startTime = Date.now();

    try {
        const controlsProgress = await indexControls();
        const templatesProgress = await indexPolicyTemplates();
        const catalogProgress = await indexCatalog();

        const totalIndexed = controlsProgress.indexed + templatesProgress.indexed + catalogProgress.indexed;
        const totalSkipped = controlsProgress.skipped + templatesProgress.skipped + catalogProgress.skipped;
        const totalFailed = controlsProgress.failed + templatesProgress.failed + catalogProgress.failed;

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('\n' + '='.repeat(60));
        console.log('✅ Indexing complete!');
        console.log('='.repeat(60));
        console.log(`Total indexed: ${totalIndexed}`);
        console.log(`Total updated: ${totalSkipped}`);
        console.log(`Total failed: ${totalFailed}`);
        console.log(`Duration: ${duration}s`);
        console.log('='.repeat(60));
    } catch (error) {
        console.error('\n❌ Indexing failed:', error);
        process.exit(1);
    }
}

// Run main function
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });

export { indexControls, indexPolicyTemplates, indexCatalog };
