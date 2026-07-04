import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import pg from 'pg';

const env = readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim();
const serviceKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim();
const dbUrl = env.match(/DATABASE_URL=(.+)/)[1].trim();

async function main() {
  const email = 'admin@grcompliance.com';
  const password = 'Admin123!';

  // Check if user exists in Supabase
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data: listed } = await supabase.auth.admin.listUsers();
  let user = listed?.users.find(u => u.email === email);

  if (user) {
    console.log('User already exists in Supabase:', user.id);
    // Reset password
    await supabase.auth.admin.updateUserById(user.id, { password });
    console.log('Password reset to:', password);
  } else {
    console.log('Creating new Supabase user...');
    const { data, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name: 'Admin', role: 'admin' },
    });
    if (error || !data.user) { console.error('Create failed:', error?.message || 'no user returned'); process.exit(1); }
    user = data.user;
    console.log('Created:', user.id);
  }

  // Insert/update in local DB
  console.log('Setting admin role in DB...');
  const pool = new pg.Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await pool.query(`
    INSERT INTO users (email, name, role, open_id, login_method)
    VALUES ($1, 'Admin', 'admin', $2, 'email')
    ON CONFLICT (open_id) DO UPDATE SET role = 'admin', name = 'Admin'
  `, [email, user.id]);
  await pool.end();

  console.log('\n✓ Admin account ready!');
  console.log(`  Login: http://localhost:5173/login`);
  console.log(`  Email: ${email}`);
  console.log(`  Pass:  ${password}`);
}

main().catch(e => { console.error(e.message); process.exit(1); });
