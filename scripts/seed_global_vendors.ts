import { getDb } from "../db";
import { globalVendors } from "../schema";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

const TRUST_LISTS_URL = "https://raw.githubusercontent.com/trustlists/TrustLists/main/public/trust-centers.json";

async function seed() {
  console.log("📥 Fetching global vendor data from TrustLists...");
  
  try {
    const response = await fetch(TRUST_LISTS_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    
    const json = await response.json();
    const vendorsData = json.data;
    
    console.log(`📊 Found ${vendorsData.length} vendors. Starting ingestion...`);
    
    const db = await getDb();
    let imported = 0;
    let updated = 0;

    for (const v of vendorsData) {
      // Check if vendor already exists by website
      const existing = await db.select()
        .from(globalVendors)
        .where(eq(globalVendors.website, v.website))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await db.update(globalVendors)
          .set({
            name: v.name,
            trustCenterUrl: v.trustCenter,
            platform: v.platform,
            faviconUrl: v.iconUrl,
            updatedAt: new Date(),
          })
          .where(eq(globalVendors.id, existing[0].id));
        updated++;
      } else {
        // Insert new record
        await db.insert(globalVendors).values({
          name: v.name,
          website: v.website,
          trustCenterUrl: v.trustCenter,
          platform: v.platform,
          faviconUrl: v.iconUrl,
        });
        imported++;
      }
    }

    console.log(`✅ Seeding complete!`);
    console.log(`📈 Imported: ${imported}, Updated: ${updated}`);

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
