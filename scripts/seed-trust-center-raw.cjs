const postgres = require('postgres');
const DATABASE_URL = "postgresql://postgres.erjlkrtccmlrvsjtpppp:rDAO3DsFTjZyZJpj@aws-1-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

async function seed() {
    const sql = postgres(DATABASE_URL, { ssl: { rejectUnauthorized: false } });
    const clientId = 1;

    console.log("Ensuring tables exist...");

    // Create trust_center_visitors
    await sql`
        CREATE TABLE IF NOT EXISTS trust_center_visitors (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            email VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            company VARCHAR(255),
            last_seen_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;
    // Add unique constraint for email in visitors if not exists
    try {
        await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_email ON trust_center_visitors (email)`;
    } catch (e) { }

    // Create nda_signatures
    await sql`
        CREATE TABLE IF NOT EXISTS nda_signatures (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            visitor_id INTEGER NOT NULL,
            nda_version VARCHAR(50) DEFAULT 'v1.0',
            signed_at TIMESTAMP DEFAULT NOW(),
            signature_text VARCHAR(255),
            ip_address VARCHAR(50)
        )
    `;

    // Create trust_documents
    await sql`
        CREATE TABLE IF NOT EXISTS trust_documents (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            file_url TEXT NOT NULL,
            is_locked BOOLEAN DEFAULT FALSE,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;

    console.log("Seeding documents...");
    const docs = [
        {
            client_id: clientId,
            name: "SOC 2 Type II Report - 2025",
            description: "Annual security, availability, and confidentiality audit report.",
            file_url: "https://example.com/soc2-2025.pdf",
            is_locked: true,
            category: "Audit Report"
        },
        {
            client_id: clientId,
            name: "ISO 27001:2022 Certification",
            description: "Official certificate for our Information Security Management System.",
            file_url: "https://example.com/iso27001-cert.pdf",
            is_locked: false,
            category: "Certification"
        },
        {
            client_id: clientId,
            name: "Standard Information Gathering (SIG) Lite",
            description: "Completed security questionnaire for vendor assessments.",
            file_url: "https://example.com/sig-lite.pdf",
            is_locked: true,
            category: "Questionnaire"
        },
        {
            client_id: clientId,
            name: "Privacy Policy & GDPR Statement",
            description: "Comprehensive overview of our data processing activities.",
            file_url: "https://example.com/privacy-gdpr.pdf",
            is_locked: false,
            category: "Privacy"
        }
    ];

    for (const doc of docs) {
        await sql`
            INSERT INTO trust_documents (client_id, name, description, file_url, is_locked, category)
            VALUES (${doc.client_id}, ${doc.name}, ${doc.description}, ${doc.file_url}, ${doc.is_locked}, ${doc.category})
        `;
    }

    console.log("Seeding visitors...");
    const visitors = [
        { client_id: clientId, email: "security@goldmansachs.com", name: "John Banker", company: "Goldman Sachs" },
        { client_id: clientId, email: "vrm@stripe.com", name: "Sarah Fintech", company: "Stripe" }
    ];

    for (const v of visitors) {
        const [visitor] = await sql`
            INSERT INTO trust_center_visitors (client_id, email, name, company)
            VALUES (${v.client_id}, ${v.email}, ${v.name}, ${v.company})
            ON CONFLICT (email) DO UPDATE SET last_seen_at = NOW()
            RETURNING id
        `;

        if (v.email.includes("goldman")) {
            await sql`
                INSERT INTO nda_signatures (client_id, visitor_id, signature_text, nda_version)
                VALUES (${v.client_id}, ${visitor.id}, ${v.name}, 'v1.0')
            `;
        }
    }

    console.log("Done!");
    await sql.end();
}

seed().catch(console.error);
