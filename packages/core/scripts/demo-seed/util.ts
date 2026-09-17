/**
 * Demo Data Engine — deterministic RNG + shared helpers.
 * Fixed seed => identical dataset on every regeneration.
 */

export class Rng {
  private s: number;
  constructor(seed = 20260824) {
    this.s = seed >>> 0;
  }
  /** mulberry32 */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  /** weighted pick: [[item, weight], ...] */
  weighted<T>(pairs: ReadonlyArray<readonly [T, number]>): T {
    const total = pairs.reduce((a, p) => a + p[1], 0);
    let r = this.next() * total;
    for (const [item, w] of pairs) {
      r -= w;
      if (r <= 0) return item;
    }
    return pairs[pairs.length - 1][0];
  }
  chance(p: number): boolean {
    return this.next() < p;
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

/** Date offsets from "now" so demos never show stale data. */
export function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 86400000);
}
export function isoDays(d: number): string {
  return daysFromNow(d).toISOString();
}

export const FIRST_NAMES_EU = ["Lukas","Anna","Jonas","Sophie","Felix","Marie","Leon","Emma","Paul","Lena","Max","Hannah","Elias","Mia","Tim","Lea","Niklas","Sarah","Jan","Julia","Floris","Sanne","Daan","Iris","Bram","Eva","Pieter","Noor","Kasper","Freja"];
export const LAST_NAMES_EU = ["Müller","Schmidt","Schneider","Fischer","Weber","Meyer","Wagner","Becker","Hoffmann","Schäfer","Bachmann","Krüger","De Vries","Jansen","Van Dijk","Bakker","Visser","Andersen","Nielsen","Larsen","Berg","Lindqvist","Novak","Horak","Kovač","Weiss","Graf","Sommer","Lehmann","Wolf"];
export const FIRST_NAMES_US = ["James","Mary","Robert","Jennifer","Michael","Linda","David","Sarah","Daniel","Karen","Matthew","Nancy","Anthony","Betty","Mark","Sandra","Steven","Donna","Andrew","Carol","Joshua","Michelle","Kevin","Amanda","Brian","Melissa","Tyler","Rachel","Brandon","Lauren"];
export const LAST_NAMES_US = ["Smith","Johnson","Williams","Brown","Jones","Miller","Davis","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White","Harris","Clark","Lewis","Walker","Hall","Young","King","Wright","Scott","Green","Baker","Adams","Nelson"];

export async function chunkedInsert<T>(
  sql: any,
  table: string,
  rows: T[],
  size = 100
): Promise<number> {
  for (let i = 0; i < rows.length; i += size) {
    await sql`INSERT INTO ${sql(table)} VALUES ${sql(rows.slice(i, i + size))}`;
  }
  return rows.length;
}
