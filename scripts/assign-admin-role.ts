import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function assignAdminRole(userEmail: string) {
  try {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    if (userError) throw userError;

    const user = users.find(u => u.email === userEmail);
    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      return;
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);

    // Get Admin role ID
    const { data: adminRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'Admin')
      .single();

    if (roleError) throw roleError;

    console.log(`Admin role ID: ${adminRole.id}`);

    // Check if user already has Admin role
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role_id', adminRole.id);

    if (existingRole && existingRole.length > 0) {
      console.log(`User ${userEmail} already has Admin role`);
      return;
    }

    // Assign Admin role
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: user.id,
        role_id: adminRole.id
      });

    if (assignError) throw assignError;

    console.log(`Successfully assigned Admin role to ${userEmail}`);

    // Show current user roles
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        roles (name)
      `)
      .eq('user_id', user.id);

    console.log('Current user roles:', userRoles?.map(ur => ur.roles?.name));

  } catch (error) {
    console.error('Error assigning admin role:', error);
  }
}

// Get email from command line argument
const userEmail = process.argv[2];

if (!userEmail) {
  console.error('Please provide user email as argument');
  console.log('Usage: npm run assign-admin <user-email>');
  process.exit(1);
}

assignAdminRole(userEmail);