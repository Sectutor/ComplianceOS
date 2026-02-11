import fs from 'fs';
import path from 'path';
import { OPEN_SSF_DATA } from '../packages/core/src/scripts/import_openssf'; // Assuming we can import this, or copy the data structure
import { PluginPackage } from '../packages/core/src/server/lib/pluginParser';

// Start with OpenSSF as proof of concept
const openssfPlugin: PluginPackage = {
    manifest: {
        id: "openssf-best-practices-1.0",
        slug: OPEN_SSF_DATA.shortCode,
        name: OPEN_SSF_DATA.name,
        version: OPEN_SSF_DATA.version,
        author: "OpenSSF (Packaged by ComplianceOS)",
        description: OPEN_SSF_DATA.description,
        type: "General", // Mapping 'Framework' to a known enum for now
        tags: ["software-supply-chain", "open-source"],
        icon: "shield"
    },
    content: {
        phases: OPEN_SSF_DATA.domains.map((d: any, idx: number) => ({
            name: d.name,
            description: d.description,
            order: idx + 1
        })),
        requirements: OPEN_SSF_DATA.domains.flatMap((d: any) =>
            d.controls.map((c: any) => ({
                identifier: c.id,
                title: c.title,
                description: c.description,
                guidance: c.guidance,
                phaseName: d.name,
                mappingTags: []
            }))
        )
    }
};

const outputPath = path.resolve(process.cwd(), 'data/registry/plugins/openssf.json');
fs.writeFileSync(outputPath, JSON.stringify(openssfPlugin, null, 2));
console.log(`Migrated OpenSSF to ${outputPath}`);
