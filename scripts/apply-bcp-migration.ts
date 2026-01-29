import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function applyBCPMigration() {
    const db = await getDb();

    console.log('📦 Applying BCP/BIA Unification Migration\n');

    try {
        // 1. Drop the relationship column from control_mappings (verified empty)
        console.log('1️⃣  Dropping relationship column from control_mappings...');
        await db.execute(sql`
      ALTER TABLE control_mappings DROP COLUMN IF EXISTS relationship;
    `);
        console.log('   ✓ Column dropped\n');

        // 2. Add new columns to control_mappings
        console.log('2️⃣  Adding new columns to control_mappings...');
        await db.execute(sql`
      ALTER TABLE control_mappings 
      ADD COLUMN IF NOT EXISTS mapping_type varchar(50) DEFAULT 'equivalent',
      ADD COLUMN IF NOT EXISTS notes text,
      ADD COLUMN IF NOT EXISTS created_by integer;
    `);
        console.log('   ✓ Columns added\n');

        // 3. Create new BCP join tables
        console.log('3️⃣  Creating new BCP relationship tables...');

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bc_plan_bias (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        bia_id integer NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bc_plan_strategies (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        strategy_id integer NOT NULL,
        notes text,
        created_at timestamp DEFAULT now()
      );
    `);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bc_plan_scenarios (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        scenario_id integer NOT NULL,
        coverage_notes text,
        created_at timestamp DEFAULT now()
      );
    `);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS bc_plan_contacts (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        user_id integer,
        vendor_contact_id integer,
        role varchar(100),
        is_primary boolean DEFAULT false,
        created_at timestamp DEFAULT now()
      );
    `);

        console.log('   ✓ Join tables created\n');

        // 4. Create lifecycle management tables
        console.log('4️⃣  Creating lifecycle management tables...');

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plan_versions (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        version varchar(50) NOT NULL,
        content_snapshot json,
        change_summary text,
        created_by integer,
        created_at timestamp DEFAULT now()
      );
    `);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plan_change_log (
        id serial PRIMARY KEY,
        plan_id integer NOT NULL,
        user_id integer NOT NULL,
        action varchar(50) NOT NULL,
        details text,
        created_at timestamp DEFAULT now()
      );
    `);

        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS plan_exercises (
        id serial PRIMARY KEY,
        client_id integer NOT NULL,
        plan_id integer NOT NULL,
        title varchar(255) NOT NULL,
        type varchar(50) NOT NULL,
        start_date timestamp DEFAULT now(),
        conductor_id integer,
        status varchar(50) DEFAULT 'planned',
        outcome varchar(50),
        notes text,
        follow_up_tasks json,
        report_url varchar(1024),
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      );
    `);

        console.log('   ✓ Lifecycle tables created\n');

        // 5. Create indexes
        console.log('5️⃣  Creating indexes...');

        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bpb_plan_bia ON bc_plan_bias (plan_id, bia_id);
    `);

        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bps_plan_strat ON bc_plan_strategies (plan_id, strategy_id);
    `);

        await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_bpsc_plan_scen ON bc_plan_scenarios (plan_id, scenario_id);
    `);

        console.log('   ✓ Indexes created\n');

        console.log('✅ Migration completed successfully!');
        console.log('\n📊 Summary:');
        console.log('   • Updated control_mappings table');
        console.log('   • Created 4 new BCP join tables');
        console.log('   • Created 3 new lifecycle management tables');
        console.log('   • Added necessary indexes');
        console.log('\n🎉 BIA/BCP unification schema is ready!');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('Details:', error);
        process.exit(1);
    }

    process.exit(0);
}

applyBCPMigration();
