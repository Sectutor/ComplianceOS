/**
 * Additive loader for the LaTorre LTD (client 7) standard demo dataset.
 *
 * The fixture (scripts/demo-fixture/client7.json.gz) is exported from a fully
 * populated local client 7 by scripts/demo-fixture/export-client7-fixture.mjs.
 * At boot this loader inserts whatever is missing for client 7 only:
 *   - never deletes or updates existing application rows, never touches other
 *     clients or users;
 *   - every inserted row gets a fresh id; foreign keys between fixture rows are
 *     remapped, user references are bound to the deployment's admin user, global
 *     catalog references (controls, compliance_frameworks, policy_templates) are
 *     resolved by natural key;
 *   - rows that already exist for client 7 (same natural key, e.g. vendor name,
 *     risk assessment code, evidence code) are reused instead of duplicated;
 *   - bookkeeping lives in demo_fixture_map (fixture id -> real id), so re-runs
 *     insert nothing and rows removed by a reset are restored on the next boot.
 *
 * Opt out with DEMO_FIXTURE_DISABLE=true. Override the file with DEMO_FIXTURE_PATH.
 */
import { existsSync, readFileSync } from "fs";
import path from "path";
import zlib from "zlib";
import crypto from "crypto";
import type postgres from "postgres";

type Ref = string | null | { global: string } | { poly: string; map: Record<string, string | string[]> };
interface FixtureTable {
    table: string;
    child: boolean;
    key: string[] | null;
    singleton: boolean;
    refs: Record<string, Ref>;
    rows: Record<string, any>[];
}
interface Fixture {
    version: number;
    clientId: number;
    tables: FixtureTable[];
    globals: Record<string, { key: string[]; rows: Record<string, Record<string, any>>; full?: Record<string, Record<string, any>> }>;
}

const MAP_TABLE = "demo_fixture_map";
const CHUNK = 400;
const q = (id: string) => `"${id.replace(/"/g, '""')}"`;

function findFixture(): string | null {
    const candidates = [
        process.env.DEMO_FIXTURE_PATH,
        path.resolve(process.cwd(), "scripts/demo-fixture/client7.json.gz"),
        typeof __dirname !== "undefined" ? path.resolve(__dirname, "demo-fixture/client7.json.gz") : undefined,
    ].filter(Boolean) as string[];
    return candidates.find((p) => existsSync(p)) || null;
}

export async function loadClient7Fixture(sql: postgres.Sql, log: (m: string) => void = (m) => console.log(`[DemoFixture] ${m}`)) {
    if (process.env.DEMO_FIXTURE_DISABLE === "true") { log("disabled via DEMO_FIXTURE_DISABLE"); return; }
    const file = findFixture();
    if (!file) { log("fixture file not found - skipping"); return; }
    const fx: Fixture = JSON.parse(zlib.gunzipSync(readFileSync(file)).toString("utf8"));
    const CID = fx.clientId;

    const client = await sql.unsafe(`SELECT id FROM public.clients WHERE id = ${CID}`);
    if (!client.length) { log(`client ${CID} does not exist - skipping`); return; }

    await sql.unsafe(`CREATE TABLE IF NOT EXISTS public.${MAP_TABLE} (
        tbl text NOT NULL, fixture_id integer NOT NULL, real_id integer NOT NULL,
        created_at timestamp DEFAULT now(), PRIMARY KEY (tbl, fixture_id))`);

    // Admin user that stands in for every user reference in the fixture.
    const adminEmail = (process.env.COMPLIANCE_ADMIN_EMAIL || "admin@complianceos.local").toLowerCase();
    const u = await sql.unsafe(
        `SELECT id FROM public.users WHERE deleted_at IS NULL ORDER BY (lower(email) = $1) DESC,
         (role IN ('super_admin','platform_admin','owner','admin')) DESC, id LIMIT 1`, [adminEmail]);
    const userId: number | null = u.length ? Number(u[0].id) : null;
    if (userId == null) log("no user yet - rows that require a user are deferred to the next boot");

    // Global catalogs, resolved by natural key.
    const globalMap: Record<string, Map<string, number>> = {};
    let addedGlobals = 0;
    for (const [g, spec] of Object.entries(fx.globals || {})) {
        const m = new Map<string, number>();
        try {
            const rows = await sql.unsafe(`SELECT id, ${spec.key.map((c) => `${q(c)}::text AS ${q(c)}`).join(", ")} FROM public.${q(g)}`);
            const byKey = new Map<string, number>();
            for (const r of rows as any[]) byKey.set(JSON.stringify(spec.key.map((c) => r[c] ?? null)), Number(r.id));
            const missing: [string, Record<string, any>][] = [];
            for (const [fid, keyRow] of Object.entries(spec.rows)) {
                const real = byKey.get(JSON.stringify(spec.key.map((c) => (keyRow[c] == null ? null : String(keyRow[c])))));
                if (real != null) m.set(String(fid), real);
                else if (spec.full?.[fid]) missing.push([fid, spec.full[fid]]);
            }
            // Catalog entries the client data depends on but this deployment lacks (e.g. NIS2 /
            // OWASP controls): add them to the shared catalog so the client rows can point at them.
            if (missing.length) {
                const avail = new Set((await sql.unsafe(
                    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND is_generated <> 'ALWAYS'`, [g]) as any[])
                    .map((c) => c.column_name));
                const seq = (await sql.unsafe(`SELECT pg_get_serial_sequence($1, 'id') AS s`, [`public.${q(g)}`]) as any[])[0]?.s;
                for (const [fid, full] of missing) {
                    try {
                        const row: Record<string, any> = {};
                        for (const [c, v] of Object.entries(full)) if (avail.has(c) && c !== "id") row[c] = v;
                        row.id = Number((await sql.unsafe(`SELECT nextval($1::regclass)::int AS id`, [seq]) as any[])[0].id);
                        const colSql = Object.keys(row).map(q).join(", ");
                        await sql.begin(async (tx: any) => {
                            await tx.unsafe(`INSERT INTO public.${q(g)} (${colSql}) SELECT ${colSql} FROM json_populate_recordset(NULL::public.${q(g)}, $1::text::json)`, [JSON.stringify([row])]);
                            await tx.unsafe(`INSERT INTO public.${MAP_TABLE} (tbl, fixture_id, real_id) VALUES ($1, $2::text::int, $3::text::int) ON CONFLICT (tbl, fixture_id) DO UPDATE SET real_id = EXCLUDED.real_id`, [`global:${g}`, String(fid), String(row.id)]);
                        });
                        m.set(String(fid), row.id);
                        addedGlobals++;
                    } catch (e: any) { log(`could not add ${g} ${JSON.stringify(spec.rows[fid])}: ${String(e?.message || e).slice(0, 120)}`); }
                }
            }
        } catch (e: any) { log(`global ${g} unavailable: ${e?.message || e}`); }
        globalMap[g] = m;
    }

    const maps: Record<string, Map<string, number>> = {};
    const summary: string[] = [];
    let totalInserted = 0, totalSkipped = 0;

    for (const t of fx.tables) {
        const res = { inserted: 0, matched: 0, kept: 0, skipped: 0, failed: 0, err: "" };
        const m = new Map<string, number>();
        maps[t.table] = m;
        try {
            const colInfo = await sql.unsafe(
                `SELECT column_name, is_nullable, column_default, is_generated FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1`, [t.table]) as any[];
            if (!colInfo.length) { summary.push(`${t.table}: table missing`); continue; }
            const cols = new Map(colInfo.filter((c) => c.is_generated !== "ALWAYS").map((c) => [c.column_name, c]));
            const required = new Set([...cols.values()].filter((c) => c.is_nullable === "NO" && c.column_default == null).map((c) => c.column_name));
            const hasClient = cols.has("client_id");
            const scope = hasClient ? ` AND client_id = ${CID}` : "";

            // 1. Previously loaded rows that still exist.
            const prev = await sql.unsafe(`SELECT fixture_id, real_id FROM public.${MAP_TABLE} WHERE tbl = $1`, [t.table]) as any[];
            if (prev.length) {
                const alive = new Set((await sql.unsafe(
                    `SELECT id FROM public.${q(t.table)} WHERE id IN (SELECT (jsonb_array_elements_text($1::text::jsonb))::int)${scope}`,
                    [JSON.stringify(prev.map((p) => Number(p.real_id)))]) as any[]).map((r) => Number(r.id)));
                for (const p of prev) if (alive.has(Number(p.real_id))) { m.set(String(p.fixture_id), Number(p.real_id)); res.kept++; }
            }

            const resolveRef = (row: Record<string, any>, col: string, ref: Ref): { v: any; ok: boolean } => {
                const v = row[col];
                if (ref === null) return { v: null, ok: true };
                if (v == null) return { v: null, ok: true };
                if (ref === "user") return { v: userId, ok: userId != null };
                if (typeof ref === "string") { const r = maps[ref]?.get(String(v)); return { v: r ?? null, ok: r != null }; }
                if ("global" in ref) { const r = globalMap[ref.global]?.get(String(v)); return { v: r ?? null, ok: r != null }; }
                // polymorphic: unknown types / unmapped ids keep their value
                const targets = ref.map[row[ref.poly]];
                for (const tt of ([] as string[]).concat(targets || [])) { const r = maps[tt]?.get(String(v)); if (r != null) return { v: r, ok: true }; }
                return { v, ok: true };
            };

            // 2. Natural-key matches against existing client rows.
            const pending = t.rows.filter((r) => !m.has(String(r.id)));
            if (pending.length && hasClient && (t.singleton || t.key)) {
                const used = new Set(m.values());
                const keyCols = t.singleton ? [] : (t.key as string[]).filter((c) => cols.has(c));
                if (t.singleton || keyCols.length === (t.key as string[]).length) {
                    const existing = await sql.unsafe(
                        `SELECT id${keyCols.map((c) => `, ${q(c)}::text AS ${q(c)}`).join("")} FROM public.${q(t.table)} WHERE client_id = ${CID} ORDER BY id`) as any[];
                    const byKey = new Map<string, number>();
                    for (const e of existing) {
                        if (used.has(Number(e.id))) continue;
                        const k = JSON.stringify(keyCols.map((c) => e[c] ?? null));
                        if (!byKey.has(k)) byKey.set(k, Number(e.id));
                    }
                    for (const r of pending) {
                        const k = JSON.stringify(keyCols.map((c) => {
                            const ref = t.refs[c];
                            const v = ref !== undefined ? resolveRef(r, c, ref).v : r[c];
                            return v == null ? null : (typeof v === "object" ? JSON.stringify(v) : String(v));
                        }));
                        const hit = byKey.get(k);
                        if (hit != null) { m.set(String(r.id), hit); byKey.delete(k); res.matched++; }
                    }
                    if (res.matched) await saveMap(sql, t.table, pending.filter((r) => m.has(String(r.id))).map((r) => [Number(r.id), m.get(String(r.id))!]));
                }
            }

            // 3. Insert the rest with pre-allocated ids so in-table references resolve.
            const toInsert = t.rows.filter((r) => !m.has(String(r.id)));
            if (toInsert.length) {
                const seqRow = await sql.unsafe(`SELECT pg_get_serial_sequence($1, 'id') AS s`, [`public.${q(t.table)}`]) as any[];
                const seq = seqRow[0]?.s;
                if (!seq) throw new Error("no id sequence");
                const ids = (await sql.unsafe(`SELECT nextval($1::regclass)::int AS id FROM generate_series(1, ${toInsert.length})`, [seq]) as any[]).map((r) => Number(r.id));
                toInsert.forEach((r, i) => m.set(String(r.id), ids[i]));

                const prepared: { fid: number; rid: number; row: Record<string, any> }[] = [];
                for (const r of toInsert) {
                    const out: Record<string, any> = {};
                    let ok = true;
                    for (const [c, v] of Object.entries(r)) {
                        if (!cols.has(c)) continue;
                        if (c === "id") { out.id = m.get(String(r.id)); continue; }
                        if (c === "client_id") { out.client_id = CID; continue; }
                        if (c in t.refs) {
                            const rr = resolveRef(r, c, t.refs[c]);
                            if (!rr.ok && required.has(c)) ok = false;
                            out[c] = rr.ok ? rr.v : (typeof t.refs[c] === "object" && t.refs[c] && "poly" in (t.refs[c] as any) ? v : null);
                            continue;
                        }
                        out[c] = v === "__TOKEN__" ? crypto.randomBytes(24).toString("hex") : v;
                    }
                    if (!ok) { m.delete(String(r.id)); res.skipped++; continue; }
                    prepared.push({ fid: Number(r.id), rid: out.id, row: out });
                }

                const insertBatch = async (batch: typeof prepared) => {
                    const colList = [...new Set(batch.flatMap((b) => Object.keys(b.row)))];
                    const colSql = colList.map(q).join(", ");
                    await sql.begin(async (tx: any) => {
                        await tx.unsafe(
                            `INSERT INTO public.${q(t.table)} (${colSql}) SELECT ${colSql} FROM json_populate_recordset(NULL::public.${q(t.table)}, $1::text::json)`,
                            [JSON.stringify(batch.map((b) => b.row))]);
                        await tx.unsafe(
                            `INSERT INTO public.${MAP_TABLE} (tbl, fixture_id, real_id) SELECT $1::text, f, r FROM json_to_recordset($2::text::json) AS x(f int, r int)
                             ON CONFLICT (tbl, fixture_id) DO UPDATE SET real_id = EXCLUDED.real_id`,
                            [t.table, JSON.stringify(batch.map((b) => ({ f: b.fid, r: b.rid })))]);
                    });
                };
                for (let i = 0; i < prepared.length; i += CHUNK) {
                    const batch = prepared.slice(i, i + CHUNK);
                    try { await insertBatch(batch); res.inserted += batch.length; }
                    catch {
                        for (const b of batch) {
                            try { await insertBatch([b]); res.inserted++; }
                            catch (e: any) { m.delete(String(b.fid)); res.failed++; res.err ||= String(e?.message || e).slice(0, 160); }
                        }
                    }
                }
            }
        } catch (e: any) {
            res.err ||= String(e?.message || e).slice(0, 160);
        }
        totalInserted += res.inserted; totalSkipped += res.skipped + res.failed;
        if (res.inserted || res.matched || res.skipped || res.failed || res.err)
            summary.push(`${t.table}: +${res.inserted} (matched ${res.matched}, kept ${res.kept}${res.skipped ? `, deferred ${res.skipped}` : ""}${res.failed ? `, failed ${res.failed}` : ""})${res.err ? ` err: ${res.err}` : ""}`);
    }
    log(`client ${CID}: ${totalInserted} rows inserted, ${totalSkipped} skipped/failed${addedGlobals ? `, ${addedGlobals} catalog entries added` : ""}`);
    for (const s of summary) log(`  ${s}`);
}

async function saveMap(sql: postgres.Sql, tbl: string, pairs: [number, number][]) {
    if (!pairs.length) return;
    await sql.unsafe(
        `INSERT INTO public.${MAP_TABLE} (tbl, fixture_id, real_id) SELECT $1::text, f, r FROM json_to_recordset($2::text::json) AS x(f int, r int)
         ON CONFLICT (tbl, fixture_id) DO UPDATE SET real_id = EXCLUDED.real_id`,
        [tbl, JSON.stringify(pairs.map(([f, r]) => ({ f, r })))]);
}
