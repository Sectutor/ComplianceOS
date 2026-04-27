/**
 * Module Scaffold Generator
 * 
 * This script creates the modular structure for a new module.
 * Run with: npx tsx scripts/generate-module.ts <module-name>
 */

import fs from 'fs';
import path from 'path';

const moduleName = process.argv[2];

if (!moduleName) {
  console.error('Please provide a module name');
  console.log('Usage: npx tsx scripts/generate-module.ts <module-name>');
  process.exit(1);
}

const modulesDir = path.resolve(__dirname, '../src/modules');
const moduleDir = path.join(modulesDir, moduleName);

// Create module directory structure
const dirs = [
  moduleDir,
  path.join(moduleDir, 'pages'),
  path.join(moduleDir, 'components'),
  path.join(moduleDir, 'hooks'),
  path.join(moduleDir, 'services'),
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created: ${dir}`);
  }
});

// Create router.ts template
const routerTemplate = `/**
 * ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module - Router
 * 
 * This module handles ${moduleName} functionality.
 * Extracted from monolithic routers.ts as part of modularization.
 */

import { z } from "zod";
import { router, clientProcedure, clientEditorProcedure, adminProcedure, protectedProcedure } from "../../../server/trpc";
import { eq, and, asc, desc, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { TRPCError } from "@trpc/server";

// Import schema from main schema (to be split later)
import { ${moduleName} } from "../../../schema";

export const ${moduleName}Router = router({
  /**
   * Example query procedure
   */
  list: clientProcedure
    .input(z.object({
      clientId: z.number(),
    }))
    .query(async ({ input }: any) => {
      const db = await getDb();
      // TODO: Implement list query
      return [];
    }),

  /**
   * Example mutation procedure
   */
  create: clientEditorProcedure
    .input(z.object({
      clientId: z.number(),
      name: z.string(),
    }))
    .mutation(async ({ input, ctx }: any) => {
      const db = await getDb();
      // TODO: Implement create mutation
      return { success: true };
    }),
});

export default ${moduleName}Router;
`;

// Create index.ts template
const indexTemplate = `/**
 * ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module - Index
 * 
 * This is the entry point for the ${moduleName} module.
 * It exports the router and provides module metadata.
 */

import type { Router } from '../../server/trpc';

// Import the router
export { ${moduleName}Router } from './router';
export { default } from './router';

// Module configuration
export const ${moduleName}ModuleConfig = {
  name: '${moduleName}',
  version: '1.0.0',
  description: '${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} module',
  permissions: [
    '${moduleName}:read',
    '${moduleName}:write',
    '${moduleName}:admin',
  ],
  dependencies: ['core', 'clients'],
} as const;
`;

// Create pages/index.ts template
const pagesIndexTemplate = `/**
 * ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module - Pages Index
 * 
 * Entry point for ${moduleName} module pages.
 */

// Route configuration for the module
export const ${moduleName}Routes = [
  // Add routes here
];
`;

fs.writeFileSync(path.join(moduleDir, 'router.ts'), routerTemplate);
fs.writeFileSync(path.join(moduleDir, 'index.ts'), indexTemplate);
fs.writeFileSync(path.join(moduleDir, 'pages', 'index.ts'), pagesIndexTemplate);

console.log(`
✅ Module '${moduleName}' scaffold created successfully!

Next steps:
1. Review and customize router.ts with actual procedures
2. Add page components to pages/ directory  
3. Update packages/core/src/routers.ts to import the new module:
   import { ${moduleName}Router } from "./modules/${moduleName}";
   
   Add to appRouter:
   ${moduleName}: ${moduleName}Router,
`);
