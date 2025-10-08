import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function createAdminUser() {
  console.log('\n=== Create Admin User ===\n');

  try {
    // Get user email
    const email = await question('Enter email address: ');

    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      rl.close();
      return;
    }

    // Check if user exists
    const { data: existingUsers } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        roles!inner(name)
      `)
      .eq('roles.name', 'Admin');

    // Find user in auth.users by email (requires service role or RLS policy)
    console.log('\n🔍 Looking up user...');

    // Get all users and find by email (this requires the user to be signed up first)
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('\n❌ Error: Unable to list users. This script requires admin access.');
      console.log('\n💡 Alternative: Run this SQL in your Supabase SQL Editor:');
      console.log(`\nINSERT INTO user_roles (user_id, role_id)`);
      console.log(`SELECT`);
      console.log(`    u.id,`);
      console.log(`    r.id`);
      console.log(`FROM auth.users u`);
      console.log(`CROSS JOIN roles r`);
      console.log(`WHERE u.email = '${email}'`);
      console.log(`  AND r.name = 'Admin';`);
      rl.close();
      return;
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      console.error(`\n❌ User with email ${email} not found.`);
      console.log('\n💡 Please ensure the user has signed up first.');
      rl.close();
      return;
    }

    // Check if already admin
    const isAlreadyAdmin = existingUsers?.some((eu: any) => eu.user_id === user.id);

    if (isAlreadyAdmin) {
      console.log(`\n✅ User ${email} is already an Admin!`);
      rl.close();
      return;
    }

    // Get Admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'Admin')
      .single();

    if (roleError || !adminRole) {
      console.error('\n❌ Error: Admin role not found in database');
      rl.close();
      return;
    }

    // Assign Admin role
    const { error: assignError } = await supabase.from('user_roles').insert({
      user_id: user.id,
      role_id: adminRole.id,
    });

    if (assignError) {
      console.error('\n❌ Error assigning Admin role:', assignError.message);
      rl.close();
      return;
    }

    console.log(`\n✅ Success! ${email} is now an Admin!`);
    console.log('\n📋 Next steps:');
    console.log('   1. Have the user log out and log back in');
    console.log('   2. They can now access /admin/users to manage other users');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    rl.close();
  }
}

createAdminUser();
