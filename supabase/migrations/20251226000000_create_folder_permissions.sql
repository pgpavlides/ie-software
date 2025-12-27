-- Create folder-level permission system
-- This allows granular control over which users can access which folders

-- Create user_folder_permissions table
CREATE TABLE IF NOT EXISTS user_folder_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    folder_id UUID NOT NULL REFERENCES file_folders(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES auth.users(id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, folder_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_folder_permissions_user_id ON user_folder_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_folder_permissions_folder_id ON user_folder_permissions(folder_id);

-- Enable RLS
ALTER TABLE user_folder_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_folder_permissions
CREATE POLICY "Super Admin can manage all folder permissions"
    ON user_folder_permissions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = auth.uid() AND r.name = 'Super Admin'
        )
    );

CREATE POLICY "Users can view their own folder permissions"
    ON user_folder_permissions FOR SELECT
    USING (user_id = auth.uid());

-- Helper function to check if user has folder access
CREATE OR REPLACE FUNCTION user_has_folder_access(folder_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_names TEXT[];
    has_explicit_access BOOLEAN;
    folder_rec RECORD;
BEGIN
    -- Get user's roles
    SELECT array_agg(r.name) INTO user_role_names
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid();

    -- Super Admin, C-Level, and Boss always have access
    IF user_role_names && ARRAY['Super Admin', 'C-Level', 'Boss'] THEN
        RETURN TRUE;
    END IF;

    -- Check for explicit permission
    SELECT EXISTS(
        SELECT 1 FROM user_folder_permissions
        WHERE user_id = auth.uid()
        AND folder_id = folder_uuid
        AND can_view = true
    ) INTO has_explicit_access;

    IF has_explicit_access THEN
        RETURN TRUE;
    END IF;

    -- Get folder info
    SELECT * INTO folder_rec FROM file_folders WHERE id = folder_uuid;

    -- Check if this is under LEGAL / DOCUMENTATION - only Super Admin, C-Level, Heads can access
    IF folder_rec.path LIKE '/legal%' THEN
        RETURN user_role_names && ARRAY['Super Admin', 'C-Level', 'Boss', 'Head'];
    END IF;

    -- Check parent folder access for inheritance
    IF folder_rec.parent_id IS NOT NULL THEN
        RETURN user_has_folder_access(folder_rec.parent_id);
    END IF;

    -- Default: allow access to non-restricted folders for authenticated users
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create BRANDING root folder
INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system)
VALUES ('BRANDING', 'Brand assets and guidelines for all brands', 'custom', NULL, '/branding', 0, '#3b82f6', 'palette', 10, true)
ON CONFLICT DO NOTHING;

-- Get BRANDING folder id for subfolders
DO $$
DECLARE
    branding_id UUID;
    mindtrap_id UUID;
    agentfactory_id UUID;
    mindgolf_id UUID;
    legal_id UUID;
BEGIN
    -- Get BRANDING id
    SELECT id INTO branding_id FROM file_folders WHERE path = '/branding';

    IF branding_id IS NOT NULL THEN
        -- Create The MindTrap brand folder
        INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system)
        VALUES ('The MindTrap', 'MindTrap brand assets', 'custom', branding_id, '/branding/mindtrap', 1, '#ea2127', 'target', 1, true)
        ON CONFLICT DO NOTHING;
        SELECT id INTO mindtrap_id FROM file_folders WHERE path = '/branding/mindtrap';

        -- Create MindTrap subfolders
        IF mindtrap_id IS NOT NULL THEN
            INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system) VALUES
                ('Logos', 'Logo files and variations', 'custom', mindtrap_id, '/branding/mindtrap/logos', 2, '#ea2127', 'star', 1, false),
                ('Graphics', 'Graphic assets', 'custom', mindtrap_id, '/branding/mindtrap/graphics', 2, '#ea2127', 'photo', 2, false),
                ('Guidelines', 'Brand guidelines', 'custom', mindtrap_id, '/branding/mindtrap/guidelines', 2, '#ea2127', 'book', 3, false),
                ('Merchandise', 'Merchandise designs', 'custom', mindtrap_id, '/branding/mindtrap/merchandise', 2, '#ea2127', 'gift', 4, false),
                ('Venues', 'Venue-specific assets', 'custom', mindtrap_id, '/branding/mindtrap/venues', 2, '#ea2127', 'building', 5, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Create Agent Factory brand folder
        INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system)
        VALUES ('Agent Factory', 'Agent Factory brand assets', 'custom', branding_id, '/branding/agentfactory', 1, '#22c55e', 'users', 2, true)
        ON CONFLICT DO NOTHING;
        SELECT id INTO agentfactory_id FROM file_folders WHERE path = '/branding/agentfactory';

        -- Create Agent Factory subfolders
        IF agentfactory_id IS NOT NULL THEN
            INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system) VALUES
                ('Logos', 'Logo files and variations', 'custom', agentfactory_id, '/branding/agentfactory/logos', 2, '#22c55e', 'star', 1, false),
                ('Graphics', 'Graphic assets', 'custom', agentfactory_id, '/branding/agentfactory/graphics', 2, '#22c55e', 'photo', 2, false),
                ('Guidelines', 'Brand guidelines', 'custom', agentfactory_id, '/branding/agentfactory/guidelines', 2, '#22c55e', 'book', 3, false),
                ('Merchandise', 'Merchandise designs', 'custom', agentfactory_id, '/branding/agentfactory/merchandise', 2, '#22c55e', 'gift', 4, false),
                ('Venues', 'Venue-specific assets', 'custom', agentfactory_id, '/branding/agentfactory/venues', 2, '#22c55e', 'building', 5, true)
            ON CONFLICT DO NOTHING;
        END IF;

        -- Create MindGolf brand folder
        INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system)
        VALUES ('MindGolf', 'MindGolf brand assets', 'custom', branding_id, '/branding/mindgolf', 1, '#8b5cf6', 'flag', 3, true)
        ON CONFLICT DO NOTHING;
        SELECT id INTO mindgolf_id FROM file_folders WHERE path = '/branding/mindgolf';

        -- Create MindGolf subfolders
        IF mindgolf_id IS NOT NULL THEN
            INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system) VALUES
                ('Logos', 'Logo files and variations', 'custom', mindgolf_id, '/branding/mindgolf/logos', 2, '#8b5cf6', 'star', 1, false),
                ('Graphics', 'Graphic assets', 'custom', mindgolf_id, '/branding/mindgolf/graphics', 2, '#8b5cf6', 'photo', 2, false),
                ('Guidelines', 'Brand guidelines', 'custom', mindgolf_id, '/branding/mindgolf/guidelines', 2, '#8b5cf6', 'book', 3, false),
                ('Merchandise', 'Merchandise designs', 'custom', mindgolf_id, '/branding/mindgolf/merchandise', 2, '#8b5cf6', 'gift', 4, false),
                ('Venues', 'Venue-specific assets', 'custom', mindgolf_id, '/branding/mindgolf/venues', 2, '#8b5cf6', 'building', 5, true)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    -- Create LEGAL / DOCUMENTATION root folder
    INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system)
    VALUES ('LEGAL / DOCUMENTATION', 'Legal documents and contracts', 'custom', NULL, '/legal', 0, '#f59e0b', 'shield', 11, true)
    ON CONFLICT DO NOTHING;
    SELECT id INTO legal_id FROM file_folders WHERE path = '/legal';

    IF legal_id IS NOT NULL THEN
        -- Create Legal subfolders
        INSERT INTO file_folders (name, description, category, parent_id, path, depth, color, icon, sort_order, is_system) VALUES
            ('Draft Contracts', 'Draft contract documents', 'custom', legal_id, '/legal/draft-contracts', 1, '#f59e0b', 'file-code', 1, false),
            ('Liabilities', 'Liability documents', 'custom', legal_id, '/legal/liabilities', 1, '#f59e0b', 'file-analytics', 2, false),
            ('General Invoices', 'Invoice documents', 'custom', legal_id, '/legal/invoices', 1, '#f59e0b', 'clipboard', 3, false)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Function to get folders user can access
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

    -- Managers see everything except Legal
    IF user_role_names && ARRAY['Manager'] THEN
        RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
        RETURN;
    END IF;

    -- Clients see only their permitted folders
    IF user_role_names && ARRAY['Client'] THEN
        RETURN QUERY
            SELECT f.* FROM file_folders f
            JOIN user_folder_permissions ufp ON ufp.folder_id = f.id
            WHERE ufp.user_id = auth.uid() AND ufp.can_view = true
            ORDER BY f.sort_order, f.name;
        RETURN;
    END IF;

    -- Prospects see only their permitted folders (excluding Legal)
    IF user_role_names && ARRAY['Prospect'] THEN
        RETURN QUERY
            SELECT f.* FROM file_folders f
            JOIN user_folder_permissions ufp ON ufp.folder_id = f.id
            WHERE ufp.user_id = auth.uid()
            AND ufp.can_view = true
            AND f.path NOT LIKE '/legal%'
            ORDER BY f.sort_order, f.name;
        RETURN;
    END IF;

    -- Default: return non-restricted folders
    RETURN QUERY SELECT * FROM file_folders WHERE path NOT LIKE '/legal%' ORDER BY sort_order, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant user folder permission function
CREATE OR REPLACE FUNCTION grant_user_folder_permission(
    target_user_id UUID,
    target_folder_id UUID,
    grant_view BOOLEAN DEFAULT true,
    grant_edit BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    permission_id UUID;
BEGIN
    -- Check if caller has permission to grant
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('Super Admin', 'C-Level', 'Boss')
    ) THEN
        RAISE EXCEPTION 'You do not have permission to grant folder access';
    END IF;

    INSERT INTO user_folder_permissions (user_id, folder_id, can_view, can_edit, granted_by)
    VALUES (target_user_id, target_folder_id, grant_view, grant_edit, auth.uid())
    ON CONFLICT (user_id, folder_id)
    DO UPDATE SET
        can_view = grant_view,
        can_edit = grant_edit,
        granted_by = auth.uid(),
        granted_at = NOW()
    RETURNING id INTO permission_id;

    RETURN permission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Revoke user folder permission function
CREATE OR REPLACE FUNCTION revoke_user_folder_permission(
    target_user_id UUID,
    target_folder_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if caller has permission to revoke
    IF NOT EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid()
        AND r.name IN ('Super Admin', 'C-Level', 'Boss')
    ) THEN
        RAISE EXCEPTION 'You do not have permission to revoke folder access';
    END IF;

    DELETE FROM user_folder_permissions
    WHERE user_id = target_user_id AND folder_id = target_folder_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's folder permissions
CREATE OR REPLACE FUNCTION get_user_folder_permissions(target_user_id UUID)
RETURNS TABLE (
    folder_id UUID,
    folder_name TEXT,
    folder_path TEXT,
    can_view BOOLEAN,
    can_edit BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id as folder_id,
        f.name as folder_name,
        f.path as folder_path,
        ufp.can_view,
        ufp.can_edit
    FROM user_folder_permissions ufp
    JOIN file_folders f ON f.id = ufp.folder_id
    WHERE ufp.user_id = target_user_id
    ORDER BY f.path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
