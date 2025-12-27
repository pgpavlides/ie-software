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

// Test users with different roles
const testUsers = [
  {
    email: 'test.admin@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Admin',
    roleName: 'Admin'
  },
  {
    email: 'test.boss@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Boss',
    roleName: 'Boss'
  },
  {
    email: 'test.efficiency@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Efficiency Coordinator',
    roleName: 'Efficiency Coordinator'
  },
  {
    email: 'test.headsoftware@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Head of Software',
    roleName: 'Head of Software'
  },
  {
    email: 'test.headelectronics@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Head of Electronics',
    roleName: 'Head of Electronics'
  },
  {
    email: 'test.software@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Software Developer',
    roleName: 'Software'
  },
  {
    email: 'test.electronics@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Electronics Engineer',
    roleName: 'Electronics'
  },
  {
    email: 'test.construction@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Construction Worker',
    roleName: 'Construction'
  },
  {
    email: 'test.marketing@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Marketing Specialist',
    roleName: 'Marketing'
  },
  {
    email: 'test.projectmanager@ie-test.com',
    password: 'TestPass123!',
    full_name: 'Test Project Manager',
    roleName: 'Project Manager'
  },
];

async function createTestUsers() {
  console.log('Creating test users...\n');

  // First, get all roles
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('id, name');

  if (rolesError) {
    console.error('Failed to fetch roles:', rolesError.message);
    process.exit(1);
  }

  const roleMap = new Map(roles.map(r => [r.name, r.id]));

  for (const user of testUsers) {
    try {
      // Check if role exists
      const roleId = roleMap.get(user.roleName);
      if (!roleId) {
        console.error(`❌ Role "${user.roleName}" not found, skipping ${user.email}`);
        continue;
      }

      // Create user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log(`⚠ User ${user.email} already exists, skipping...`);
          continue;
        }
        console.error(`❌ Failed to create user ${user.email}:`, authError.message);
        continue;
      }

      console.log(`✓ Created user: ${user.email} (ID: ${authData.user.id})`);

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: user.email,
          full_name: user.full_name,
          username: user.email.split('@')[0]
        });

      if (profileError) {
        console.error(`  ⚠ Failed to create profile:`, profileError.message);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role_id: roleId
        });

      if (roleError) {
        console.error(`  ❌ Failed to assign ${user.roleName} role:`, roleError.message);
      } else {
        console.log(`  ✓ Assigned ${user.roleName} role\n`);
      }

    } catch (error) {
      console.error(`❌ Error creating user ${user.email}:`, error);
    }
  }

  console.log('\n=== Test Users Summary ===');
  console.log('All test users have password: TestPass123!\n');
  testUsers.forEach(u => {
    console.log(`  ${u.email.padEnd(35)} - ${u.roleName}`);
  });
  console.log('\nDone!');
}

createTestUsers();
