/**
 * Demo Data Engine — shared utilities (plain ESM, runs under node --env-file=.env)
 * Deterministic RNG => identical dataset every regeneration.
 */

export class Rng {
  constructor(seed = 20260824) { this.s = seed >>> 0; }
  next() {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min, max) { return Math.floor(this.next() * (max - min + 1)) + min; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  weighted(pairs) {
    const total = pairs.reduce((a, p) => a + p[1], 0);
    let r = this.next() * total;
    for (const [item, w] of pairs) { r -= w; if (r <= 0) return item; }
    return pairs[pairs.length - 1][0];
  }
  chance(p) { return this.next() < p; }
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export const daysFromNow = (d) => new Date(Date.now() + d * 86400000);
export const agoDays = (d) => new Date(Date.now() - d * 86400000);

/** Insert many rows into a table; cols array maps to row object keys. */
export async function bulkInsert(sql, table, cols, rows, chunk = 200) {
  if (!rows.length) return 0;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk).map(r => cols.map(c => r[c] ?? null));
    await sql`INSERT INTO ${sql(table)} (${sql(cols)}) VALUES ${sql(slice)}`;
  }
  return rows.length;
}

export const FIRST_EU = ["Lukas","Anna","Jonas","Sophie","Felix","Marie","Leon","Emma","Paul","Lena","Max","Hannah","Elias","Mia","Tim","Lea","Niklas","Sarah","Jan","Julia","Floris","Sanne","Daan","Iris","Bram","Eva","Pieter","Noor","Kasper","Freja","Henrik","Astrid","Emil","Clara","Oskar","Ingrid"];
export const LAST_EU = ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Hoffmann","Schäfer","Bachmann","Krüger","De Vries","Jansen","Van Dijk","Bakker","Visser","Andersen","Nielsen","Larsen","Berg","Lindqvist","Novák","Horák","Kovač","Weiss","Graf","Sommer","Lehmann","Wolf","Vogel","Frank"];
export const FIRST_US = ["James","Mary","Robert","Jennifer","Michael","Linda","David","Sarah","Daniel","Karen","Matthew","Nancy","Anthony","Betty","Mark","Sandra","Steven","Donna","Andrew","Carol","Joshua","Michelle","Kevin","Amanda","Brian","Melissa","Tyler","Rachel","Brandon","Lauren","Ethan","Olivia"];
export const LAST_US = ["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White","Harris","Clark","Lewis","Walker","Hall","Young","King","Wright","Scott","Green","Baker","Adams","Nelson","Carter","Mitchell"];

/** Global progress reporter */
export const log = (...a) => console.log("[demo-seed]", ...a);
