/**
 * Technology Catalog Loader
 * Loads and parses YAML technology catalogs
 */

import fs from 'fs';
import path from 'path';
import { parse as parseYaml } from 'yaml';
import type { TechCatalog, ControlTechMapping, Technology } from './types';

const CATALOG_DIR = path.join(process.cwd(), 'data', 'catalog');

/**
 * Load all technology catalogs from the data/catalog directory
 */
export async function loadAllCatalogs(): Promise<Map<string, TechCatalog>> {
    const catalogs = new Map<string, TechCatalog>();

    try {
        if (!fs.existsSync(CATALOG_DIR)) {
            console.warn(`Catalog directory not found: ${CATALOG_DIR}`);
            return catalogs;
        }

        const files = fs.readdirSync(CATALOG_DIR);
        const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

        for (const file of yamlFiles) {
            try {
                const catalog = await loadCatalog(file);
                catalogs.set(catalog.framework, catalog);
                console.log(`✅ Loaded catalog: ${catalog.framework} (${catalog.controls.length} controls)`);
            } catch (error) {
                console.error(`Failed to load catalog ${file}:`, error);
            }
        }
    } catch (error) {
        console.error('Error loading catalogs:', error);
    }

    return catalogs;
}

/**
 * Load a specific catalog file
 */
export async function loadCatalog(filename: string): Promise<TechCatalog> {
    const filePath = path.join(CATALOG_DIR, filename);

    if (!fs.existsSync(filePath)) {
        throw new Error(`Catalog file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const catalog = parseYaml(content) as TechCatalog;

    // Validate catalog structure
    if (!catalog.version || !catalog.framework || !catalog.controls) {
        throw new Error(`Invalid catalog structure in ${filename}`);
    }

    return catalog;
}

/**
 * Load catalog for a specific framework
 */
export async function getCatalogByFramework(framework: string): Promise<TechCatalog | null> {
    const catalogs = await loadAllCatalogs();

    // Try exact match first
    if (catalogs.has(framework)) {
        return catalogs.get(framework)!;
    }

    // Try case-insensitive match
    for (const [key, catalog] of catalogs) {
        if (key.toLowerCase() === framework.toLowerCase()) {
            return catalog;
        }
    }

    return null;
}

/**
 * Find technologies for a specific control
 */
export async function getTechnologiesForControl(
    framework: string,
    controlCode: string
): Promise<Technology[]> {
    const catalog = await getCatalogByFramework(framework);

    if (!catalog) {
        console.warn(`No catalog found for framework: ${framework}`);
        return [];
    }

    const control = catalog.controls.find(c => c.code === controlCode);

    if (!control) {
        console.warn(`Control ${controlCode} not found in ${framework} catalog`);
        return [];
    }

    return control.technologies || [];
}

/**
 * Search technologies across all catalogs
 */
export async function searchTechnologies(query: string, framework?: string): Promise<Array<{
    framework: string;
    controlCode: string;
    controlName: string;
    technology: Technology;
}>> {
    const results: Array<{
        framework: string;
        controlCode: string;
        controlName: string;
        technology: Technology;
    }> = [];

    const catalogs = await loadAllCatalogs();
    const lowerQuery = query.toLowerCase();

    for (const [frameworkName, catalog] of catalogs) {
        // Skip if framework filter is provided and doesn't match
        if (framework && frameworkName.toLowerCase() !== framework.toLowerCase()) {
            continue;
        }

        for (const control of catalog.controls) {
            for (const tech of control.technologies) {
                // Search in tech name, vendor, service, description
                const searchText = `${tech.vendor} ${tech.service} ${tech.description}`.toLowerCase();

                if (searchText.includes(lowerQuery)) {
                    results.push({
                        framework: frameworkName,
                        controlCode: control.code,
                        controlName: control.name,
                        technology: tech,
                    });
                }
            }
        }
    }

    return results;
}

/**
 * Get all unique vendors from catalogs
 */
export async function getAllVendors(): Promise<string[]> {
    const catalogs = await loadAllCatalogs();
    const vendors = new Set<string>();

    for (const catalog of catalogs.values()) {
        for (const control of catalog.controls) {
            for (const tech of control.technologies) {
                vendors.add(tech.vendor);
            }
        }
    }

    return Array.from(vendors).sort();
}

/**
 * Get catalog statistics
 */
export async function getCatalogStats(): Promise<{
    totalCatalogs: number;
    totalControls: number;
    totalTechnologies: number;
    frameworks: string[];
}> {
    const catalogs = await loadAllCatalogs();
    let totalControls = 0;
    let totalTechnologies = 0;

    for (const catalog of catalogs.values()) {
        totalControls += catalog.controls.length;
        for (const control of catalog.controls) {
            totalTechnologies += control.technologies.length;
        }
    }

    return {
        totalCatalogs: catalogs.size,
        totalControls,
        totalTechnologies,
        frameworks: Array.from(catalogs.keys()),
    };
}

// Singleton cache
let catalogCache: Map<string, TechCatalog> | null = null;

/**
 * Get cached catalogs (load once, reuse)
 */
export async function getCachedCatalogs(): Promise<Map<string, TechCatalog>> {
    if (!catalogCache) {
        catalogCache = await loadAllCatalogs();
    }
    return catalogCache;
}

/**
 * Clear catalog cache (useful for testing or hot-reload)
 */
export function clearCatalogCache(): void {
    catalogCache = null;
}
