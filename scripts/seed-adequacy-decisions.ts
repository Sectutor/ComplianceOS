
import dotenv from "dotenv";
import { getDb } from "../db";
import { adequacyDecisions } from "../schema";
import { sql } from "drizzle-orm";

dotenv.config();

const decisions = [
    { countryCode: "AD", countryName: "Andorra", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "AR", countryName: "Argentina", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "CA", countryName: "Canada", status: "adequate", scope: "Commercial organizations covered by PIPEDA", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "FO", countryName: "Faroe Islands", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "GG", countryName: "Guernsey", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "IM", countryName: "Isle of Man", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "IL", countryName: "Israel", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "JP", countryName: "Japan", status: "adequate", scope: "Private sector and government", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "JE", countryName: "Jersey", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "NZ", countryName: "New Zealand", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "KR", countryName: "Republic of Korea", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "CH", countryName: "Switzerland", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "GB", countryName: "United Kingdom", status: "adequate", scope: "Full (GDPR and LED)", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "UY", countryName: "Uruguay", status: "adequate", scope: "Full", decisionUrl: "https://ec.europa.eu/info/law/law-topic/data-protection/international-dimension-data-protection/adequacy-decisions_en" },
    { countryCode: "US", countryName: "United States", status: "adequate", scope: "Organizations certified under EU-U.S. Data Privacy Framework (DPF)", decisionUrl: "https://www.dataprivacyframework.gov/" },
];

async function seed() {
    console.log("Seeding adequacy decisions...");
    const db = await getDb();

    for (const decision of decisions) {
        await db.insert(adequacyDecisions)
            .values(decision)
            .onConflictDoUpdate({
                target: adequacyDecisions.countryCode,
                set: decision
            });
        console.log(`- Seeded ${decision.countryName}`);
    }

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
