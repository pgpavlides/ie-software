import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://waxywordtmfvaryyumht.supabase.co';
const supabaseServiceKey = 'sb_secret_4_cUvw_zwVrciEJi8OrEaQ_CgebJgCL';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMapBoxPermissions() {
  console.log('Fixing map_boxes permissions...');
  
  try {
    // Grant execution permission on existing function
    await supabase.rpc('exec_sql', { 
      sql: 'GRANT EXECUTE ON FUNCTION is_architect_or_project_manager() TO authenticated;' 
    });
    
    // Create is_admin function
    await supabase.rpc('exec_sql', { 
      sql: `
        CREATE OR REPLACE FUNCTION is_admin()
        RETURNS BOOLEAN AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.name = 'Admin'
          );
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      ` 
    });
    
    // Grant execution permission
    await supabase.rpc('exec_sql', { 
      sql: 'GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;' 
    });
    
    // Create temporary insert policy
    await supabase.rpc('exec_sql', { 
      sql: `
        CREATE POLICY IF NOT EXISTS "temp_allow_all_inserts" ON map_boxes
          FOR INSERT TO authenticated
          WITH CHECK (auth.uid() IS NOT NULL);
      ` 
    });
    
    // Create trigger function
    await supabase.rpc('exec_sql', { 
      sql: `
        CREATE OR REPLACE FUNCTION set_map_box_fields()
        RETURNS TRIGGER AS $$
        BEGIN
          IF TG_OP = 'INSERT' THEN
            NEW.created_by = auth.uid();
            NEW.created_at = CURRENT_TIMESTAMP;
          END IF;
          NEW.updated_by = auth.uid();
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      ` 
    });
    
    // Create trigger
    await supabase.rpc('exec_sql', { 
      sql: `
        DROP TRIGGER IF EXISTS set_map_box_fields_trigger ON map_boxes;
        CREATE TRIGGER set_map_box_fields_trigger
          BEFORE INSERT OR UPDATE ON map_boxes
          FOR EACH ROW
          EXECUTE FUNCTION set_map_box_fields();
      ` 
    });
    
    console.log('✅ Map box permissions fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing permissions:', error);
  }
}

fixMapBoxPermissions();