-- Fix get_accessible_folders function to properly restrict non-privileged roles
-- Non-privileged roles should only see folders they have explicit permissions for
-- Also updates create_client_folder to use correct subfolders

CREATE OR REPLACE FUNCTION get_accessible_folders()
RETURNS SETOF file_folders AS $$
DECLARE
    user_role_names TEXT[];
BEGIN
    -- Get user's roles
    SELECT array_agg(r.name) INTO user_role_names
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid();

    -- Super Admin sees everything
    IF user_role_names && ARRAY['Super Admin'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- C-Level and Boss see everything
    IF user_role_names && ARRAY['C-Level', 'Boss'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Heads see everything
    IF user_role_names && ARRAY['Head'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Head of * roles see everything except Legal
    IF EXISTS (
        SELECT 1 FROM unnest(user_role_names) AS role_name
        WHERE role_name LIKE 'Head of%' OR role_name LIKE 'Head %'
    ) THEN
        RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Managers see everything except Legal
    IF user_role_names && ARRAY['Manager'] THEN
        RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- All other roles (including Artist, Client, Prospect, etc.)
    -- only see folders they have explicit permissions for
    RETURN QUERY
        SELECT f.* FROM file_folders f
        JOIN user_folder_permissions ufp ON ufp.folder_id = f.id
        WHERE ufp.user_id = auth.uid() AND ufp.can_view = true
        ORDER BY f.sort_order, f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also need to include parent folders in the path for proper tree rendering
-- This function returns folders AND their parent paths
CREATE OR REPLACE FUNCTION get_accessible_folders_with_parents()
RETURNS SETOF file_folders AS $$
DECLARE
    user_role_names TEXT[];
    accessible_paths TEXT[];
BEGIN
    -- Get user's roles
    SELECT array_agg(r.name) INTO user_role_names
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid();

    -- Super Admin sees everything
    IF user_role_names && ARRAY['Super Admin'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- C-Level and Boss see everything
    IF user_role_names && ARRAY['C-Level', 'Boss'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Heads see everything
    IF user_role_names && ARRAY['Head'] THEN
        RETURN QUERY SELECT * FROM file_folders ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Head of * roles see everything except Legal
    IF EXISTS (
        SELECT 1 FROM unnest(user_role_names) AS role_name
        WHERE role_name LIKE 'Head of%' OR role_name LIKE 'Head %'
    ) THEN
        RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Managers see everything except Legal
    IF user_role_names && ARRAY['Manager'] THEN
        RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- For restricted users, get their permitted folders plus all parent folders
    -- First get the paths of permitted folders
    SELECT array_agg(f.path) INTO accessible_paths
    FROM file_folders f
    JOIN user_folder_permissions ufp ON ufp.folder_id = f.id
    WHERE ufp.user_id = auth.uid() AND ufp.can_view = true;

    IF accessible_paths IS NULL THEN
        -- No permissions, return empty
        RETURN;
    END IF;

    -- Return permitted folders AND all their ancestors
    RETURN QUERY
        SELECT DISTINCT f.* FROM file_folders f
        WHERE
            -- Direct permission
            f.id IN (
                SELECT ufp.folder_id FROM user_folder_permissions ufp
                WHERE ufp.user_id = auth.uid() AND ufp.can_view = true
            )
            OR
            -- Is a parent of a permitted folder (for tree navigation)
            EXISTS (
                SELECT 1 FROM unnest(accessible_paths) AS perm_path
                WHERE perm_path LIKE f.path || '/%'
            )
        ORDER BY f.sort_order, f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update create_client_folder to use correct subfolders
CREATE OR REPLACE FUNCTION create_client_folder(client_user_id UUID, folder_name TEXT DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
  clients_root_id UUID;
  new_folder_id UUID;
  client_email TEXT;
  final_folder_name TEXT;
BEGIN
  SELECT id INTO clients_root_id
  FROM file_folders
  WHERE name = 'Clients' AND parent_id IS NULL AND is_system = true
  LIMIT 1;

  IF clients_root_id IS NULL THEN
    RAISE EXCEPTION 'Clients root folder not found';
  END IF;

  SELECT email INTO client_email
  FROM auth.users
  WHERE id = client_user_id;

  final_folder_name := COALESCE(folder_name, SPLIT_PART(client_email, '@', 1));

  INSERT INTO file_folders (
    name, description, category, parent_id, path, depth, color, icon, sort_order, is_system, created_by
  ) VALUES (
    final_folder_name,
    'Private folder for client: ' || client_email,
    'custom',
    clients_root_id,
    '/Clients/' || final_folder_name,
    1,
    '#22c55e',
    'briefcase',
    0,
    false,
    auth.uid()
  )
  RETURNING id INTO new_folder_id;

  INSERT INTO client_folders (user_id, folder_id, is_primary, created_by)
  VALUES (client_user_id, new_folder_id, true, auth.uid());

  -- Create subfolders: Contracts, Blueprints, Invoices, Reports
  INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system, created_by)
  VALUES
    ('Contracts', 'Contract documents and agreements', 'custom', new_folder_id, '/Clients/' || final_folder_name || '/Contracts', 2, '#3b82f6', 'file-analytics', 1, false, auth.uid()),
    ('Blueprints', 'Design blueprints and technical drawings', 'custom', new_folder_id, '/Clients/' || final_folder_name || '/Blueprints', 2, '#8b5cf6', 'layers', 2, false, auth.uid()),
    ('Invoices', 'Invoice documents and payment records', 'custom', new_folder_id, '/Clients/' || final_folder_name || '/Invoices', 2, '#f59e0b', 'clipboard', 3, false, auth.uid()),
    ('Reports', 'Project reports and documentation', 'custom', new_folder_id, '/Clients/' || final_folder_name || '/Reports', 2, '#22c55e', 'book', 4, false, auth.uid());

  RETURN new_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
