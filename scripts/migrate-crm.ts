import 'dotenv/config';
import { sql } from "drizzle-orm";
import { getDb } from "../db";

async function migrateCRM() {
  console.log("Starting Safe CRM Migration...");
  const db = await getDb();

  try {
    // 1. Create crm_leads
    console.log("Creating crm_leads table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "crm_leads" (
        "id" serial PRIMARY KEY NOT NULL,
        "client_id" integer,
        "first_name" varchar(255) NOT NULL,
        "last_name" varchar(255) NOT NULL,
        "email" varchar(255),
        "company_name" varchar(255),
        "job_title" varchar(255),
        "status" varchar(50) DEFAULT 'new',
        "source" varchar(100),
        "notes" text,
        "owner_id" integer,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // 2. Create crm_deal_stages
    console.log("Creating crm_deal_stages table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "crm_deal_stages" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" varchar(100) NOT NULL,
        "order" integer DEFAULT 0,
        "win_probability" integer,
        "color" varchar(50),
        "created_at" timestamp DEFAULT now()
      );
    `);

    // 3. Create crm_deals
    console.log("Creating crm_deals table...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "crm_deals" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" varchar(255) NOT NULL,
        "value" integer,
        "currency" varchar(10) DEFAULT 'USD',
        "stage_id" integer NOT NULL,
        "lead_id" integer,
        "client_id" integer,
        "owner_id" integer,
        "expected_close_date" timestamp,
        "probability" integer,
        "notes" text,
        "status" varchar(50) DEFAULT 'open',
        "lost_reason" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    // 4. Seed initial stages if empty
    const stagesCount = await db.execute(sql`SELECT count(*) as count FROM crm_deal_stages`);
    // @ts-ignore
    if (stagesCount[0].count === '0' || stagesCount[0].count === 0) {
        console.log("Seeding default deal stages...");
        await db.execute(sql`
            INSERT INTO crm_deal_stages (name, "order", win_probability, color) VALUES
            ('New', 1, 10, 'bg-slate-500/10 border-slate-500/20'),
            ('Qualified', 2, 30, 'bg-blue-500/10 border-blue-500/20'),
            ('Proposal', 3, 60, 'bg-orange-500/10 border-orange-500/20'),
            ('Negotiation', 4, 80, 'bg-purple-500/10 border-purple-500/20'),
            ('Won', 5, 100, 'bg-green-500/10 border-green-500/20'),
            ('Lost', 6, 0, 'bg-red-500/10 border-red-500/20');
        `);
    }

    console.log("✅ CRM Tables created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

migrateCRM();
