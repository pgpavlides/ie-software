import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminUsers = [
  { email: 'dimitriszoganas@gmail.com', password: 'mindtr@p' },
  { email: 'kostasAnt_@outlook.com', password: 'mindtr@p' },
  { email: 'gregorykls@hotmail.com', password: 'mindtr@p' }
];

async function createAdminUsers() {
  console.log('Creating admin users...\n');

  for (const user of adminUsers) {
    try {
      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      });

      if (authError) {
        console.error(`❌ Failed to create user ${user.email}:`, authError.message);
        continue;
      }

      console.log(`✓ Created user: ${user.email} (ID: ${authData.user.id})`);

      // Assign Admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: 'admin'
        });

      if (roleError) {
        console.error(`  ❌ Failed to assign Admin role:`, roleError.message);
      } else {
        console.log(`  ✓ Assigned Admin role\n`);
      }

    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error);
    }
  }

  console.log('Done!');
}

createAdminUsers();
