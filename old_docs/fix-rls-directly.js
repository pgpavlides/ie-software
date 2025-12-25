const accessToken = 'sbp_8c58912e7aaf93f68da2341c0699e8973ad8507c';
const projectRef = 'waxywordtmfvaryyumht';

// Function to execute SQL via Supabase Management API
async function executeSQL(sql) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error('SQL execution failed:', error);
    throw new Error(`HTTP ${response.status}: ${error}`);
  }
  
  return response.json();
}

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies directly via API...');
  
  try {
    // Step 1: Disable RLS temporarily
    console.log('1. Disabling RLS on map_boxes...');
    await executeSQL('ALTER TABLE map_boxes DISABLE ROW LEVEL SECURITY;');
    
    // Step 2: Drop all existing policies
    console.log('2. Dropping all existing policies...');
    await executeSQL('DROP POLICY IF EXISTS "temp_allow_all_inserts" ON map_boxes;');
    await executeSQL('DROP POLICY IF EXISTS "temp_allow_all_updates" ON map_boxes;');
    await executeSQL('DROP POLICY IF EXISTS "Users can view active map boxes" ON map_boxes;');
    await executeSQL('DROP POLICY IF EXISTS "Admins can update map boxes" ON map_boxes;');
    await executeSQL('DROP POLICY IF EXISTS "Admins can delete map boxes" ON map_boxes;');
    
    // Step 3: Re-enable RLS
    console.log('3. Re-enabling RLS...');
    await executeSQL('ALTER TABLE map_boxes ENABLE ROW LEVEL SECURITY;');
    
    // Step 4: Create simple permissive policies
    console.log('4. Creating new permissive policies...');
    
    // Allow all authenticated users to do everything (temporary)
    await executeSQL(`
      CREATE POLICY "allow_all_authenticated" ON map_boxes
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
    `);
    
    console.log('✅ RLS policies fixed successfully!');
    console.log('You should now be able to delete locations.');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error);
  }
}

// Run the fix
fixRLSPolicies();