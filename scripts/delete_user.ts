
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { getDb } from '../packages/core/src/db';
import { users, userClients, userInvitations, magicLinks } from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';

// Load environment variables
dotenv.config({ path: 'packages/core/.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const email = process.argv[2];

if (!email) {
    console.error('Please provide an email address as an argument.');
    console.log('Usage: npx tsx scripts/delete_user.ts <email>');
    process.exit(1);
}

async function main() {
    console.log(`Searching for user: ${email}...`);

    // 1. Delete from Supabase Auth
    // We need to list users by email to find the ID, as deleteUser requires UUID
    // Note: Supabase Admin API 'listUsers' is the way
    const { data: { users: authUsers }, error: searchError } = await supabase.auth.admin.listUsers();

    if (searchError) {
        console.error('Error searching Supabase users:', searchError);
    }

    const authUser = authUsers?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (authUser) {
        console.log(`Found Supabase Auth User: ${authUser.id}. Deleting...`);
        const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id);
        if (deleteError) {
            console.error('Failed to delete Supabase user:', deleteError);
        } else {
            console.log('Supabase Auth user deleted.');
        }
    } else {
        console.log('User not found in Supabase Auth.');
    }

    // 2. Delete from Database
    const db = await getDb();
    console.log('Checking database...');

    const dbUsers = await db.select().from(users).where(eq(users.email, email));

    if (dbUsers.length > 0) {
        const userId = dbUsers[0].id;
        console.log(`Found DB User ID: ${userId}. cleaning up...`);

        // Clean up dependencies
        await db.delete(userClients).where(eq(userClients.userId, userId));
        await db.delete(magicLinks).where(eq(magicLinks.usedByUserId, userId));
        // Reset magic link used status so we can reuse the link if we want? 
        // No, better to force user to create a NEW link as per instructions.

        await db.delete(users).where(eq(users.id, userId));
        console.log('Database user deleted.');
    } else {
        console.log('User not found in Database.');
    }

    console.log('Done.');
    process.exit(0);
}

main().catch(console.error);
