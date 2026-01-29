import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function checkControlMappings() {
    const db = await getDb();

    try {
        // Check if the table exists and get row count
        const result = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM control_mappings
    `);

        console.log('✓ Table exists');
        const count = result[0]?.count || result.rows?.[0]?.count || 0;
        console.log(`Total rows: ${count}`);

        // If there are rows, show a sample
        if (Number(count) > 0) {
            const sample = await db.execute(sql`
        SELECT * FROM control_mappings LIMIT 5
      `);

            console.log('\nSample data (first 5 rows):');
            console.log(JSON.stringify(sample.rows || sample, null, 2));

            // Check if relationship column has any non-null values
            const relationshipCheck = await db.execute(sql`
        SELECT COUNT(*) as count 
        FROM control_mappings 
        WHERE relationship IS NOT NULL
      `);

            const relCount = relationshipCheck[0]?.count || relationshipCheck.rows?.[0]?.count || 0;
            console.log(`\nRows with non-null 'relationship' column: ${relCount}`);
        } else {
            console.log('\n✓ Table is empty - safe to proceed with migration');
        }

    } catch (error: any) {
        if (error.message?.includes('does not exist')) {
            console.log('✓ Table does not exist yet - safe to proceed with migration');
        } else {
            console.error('Error checking table:', error.message);
            console.error('Full error:', error);
        }
    }

    process.exit(0);
}

checkControlMappings();
