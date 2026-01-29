import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { controls, policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

function parseArgs() {
  const args = process.argv.slice(2);
  const out: { controls?: string; templates?: string } = {};
  for (const a of args) {
    const m = a.match(/^--(controls|templates)=(.*)$/);
    if (m) {
      const key = m[1] as 'controls' | 'templates';
      out[key] = m[2].replace(/^"|"$/g, '');
    } else if (!out.controls) {
      out.controls = a.replace(/^"|"$/g, '');
    } else if (!out.templates) {
      out.templates = a.replace(/^"|"$/g, '');
    }
  }
  return out;
}

function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  let i = 0;
  const len = content.length;
  let current: string[] = [];
  let field = '';
  let inQuotes = false;
  while (i < len) {
    const ch = content[i];
    if (inQuotes) {
      if (ch === '"') {
        if (content[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n') { current.push(field); field = ''; rows.push(current); current = []; }
      else if (ch === '\r') { /* skip */ }
      else { field += ch; }
    }
    i++;
  }
  if (field.length > 0 || current.length > 0) { current.push(field); rows.push(current); }
  const headers = (rows.shift() || []).map(h => normalizeKey(h));
  return { headers, rows };
}

function normalizeKey(k: string) {
  return k.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

function value(obj: Record<string, string>, headers: string[], keyVariants: string[]): string | undefined {
  for (const v of keyVariants) {
    const idx = headers.indexOf(v);
    if (idx !== -1) return obj[v];
  }
  return undefined;
}

async function main() {
  const args = parseArgs();
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }
  const client = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
  const db = drizzle(client);

  let controlsCreated = 0, controlsUpdated = 0;
  let templatesCreated = 0, templatesUpdated = 0;

  if (args.controls) {
    const p = path.resolve(args.controls);
    const csv = fs.readFileSync(p, 'utf-8');
    const { headers, rows } = parseCSV(csv);
    for (const row of rows) {
      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => { rec[h] = row[idx] ?? ''; });
      const controlId = value(rec, headers, ['control_id', 'controlid', 'id']);
      const name = value(rec, headers, ['name', 'control_name']);
      const description = value(rec, headers, ['description', 'desc']);
      const framework = value(rec, headers, ['framework']);
      const owner = value(rec, headers, ['owner']);
      const frequency = value(rec, headers, ['frequency']);
      const evidenceType = value(rec, headers, ['evidence_type', 'evidence']);
      const statusRaw = value(rec, headers, ['status'])?.toLowerCase();
      const category = value(rec, headers, ['category']);
      const suggestedPolicies = value(rec, headers, ['suggested_policies', 'suggested']);
      const versionStr = value(rec, headers, ['version']);
      const version = versionStr ? Number(versionStr) || 1 : 1;
      const status = statusRaw === 'active' ? 'active' : statusRaw === 'inactive' ? 'inactive' : 'draft';
      if (!controlId || !name || !framework) { continue; }
      const existing = await db.select({ id: controls.id }).from(controls).where(eq(controls.controlId, controlId)).limit(1);
      if (existing.length === 0) {
        await db.insert(controls).values({
          controlId, name, description, framework, owner, frequency, evidenceType, status: status as any, version, category, suggestedPolicies,
        });
        controlsCreated++;
      } else {
        await db.update(controls).set({
          name, description, framework, owner, frequency, evidenceType, status: status as any, version, category, suggestedPolicies,
        }).where(eq(controls.controlId, controlId));
        controlsUpdated++;
      }
    }
  }

  if (args.templates) {
    const p = path.resolve(args.templates);
    const csv = fs.readFileSync(p, 'utf-8');
    const { headers, rows } = parseCSV(csv);
    for (const row of rows) {
      const rec: Record<string, string> = {};
      headers.forEach((h, idx) => { rec[h] = row[idx] ?? ''; });
      const templateId = value(rec, headers, ['template_id', 'policy_id', 'id']);
      const name = value(rec, headers, ['name', 'policy_name']);
      const framework = value(rec, headers, ['framework']);
      const content = value(rec, headers, ['content', 'body', 'text']);
      const sectionsRaw = value(rec, headers, ['sections']);
      let sections: string[] | undefined = undefined;
      if (sectionsRaw) {
        const s = sectionsRaw.trim();
        if (s.startsWith('[')) {
          try { sections = JSON.parse(s); } catch { sections = undefined; }
        } else {
          sections = s.split(/\|\||\||;|\n/).map(x => x.trim()).filter(Boolean);
        }
      }
      if (!templateId || !name) { continue; }
      const existing = await db.select({ id: policyTemplates.id }).from(policyTemplates).where(eq(policyTemplates.templateId, templateId)).limit(1);
      if (existing.length === 0) {
        await db.insert(policyTemplates).values({ templateId, name, framework, content, sections });
        templatesCreated++;
      } else {
        await db.update(policyTemplates).set({ name, framework, content, sections }).where(eq(policyTemplates.templateId, templateId));
        templatesUpdated++;
      }
    }
  }

  console.log(`[Import] Controls created: ${controlsCreated}, updated: ${controlsUpdated}`);
  console.log(`[Import] Templates created: ${templatesCreated}, updated: ${templatesUpdated}`);
  await client.end({ timeout: 5 });
}

main().catch(err => { console.error(err); process.exit(1); });

