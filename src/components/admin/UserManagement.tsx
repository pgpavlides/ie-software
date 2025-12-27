import { useEffect, useState, useRef } from 'react';
import supabase from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
}

interface Role {
  id: string;
  name: string;
  description: string;
  permission_level: number;
  is_head_role: boolean;
  icon: string;
  color: string;
  display_order: number;
  department_id: string | null;
  department_name: string | null;
}

interface Department {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  display_order: number;
}

interface SectionPermission {
  id: string;
  role_id: string;
  section_key: string;
  can_access: boolean;
  can_edit: boolean;
}

interface FileFolder {
  id: string;
  name: string;
  path: string;
  depth: number;
  color: string;
  icon: string;
  parent_id: string | null;
}

interface UserFolderPermission {
  folder_id: string;
  folder_name: string;
  folder_path: string;
  can_view: boolean;
  can_edit: boolean;
}

// All available sections for permission management
const AVAILABLE_SECTIONS = [
  { key: 'dashboard', name: 'Dashboard', icon: '🏠', description: 'Main dashboard view', hasEditPermission: false },
  { key: 'room', name: 'Room', icon: '🎮', description: 'Room management', hasEditPermission: false },
  { key: 'guides', name: 'Guides', icon: '📚', description: 'Documentation guides', hasEditPermission: false },
  { key: 'utilities', name: 'Utilities', icon: '🛠️', description: 'Developer utilities', hasEditPermission: false },
  { key: 'overtimes', name: 'Overtimes', icon: '⏰', description: 'Overtime tracking', hasEditPermission: false },
  { key: 'overtime-manager', name: 'Overtime Manager', icon: '📊', description: 'Manage all employee overtimes', hasEditPermission: false },
  { key: 'useful-links', name: 'Useful Links', icon: '🔗', description: 'Quick access to important resources', hasEditPermission: true },
  { key: 'map', name: 'Map', icon: '🗺️', description: 'Company map view', hasEditPermission: true },
  { key: 'admin/users', name: 'User Management', icon: '👥', description: 'Manage users and roles', hasEditPermission: false },
  { key: 'inventory', name: 'Inventory', icon: '📦', description: 'Inventory management', hasEditPermission: true },
  { key: 'tasks', name: 'Tasks', icon: '📋', description: 'Task management', hasEditPermission: false },
  { key: 'files', name: 'Files', icon: '📁', description: 'File system browser', hasEditPermission: true },
  { key: 'ticketing', name: 'Ticketing', icon: '🎫', description: 'Ticketing system', hasEditPermission: false },
  { key: 'ticket-manager', name: 'Ticket Manager', icon: '📋', description: 'Manage all tickets across the system', hasEditPermission: false },
  { key: 'task-manager', name: 'Task Manager', icon: '📊', description: 'Manage all tasks across departments', hasEditPermission: false },
  { key: 'shop', name: 'Shop', icon: '🛒', description: 'Browse and order components', hasEditPermission: false },
  { key: 'shop-manager', name: 'Shop Manager', icon: '📦', description: 'Manage shop items and orders', hasEditPermission: false },
];

export default function UserManagement() {
  const { hasRole } = useAuthStore();
  const isCurrentUserSuperAdmin = hasRole('Super Admin');

  // Only Super Admin, Admin, and Boss can manage folder permissions
  const canManageFolderPermissions = hasRole('Super Admin') || hasRole('Admin') || hasRole('Boss');

  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // User filters
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterHasNoRole, setFilterHasNoRole] = useState(false);
  const [filterClientStatus, setFilterClientStatus] = useState<'all' | 'with_folder' | 'without_folder'>('all');

  // Section permissions state
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'folders' | 'prospects' | 'clients'>('users');
  const [sectionPermissions, setSectionPermissions] = useState<SectionPermission[]>([]);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [permissionRoleSearch, setPermissionRoleSearch] = useState('');
  const [folderUserSearch, setFolderUserSearch] = useState('');

  // Client folder management state
  const [clientFolders, setClientFolders] = useState<Record<string, { folder_id: string; folder_name: string }>>({});
  const [showClientFolderModal, setShowClientFolderModal] = useState(false);
  const [clientFolderName, setClientFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Folder permissions state
  const [allFolders, setAllFolders] = useState<FileFolder[]>([]);
  const [userFolderPermissions, setUserFolderPermissions] = useState<UserFolderPermission[]>([]);
  const [showFolderPermissionsModal, setShowFolderPermissionsModal] = useState(false);
  const [selectedUserForFolders, setSelectedUserForFolders] = useState<User | null>(null);
  const [folderPermissionsLoading, setFolderPermissionsLoading] = useState(false);
  const [folderPermissionsSaved, setFolderPermissionsSaved] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [pendingFolderChanges, setPendingFolderChanges] = useState<Map<string, { canView: boolean; canEdit: boolean }>>(new Map());
  const [expandedPermissionFolders, setExpandedPermissionFolders] = useState<Set<string>>(new Set());

  // Prospect management state
  const [prospectEmail, setProspectEmail] = useState('');
  const [prospectName, setProspectName] = useState('');
  const [prospectPassword, setProspectPassword] = useState('');
  const [creatingProspect, setCreatingProspect] = useState(false);
  const [deletingProspect, setDeletingProspect] = useState<string | null>(null);

  // Client creation state
  const [clientEmail, setClientEmail] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState<string | null>(null);

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserInfo, setDeleteUserInfo] = useState<{ id: string; name: string; type: 'client' | 'prospect' | 'user' } | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteHoldProgress, setDeleteHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notification popup state
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; title: string; message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: '',
  });

  const showNotification = (type: 'success' | 'error', title: string, message: string) => {
    setNotification({ show: true, type, title, message });
  };

  const closeNotification = () => {
    setNotification(prev => ({ ...prev, show: false }));
  };

  // Auto-close notification after 4 seconds
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        closeNotification();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification.show]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
    fetchSectionPermissions();
    fetchClientFolders();
    fetchAllFolders();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error } = await supabase.rpc('get_all_users_with_roles');

      if (error) throw error;

      // Get avatar URLs for each user
      const formattedUsers = await Promise.all(
        (usersData || []).map(async (user: any) => {
          // Try to get avatar from storage
          let avatarUrl: string | null = null;

          // Check if user has an avatar in storage
          const { data: avatarData } = await supabase.storage
            .from('avatars')
            .list(user.user_id, { limit: 1 });

          if (avatarData && avatarData.length > 0) {
            const { data: urlData } = supabase.storage
              .from('avatars')
              .getPublicUrl(`${user.user_id}/${avatarData[0].name}`);
            avatarUrl = urlData?.publicUrl || null;
          }

          return {
            id: user.user_id,
            email: user.email || '',
            full_name: user.full_name || 'N/A',
            avatar_url: avatarUrl,
            created_at: user.created_at,
            roles: user.role_names || [],
          };
        })
      );

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          permission_level,
          is_head_role,
          icon,
          color,
          display_order,
          department_id,
          departments(name)
        `)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      const formattedRoles = data?.map((role: any) => ({
        ...role,
        department_name: role.departments?.name || null,
      })) || [];

      setRoles(formattedRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSectionPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_section_permissions')
        .select('*');

      if (error) throw error;

      setSectionPermissions(data || []);
    } catch (error) {
      console.error('Error fetching section permissions:', error);
    }
  };

  // Fetch which users have client folders
  const fetchClientFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('client_folders')
        .select(`
          user_id,
          folder_id,
          file_folders!inner(name)
        `);

      if (error) throw error;

      const folderMap: Record<string, { folder_id: string; folder_name: string }> = {};
      (data || []).forEach((cf: any) => {
        folderMap[cf.user_id] = {
          folder_id: cf.folder_id,
          folder_name: cf.file_folders?.name || 'Unknown',
        };
      });
      setClientFolders(folderMap);
    } catch (error) {
      console.error('Error fetching client folders:', error);
    }
  };

  // Fetch all folders for permission management
  const fetchAllFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('file_folders')
        .select('id, name, path, depth, color, icon, parent_id')
        .order('path');

      if (error) throw error;
      setAllFolders(data || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
    }
  };

  // Helper functions for collapsible folder tree
  const hasChildren = (folderId: string): boolean => {
    return allFolders.some(f => f.parent_id === folderId);
  };

  const isFolderVisible = (folder: FileFolder): boolean => {
    // Root folders are always visible
    if (folder.depth === 0) return true;
    // Check if all ancestors are expanded
    let currentFolder = folder;
    while (currentFolder.parent_id) {
      if (!expandedPermissionFolders.has(currentFolder.parent_id)) {
        return false;
      }
      const parent = allFolders.find(f => f.id === currentFolder.parent_id);
      if (!parent) break;
      currentFolder = parent;
    }
    return true;
  };

  const toggleFolderExpand = (folderId: string) => {
    setExpandedPermissionFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Fetch folder permissions for a specific user
  const fetchUserFolderPermissions = async (userId: string) => {
    try {
      setFolderPermissionsLoading(true);
      const { data, error } = await supabase.rpc('get_user_folder_permissions', {
        target_user_id: userId,
      });

      if (error) throw error;

      setUserFolderPermissions(data || []);
      setPendingFolderChanges(new Map());
    } catch (error) {
      console.error('Error fetching user folder permissions:', error);
      setUserFolderPermissions([]);
    } finally {
      setFolderPermissionsLoading(false);
    }
  };

  // Toggle folder permission in pending changes
  // When toggling parent folder, also toggle all child folders
  const toggleFolderPermission = (folderId: string, field: 'canView' | 'canEdit') => {
    const folder = allFolders.find(f => f.id === folderId);
    if (!folder) return;

    setPendingFolderChanges((prev) => {
      const next = new Map(prev);

      // Get current state for this folder
      const current = next.get(folderId) || {
        canView: userFolderPermissions.some((p) => p.folder_id === folderId && p.can_view),
        canEdit: userFolderPermissions.some((p) => p.folder_id === folderId && p.can_edit),
      };

      // Calculate new state
      let newCanView = current.canView;
      let newCanEdit = current.canEdit;

      if (field === 'canView') {
        newCanView = !current.canView;
        if (!newCanView) newCanEdit = false; // Can't edit if can't view
      } else {
        newCanEdit = !current.canEdit;
      }

      // Apply to this folder
      next.set(folderId, { canView: newCanView, canEdit: newCanEdit });

      // Find and apply to all child folders (folders whose path starts with this folder's path)
      const childFolders = allFolders.filter(f =>
        f.path.startsWith(folder.path + '/') && f.id !== folderId
      );

      for (const child of childFolders) {
        const childCurrent = next.get(child.id) || {
          canView: userFolderPermissions.some((p) => p.folder_id === child.id && p.can_view),
          canEdit: userFolderPermissions.some((p) => p.folder_id === child.id && p.can_edit),
        };

        if (field === 'canView') {
          next.set(child.id, {
            canView: newCanView,
            canEdit: newCanView ? childCurrent.canEdit : false,
          });
        } else {
          // Only enable edit on children if they have view access
          if (childCurrent.canView || newCanView) {
            next.set(child.id, {
              canView: childCurrent.canView,
              canEdit: newCanEdit,
            });
          }
        }
      }

      return next;
    });
  };

  // Check if user has a privileged role that grants automatic folder access
  const getUserFolderAccessLevel = () => {
    if (!selectedUserForFolders) return 'none';
    const roles = selectedUserForFolders.roles || [];

    // Client and Prospect = individual folder permissions (special treatment)
    if (roles.includes('Client') || roles.includes('Prospect')) {
      return 'none';
    }

    // Super Admin, C-Level, Boss = full access
    if (roles.includes('Super Admin') || roles.includes('C-Level') || roles.includes('Boss')) {
      return 'full';
    }

    // Generic "Head" role = full access
    if (roles.includes('Head')) {
      return 'full';
    }

    // Head of X roles (Head of Accounting, Head of Software, etc.) = full access
    if (roles.some(role => role.startsWith('Head of') || role.startsWith('Head '))) {
      return 'full';
    }

    // All other roles = everything except Legal/Documentation
    return 'standard';
  };

  // Check if user has any custom folder permissions set
  const hasCustomPermissions = () => {
    return userFolderPermissions.length > 0;
  };

  // Get the role-based default permission for a folder
  const getRoleBasedDefault = (folderPath?: string) => {
    const accessLevel = getUserFolderAccessLevel();

    if (accessLevel === 'full') {
      return { canView: true, canEdit: true };
    }

    if (accessLevel === 'standard') {
      const lowerPath = folderPath?.toLowerCase() || '';
      const isRestricted = lowerPath.includes('/legal') || lowerPath.includes('/documentation');
      if (!isRestricted) {
        return { canView: true, canEdit: true };
      }
      return { canView: false, canEdit: false };
    }

    // Client/Prospect - no default access
    return { canView: false, canEdit: false };
  };

  // Get current permission state for a folder (pending or saved)
  const getFolderPermission = (folderId: string, folderPath?: string) => {
    const pending = pendingFolderChanges.get(folderId);
    if (pending) return pending;

    // Check if user has any custom permissions - if so, use individual permissions
    if (hasCustomPermissions()) {
      const existing = userFolderPermissions.find((p) => p.folder_id === folderId);
      if (existing) {
        return {
          canView: existing.can_view || false,
          canEdit: existing.can_edit || false,
        };
      }
      // Has custom permissions but not for this folder - use default for this folder
      return getRoleBasedDefault(folderPath);
    }

    // No custom permissions - use pure role-based defaults
    return getRoleBasedDefault(folderPath);
  };

  // Reset permissions to role-based defaults
  const resetToDefaults = async () => {
    if (!selectedUserForFolders) return;

    setFolderPermissionsLoading(true);
    try {
      // Delete all custom permissions for this user
      const { error } = await supabase
        .from('user_folder_permissions')
        .delete()
        .eq('user_id', selectedUserForFolders.id);

      if (error) throw error;

      // Clear pending changes and reload
      setPendingFolderChanges(new Map());
      setUserFolderPermissions([]);

    } catch (error) {
      console.error('Error resetting permissions:', error);
    } finally {
      setFolderPermissionsLoading(false);
    }
  };

  // Select all folders (grant view permission to all)
  const selectAllFolders = () => {
    const newChanges = new Map(pendingFolderChanges);
    for (const folder of allFolders) {
      const existing = userFolderPermissions.find((p) => p.folder_id === folder.id);
      const currentlyHasView = existing?.can_view || false;
      // Only add to pending if it's actually a change
      if (!currentlyHasView) {
        newChanges.set(folder.id, { canView: true, canEdit: false });
      }
    }
    setPendingFolderChanges(newChanges);
  };

  // Deselect all folders (revoke all permissions)
  const deselectAllFolders = () => {
    const newChanges = new Map(pendingFolderChanges);
    for (const folder of allFolders) {
      const existing = userFolderPermissions.find((p) => p.folder_id === folder.id);
      const currentlyHasView = existing?.can_view || false;
      const currentlyHasEdit = existing?.can_edit || false;
      // Only add to pending if it's actually a change
      if (currentlyHasView || currentlyHasEdit) {
        newChanges.set(folder.id, { canView: false, canEdit: false });
      }
    }
    setPendingFolderChanges(newChanges);
  };

  // Save folder permissions
  const saveFolderPermissions = async () => {
    if (!selectedUserForFolders || pendingFolderChanges.size === 0) return;

    setFolderPermissionsLoading(true);
    setSaveProgress({ current: 0, total: 0 });

    try {
      // For privileged users, we need to save ALL folder states to override role defaults
      // This ensures custom permissions are persisted properly
      const accessLevel = getUserFolderAccessLevel();

      if (accessLevel !== 'none') {
        // Calculate folders to save
        const foldersToSave: { folder: typeof allFolders[0]; finalView: boolean; finalEdit: boolean }[] = [];

        for (const folder of allFolders) {
          const pending = pendingFolderChanges.get(folder.id);
          const existing = userFolderPermissions.find((p) => p.folder_id === folder.id);
          const roleDefault = getRoleBasedDefault(folder.path);

          let finalView: boolean;
          let finalEdit: boolean;

          if (pending) {
            finalView = pending.canView;
            finalEdit = pending.canEdit;
          } else if (existing) {
            finalView = existing.can_view;
            finalEdit = existing.can_edit;
          } else {
            finalView = roleDefault.canView;
            finalEdit = roleDefault.canEdit;
          }

          // Only save if different from role default OR if we have pending changes for this folder
          if (pending || (finalView !== roleDefault.canView) || (finalEdit !== roleDefault.canEdit)) {
            foldersToSave.push({ folder, finalView, finalEdit });
          }
        }

        // Set total and save with progress tracking
        setSaveProgress({ current: 0, total: foldersToSave.length });

        for (let i = 0; i < foldersToSave.length; i++) {
          const { folder, finalView, finalEdit } = foldersToSave[i];
          const { error } = await supabase.rpc('grant_user_folder_permission', {
            target_user_id: selectedUserForFolders.id,
            target_folder_id: folder.id,
            grant_view: finalView,
            grant_edit: finalEdit,
          });
          if (error) throw error;
          setSaveProgress({ current: i + 1, total: foldersToSave.length });
        }
      } else {
        // Non-privileged user (Client/Prospect) - save only pending changes
        const pendingArray = Array.from(pendingFolderChanges.entries());
        setSaveProgress({ current: 0, total: pendingArray.length });

        for (let i = 0; i < pendingArray.length; i++) {
          const [folderId, permissions] = pendingArray[i];
          if (permissions.canView) {
            const { error } = await supabase.rpc('grant_user_folder_permission', {
              target_user_id: selectedUserForFolders.id,
              target_folder_id: folderId,
              grant_view: permissions.canView,
              grant_edit: permissions.canEdit,
            });
            if (error) throw error;
          } else {
            const { error } = await supabase.rpc('revoke_user_folder_permission', {
              target_user_id: selectedUserForFolders.id,
              target_folder_id: folderId,
            });
            if (error) throw error;
          }
          setSaveProgress({ current: i + 1, total: pendingArray.length });
        }
      }

      // Refresh permissions
      await fetchUserFolderPermissions(selectedUserForFolders.id);

      // Show success message in modal
      setFolderPermissionsSaved(true);

      // Auto-close after 1.5 seconds
      setTimeout(() => {
        setShowFolderPermissionsModal(false);
        setSelectedUserForFolders(null);
        setPendingFolderChanges(new Map());
        setFolderPermissionsSaved(false);
      }, 1500);
    } catch (error: any) {
      console.error('Error saving folder permissions:', error);
      showNotification('error', 'Permission Error', `Failed to save permissions: ${error.message || 'Unknown error'}`);
    } finally {
      setFolderPermissionsLoading(false);
    }
  };

  // Create a client folder for a user
  const createClientFolder = async () => {
    if (!selectedUser || !clientFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const { error } = await supabase.rpc('create_client_folder', {
        client_user_id: selectedUser.id,
        folder_name: clientFolderName.trim(),
      });

      if (error) throw error;

      // Get the client's folder from client_folders table
      const { data: clientFolderMapping } = await supabase
        .from('client_folders')
        .select('folder_id')
        .eq('user_id', selectedUser.id)
        .single();

      if (clientFolderMapping) {
        // Get the main folder and all its children
        const { data: mainFolder } = await supabase
          .from('file_folders')
          .select('id, path')
          .eq('id', clientFolderMapping.folder_id)
          .single();

        if (mainFolder) {
          // Get all child folders under this path
          const { data: childFolders } = await supabase
            .from('file_folders')
            .select('id')
            .like('path', `${mainFolder.path}/%`);

          // Combine main folder and children
          const allFolderIds = [mainFolder.id, ...(childFolders || []).map(f => f.id)];

          // Grant view and edit permissions for all folders
          const permissionInserts = allFolderIds.map(folderId => ({
            user_id: selectedUser.id,
            folder_id: folderId,
            can_view: true,
            can_edit: true,
          }));

          const { error: permError } = await supabase
            .from('user_folder_permissions')
            .upsert(permissionInserts, { onConflict: 'user_id,folder_id' });

          if (permError) {
            console.error('Error granting folder permissions:', permError);
          }
        }
      }

      // Refresh client folders
      await fetchClientFolders();

      // Close modal
      setShowClientFolderModal(false);
      setClientFolderName('');
      setSelectedUser(null);

      showNotification('success', 'Folder Created', `Client folder "${clientFolderName}" created successfully!`);
    } catch (error: any) {
      console.error('Error creating client folder:', error);
      showNotification('error', 'Folder Error', `Failed to create folder: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Check if user is a client
  const isClientRole = (user: User) => user.roles.includes('Client');
  const hasClientFolder = (userId: string) => !!clientFolders[userId];

  const toggleSectionPermission = async (roleId: string, sectionKey: string, currentValue: boolean) => {
    setPermissionsLoading(true);
    try {
      // Check if permission record exists
      const existingPermission = sectionPermissions.find(
        p => p.role_id === roleId && p.section_key === sectionKey
      );

      if (existingPermission) {
        // Update existing permission
        const { error } = await supabase
          .from('role_section_permissions')
          .update({ can_access: !currentValue })
          .eq('id', existingPermission.id);

        if (error) throw error;
      } else {
        // Insert new permission
        const { error } = await supabase
          .from('role_section_permissions')
          .insert({
            role_id: roleId,
            section_key: sectionKey,
            can_access: !currentValue
          });

        if (error) throw error;
      }

      // Refresh permissions
      await fetchSectionPermissions();
    } catch (error) {
      console.error('Error toggling permission:', error);
      showNotification('error', 'Permission Error', 'Failed to update permission');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const getRolePermission = (roleId: string, sectionKey: string): boolean => {
    const permission = sectionPermissions.find(
      p => p.role_id === roleId && p.section_key === sectionKey
    );
    return permission?.can_access ?? false;
  };

  const getRoleEditPermission = (roleId: string, sectionKey: string): boolean => {
    const permission = sectionPermissions.find(
      p => p.role_id === roleId && p.section_key === sectionKey
    );
    return permission?.can_edit ?? false;
  };

  const toggleEditPermission = async (roleId: string, sectionKey: string, currentValue: boolean) => {
    setPermissionsLoading(true);
    try {
      const existingPermission = sectionPermissions.find(
        p => p.role_id === roleId && p.section_key === sectionKey
      );

      if (existingPermission) {
        const { error } = await supabase
          .from('role_section_permissions')
          .update({ can_edit: !currentValue })
          .eq('id', existingPermission.id);

        if (error) throw error;
      } else {
        // Insert new permission with edit access
        const { error } = await supabase
          .from('role_section_permissions')
          .insert({
            role_id: roleId,
            section_key: sectionKey,
            can_access: true, // If they can edit, they can view
            can_edit: !currentValue
          });

        if (error) throw error;
      }

      await fetchSectionPermissions();
    } catch (error) {
      console.error('Error toggling edit permission:', error);
      showNotification('error', 'Permission Error', 'Failed to update edit permission');
    } finally {
      setPermissionsLoading(false);
    }
  };

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const role = roles.find(r => r.id === roleId);
      if (!role) return;

      // Only Super Admin can assign Super Admin role
      if (role.name === 'Super Admin' && !isCurrentUserSuperAdmin) {
        showNotification('error', 'Permission Denied', 'Only Super Admin can assign the Super Admin role.');
        return;
      }

      // Optimistically update UI first
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, roles: [...user.roles, role.name] }
            : user
        )
      );

      setShowRoleModal(false);
      setSelectedUser(null);

      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: roleId,
      });

      if (error) {
        // Revert on error
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId
              ? { ...user, roles: user.roles.filter(r => r !== role.name) }
              : user
          )
        );
        throw error;
      }
    } catch (error: any) {
      console.error('Error assigning role:', error);
      showNotification('error', 'Role Error', error.message || 'Failed to assign role');
    }
  };

  const removeRole = async (userId: string, roleName: string) => {
    try {
      const role = roles.find((r) => r.name === roleName);
      if (!role) return;

      // Optimistically update UI first
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? { ...user, roles: user.roles.filter(r => r !== roleName) }
            : user
        )
      );

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', role.id);

      if (error) {
        // Revert on error
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.id === userId
              ? { ...user, roles: [...user.roles, roleName] }
              : user
          )
        );
        throw error;
      }
    } catch (error: any) {
      console.error('Error removing role:', error);
      showNotification('error', 'Role Error', error.message || 'Failed to remove role');
    }
  };

  const getRoleColor = (roleName: string): string => {
    const role = roles.find(r => r.name === roleName);
    return role?.color || '#6b7280';
  };

  const getPermissionLevelLabel = (level: number): string => {
    if (level >= 90) return 'System';
    if (level >= 70) return 'Management';
    if (level >= 60) return 'Lead';
    return 'Member';
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = searchQuery === '' ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

    // Role filter
    const matchesRole = filterRole === 'all' || user.roles.includes(filterRole);

    // No role filter
    const matchesNoRole = !filterHasNoRole || user.roles.length === 0;

    // Client folder status filter
    let matchesClientStatus = true;
    if (filterClientStatus !== 'all') {
      const isClient = user.roles.includes('Client');
      const hasFolder = !!clientFolders[user.id];
      if (filterClientStatus === 'with_folder') {
        matchesClientStatus = isClient && hasFolder;
      } else if (filterClientStatus === 'without_folder') {
        matchesClientStatus = isClient && !hasFolder;
      }
    }

    return matchesSearch && matchesRole && matchesNoRole && matchesClientStatus;
  });

  // Get unique roles for filter dropdown
  const uniqueRoles = [...new Set(users.flatMap(u => u.roles))].sort();

  // Check if any filters are active
  const hasActiveFilters = filterRole !== 'all' || filterHasNoRole || filterClientStatus !== 'all';

  // Clear all filters
  const clearFilters = () => {
    setFilterRole('all');
    setFilterHasNoRole(false);
    setFilterClientStatus('all');
    setSearchQuery('');
  };

  // Get prospect users (users with Prospect role)
  const prospectUsers = users.filter(user => user.roles.includes('Prospect'));

  // Calculate days remaining for prospect (14 days from creation)
  const getProspectDaysRemaining = (createdAt: string): number => {
    const created = new Date(createdAt);
    const expiry = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  // Create a prospect account
  const createProspectAccount = async () => {
    if (!prospectEmail.trim() || !prospectName.trim() || !prospectPassword.trim()) {
      showNotification('error', 'Validation Error', 'Please fill in all fields');
      return;
    }

    setCreatingProspect(true);
    try {
      // Create user via Edge Function (bypasses signup restrictions)
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: prospectEmail.trim(),
            password: prospectPassword.trim(),
            full_name: prospectName.trim(),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      const newUser = result.user;

      if (newUser) {
        // Assign Prospect role
        const prospectRole = roles.find(r => r.name === 'Prospect');
        if (prospectRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: newUser.id, role_id: prospectRole.id });

          if (roleError) {
            console.error('Error assigning Prospect role:', roleError);
          }
        }

        // Create prospect folder
        const { data: folderId, error: folderError } = await supabase.rpc('create_prospect_folder', {
          prospect_user_id: newUser.id,
          folder_name: prospectName.trim(),
        });

        if (folderError) {
          console.error('Error creating prospect folder:', folderError);
        } else if (folderId) {
          // Get the folder and all its children to grant permissions
          const { data: mainFolder } = await supabase
            .from('file_folders')
            .select('id, path')
            .eq('id', folderId)
            .single();

          if (mainFolder) {
            // Get all child folders
            const { data: childFolders } = await supabase
              .from('file_folders')
              .select('id')
              .like('path', `${mainFolder.path}/%`);

            // Combine main folder and children
            const allFolderIds = [mainFolder.id, ...(childFolders || []).map(f => f.id)];

            // Grant view and edit permissions
            const permissionInserts = allFolderIds.map(id => ({
              user_id: newUser.id,
              folder_id: id,
              can_view: true,
              can_edit: true,
            }));

            await supabase
              .from('user_folder_permissions')
              .upsert(permissionInserts, { onConflict: 'user_id,folder_id' });
          }
        }
      }

      // Refresh users
      await fetchUsers();

      // Clear form
      setProspectEmail('');
      setProspectName('');
      setProspectPassword('');

      showNotification('success', 'Prospect Created', `Account for ${prospectName.trim()} created successfully! The account will expire in 14 days.`);
    } catch (error: any) {
      console.error('Error creating prospect:', error);
      showNotification('error', 'Creation Failed', `Failed to create prospect: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingProspect(false);
    }
  };

  // Open delete confirmation modal for prospect
  const confirmDeleteProspect = (prospect: User) => {
    setDeleteUserInfo({ id: prospect.id, name: prospect.full_name, type: 'prospect' });
    setDeleteHoldProgress(0);
    setShowDeleteModal(true);
  };

  // Open delete confirmation modal for client
  const confirmDeleteClient = (client: User) => {
    setDeleteUserInfo({ id: client.id, name: client.full_name, type: 'client' });
    setDeleteHoldProgress(0);
    setShowDeleteModal(true);
  };

  // Open delete confirmation modal for user (from Users & Roles tab)
  const confirmDeleteUser = (user: User) => {
    // Prevent deletion of Super Admin
    if (user.roles.includes('Super Admin')) {
      showNotification('error', 'Cannot Delete', 'Super Admin accounts cannot be deleted.');
      return;
    }
    setDeleteUserInfo({ id: user.id, name: user.full_name, type: 'user' });
    setDeleteHoldProgress(0);
    setShowDeleteModal(true);
  };

  // Handle hold button start
  const startHold = () => {
    if (deletingProspect || deletingClient || deletingUser) return; // Don't start if already deleting
    setIsHolding(true);
    setDeleteHoldProgress(0);
    const startTime = Date.now();
    const duration = 3000; // 3 seconds

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setDeleteHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current) {
          clearInterval(holdIntervalRef.current);
          holdIntervalRef.current = null;
        }
        setIsHolding(false); // Stop holding state immediately
        executeDelete();
      }
    }, 50);
  };

  // Handle hold button end
  const endHold = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setIsHolding(false);
    // Only reset progress if delete wasn't triggered (progress < 100)
    if (deleteHoldProgress < 100) {
      setDeleteHoldProgress(0);
    }
  };

  // Execute the actual delete
  const executeDelete = async () => {
    if (!deleteUserInfo) return;

    const { id, type } = deleteUserInfo;

    if (type === 'prospect') {
      setDeletingProspect(id);
    } else if (type === 'client') {
      setDeletingClient(id);
    } else {
      setDeletingUser(id);
    }

    try {
      // Delete user via Edge Function (handles auth.users deletion)
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ user_id: id }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      // Refresh client folders if needed
      if (type === 'client' || type === 'user') {
        await fetchClientFolders();
      }

      // Refresh users
      await fetchUsers();

      // Close modal
      setShowDeleteModal(false);
      setDeleteUserInfo(null);
      setDeleteHoldProgress(0);

      const typeLabel = type === 'prospect' ? 'Prospect' : type === 'client' ? 'Client' : 'User';
      showNotification('success', `${typeLabel} Deleted`, `The ${type} account has been permanently removed.`);
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      showNotification('error', 'Deletion Failed', `Failed to delete ${type}: ${error.message || 'Unknown error'}`);
    } finally {
      if (type === 'prospect') {
        setDeletingProspect(null);
      } else if (type === 'client') {
        setDeletingClient(null);
      } else {
        setDeletingUser(null);
      }
    }
  };

  // Close delete modal
  const closeDeleteModal = () => {
    endHold();
    setShowDeleteModal(false);
    setDeleteUserInfo(null);
  };

  // Get client users (users with Client role)
  const clientUsers = users.filter(user => user.roles.includes('Client'));

  // Create a client account
  const createClientAccount = async () => {
    if (!clientEmail.trim() || !clientName.trim() || !clientPassword.trim()) {
      showNotification('error', 'Validation Error', 'Please fill in all fields');
      return;
    }

    setCreatingClient(true);
    try {
      // Create user via Edge Function (bypasses signup restrictions)
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            email: clientEmail.trim(),
            password: clientPassword.trim(),
            full_name: clientName.trim(),
          }),
        }
      );

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create user');
      }

      const newUser = result.user;

      if (newUser) {
        // Assign Client role
        const clientRole = roles.find(r => r.name === 'Client');
        if (clientRole) {
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert({ user_id: newUser.id, role_id: clientRole.id });

          if (roleError) {
            console.error('Error assigning Client role:', roleError);
          }
        }

        // Create client folder
        const { data: folderId, error: folderError } = await supabase.rpc('create_client_folder', {
          client_user_id: newUser.id,
          folder_name: clientName.trim(),
        });

        if (folderError) {
          console.error('Error creating client folder:', folderError);
        } else if (folderId) {
          // Get the folder and all its children to grant permissions
          const { data: mainFolder } = await supabase
            .from('file_folders')
            .select('id, path')
            .eq('id', folderId)
            .single();

          if (mainFolder) {
            // Get all child folders
            const { data: childFolders } = await supabase
              .from('file_folders')
              .select('id')
              .like('path', `${mainFolder.path}/%`);

            // Combine main folder and children
            const allFolderIds = [mainFolder.id, ...(childFolders || []).map(f => f.id)];

            // Grant view and edit permissions
            const permissionInserts = allFolderIds.map(id => ({
              user_id: newUser.id,
              folder_id: id,
              can_view: true,
              can_edit: true,
            }));

            await supabase
              .from('user_folder_permissions')
              .upsert(permissionInserts, { onConflict: 'user_id,folder_id' });
          }
        }

        // Refresh client folders list
        await fetchClientFolders();
      }

      // Refresh users
      await fetchUsers();

      // Clear form
      setClientEmail('');
      setClientName('');
      setClientPassword('');

      showNotification('success', 'Client Created', `Account for ${clientName.trim()} created successfully with dedicated folder!`);
    } catch (error: any) {
      console.error('Error creating client:', error);
      showNotification('error', 'Creation Failed', `Failed to create client: ${error.message || 'Unknown error'}`);
    } finally {
      setCreatingClient(false);
    }
  };

  // Filter roles by selected department and search query
  const filteredRoles = roles.filter(role => {
    // Filter by department
    const matchesDepartment = selectedDepartment === 'all'
      ? true
      : selectedDepartment === 'system'
        ? !role.department_id
        : role.department_id === selectedDepartment;

    // Filter by search query
    const matchesSearch = roleSearchQuery.trim() === ''
      ? true
      : role.name.toLowerCase().includes(roleSearchQuery.toLowerCase()) ||
        role.description?.toLowerCase().includes(roleSearchQuery.toLowerCase());

    // Hide Super Admin role from non-Super Admin users
    const canAssignRole = role.name === 'Super Admin' ? isCurrentUserSuperAdmin : true;

    return matchesDepartment && matchesSearch && canAssignRole;
  });

  return (
    <div className="min-h-full bg-[#0f0f12] relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#7c3aed] rounded-full blur-[200px] opacity-[0.03]" />

      <div className="relative z-10 p-6 lg:p-10 max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 bg-[#7c3aed] rounded-full" />
            <h1 className="text-2xl lg:text-3xl font-bold text-white">User Management</h1>
          </div>
          <p className="text-[#6b6b7a] ml-4">Manage users and assign roles across departments</p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '100ms' }}>
          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#3b82f6]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{users.length}</p>
                <p className="text-sm text-[#6b6b7a]">Total Users</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#10b981]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#10b981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{roles.length}</p>
                <p className="text-sm text-[#6b6b7a]">Active Roles</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#f59e0b]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{departments.length}</p>
                <p className="text-sm text-[#6b6b7a]">Departments</p>
              </div>
            </div>
          </div>

          <div className="bg-[#141418] border border-[#1f1f28] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#ec4899]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ec4899]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{roles.filter(r => r.is_head_role).length}</p>
                <p className="text-sm text-[#6b6b7a]">Lead Positions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '150ms' }}>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'users'
                ? 'bg-[#7c3aed] text-white'
                : 'bg-[#141418] border border-[#1f1f28] text-[#6b6b7a] hover:text-white hover:border-[#2a2a35]'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Users & Roles
            </span>
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'permissions'
                ? 'bg-[#7c3aed] text-white'
                : 'bg-[#141418] border border-[#1f1f28] text-[#6b6b7a] hover:text-white hover:border-[#2a2a35]'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Section Permissions
            </span>
          </button>
          {canManageFolderPermissions && (
            <button
              onClick={() => setActiveTab('folders')}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === 'folders'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#141418] border border-[#1f1f28] text-[#6b6b7a] hover:text-white hover:border-[#2a2a35]'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Folder Permissions
              </span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('prospects')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'prospects'
                ? 'bg-[#f59e0b] text-white'
                : 'bg-[#141418] border border-[#1f1f28] text-[#6b6b7a] hover:text-white hover:border-[#2a2a35]'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Prospects
            </span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'clients'
                ? 'bg-[#22c55e] text-white'
                : 'bg-[#141418] border border-[#1f1f28] text-[#6b6b7a] hover:text-white hover:border-[#2a2a35]'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Clients
            </span>
          </button>
        </div>

        {/* Users Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    placeholder="Search users, emails, or roles..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-3 pl-12 bg-[#141418] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#7c3aed]/50 focus:ring-2 focus:ring-[#7c3aed]/20 transition-all"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4">
                    <svg className="w-5 h-5 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 items-center">
                  {/* Role Filter */}
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    className="px-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]/50 transition-all cursor-pointer"
                  >
                    <option value="all">All Roles</option>
                    {uniqueRoles.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  {/* No Role Filter */}
                  <button
                    onClick={() => setFilterHasNoRole(!filterHasNoRole)}
                    className={`px-4 py-3 rounded-xl border transition-all flex items-center gap-2 ${
                      filterHasNoRole
                        ? 'bg-[#f59e0b]/20 border-[#f59e0b]/50 text-[#f59e0b]'
                        : 'bg-[#141418] border-[#2a2a35] text-[#6b6b7a] hover:text-white hover:border-[#3a3a48]'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    No Role
                  </button>

                  {/* Client Folder Status Filter */}
                  <select
                    value={filterClientStatus}
                    onChange={(e) => setFilterClientStatus(e.target.value as 'all' | 'with_folder' | 'without_folder')}
                    className="px-4 py-3 bg-[#141418] border border-[#2a2a35] rounded-xl text-white focus:outline-none focus:border-[#7c3aed]/50 transition-all cursor-pointer"
                  >
                    <option value="all">All Clients</option>
                    <option value="with_folder">Clients with Folder</option>
                    <option value="without_folder">Clients without Folder</option>
                  </select>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-4 py-3 bg-[#ea2127]/20 border border-[#ea2127]/30 text-[#ea2127] rounded-xl hover:bg-[#ea2127]/30 transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Active filters count */}
              {hasActiveFilters && (
                <div className="mt-3 flex items-center gap-2 text-sm text-[#6b6b7a]">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  <span>Showing {filteredUsers.length} of {users.length} users</span>
                </div>
              )}
            </div>

            {/* Users Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#6b6b7a]">Loading users...</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl overflow-hidden opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '300ms' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1f1f28]">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6b6b7a] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f1f28]">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#1a1a1f] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white font-semibold text-sm overflow-hidden ring-2 ring-[#1f1f28]">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              user.full_name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-white">{user.full_name}</div>
                            <div className="text-sm text-[#6b6b7a]">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#a0a0b0]">{user.email}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role}
                                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                                style={{
                                  backgroundColor: `${getRoleColor(role)}20`,
                                  color: getRoleColor(role),
                                  border: `1px solid ${getRoleColor(role)}30`,
                                }}
                              >
                                {role}
                                <button
                                  onClick={() => removeRole(user.id, role)}
                                  className="opacity-0 group-hover:opacity-100 hover:text-[#ea2127] transition-all"
                                  title="Remove role"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-[#4a4a58] italic">No roles assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setShowRoleModal(true);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-[#7c3aed]/20 hover:bg-[#7c3aed]/30 text-[#7c3aed] rounded-lg text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Assign Role
                          </button>

                          {/* Client Folder Button - only show for Client role users */}
                          {isClientRole(user) && (
                            hasClientFolder(user.id) ? (
                              <div className="inline-flex items-center gap-2 px-3 py-2 bg-[#22c55e]/20 text-[#22c55e] rounded-lg text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span className="font-medium">{clientFolders[user.id].folder_name}</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedUser(user);
                                  setClientFolderName(user.full_name || user.email.split('@')[0]);
                                  setShowClientFolderModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#22c55e] rounded-lg text-sm font-medium transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                Create Folder
                              </button>
                            )
                          )}

                          {/* Delete User Button - Hidden for Super Admin */}
                          {!user.roles.includes('Super Admin') && (
                            <button
                              onClick={() => confirmDeleteUser(user)}
                              disabled={deletingUser === user.id}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea2127]/20 hover:bg-[#ea2127]/30 text-[#ea2127] rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              title="Delete user"
                            >
                              {deletingUser === user.id ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              )}
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a1f] flex items-center justify-center">
                  <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className="text-[#6b6b7a] mb-2">No users found</p>
                <p className="text-[#4a4a58] text-sm">Try adjusting your search terms</p>
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Section Permissions Tab Content */}
        {activeTab === 'permissions' && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Role Selector */}
              <div className="lg:col-span-1">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-3">Select Role</h3>
                  {/* Search Box */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search roles..."
                      value={permissionRoleSearch}
                      onChange={(e) => setPermissionRoleSearch(e.target.value)}
                      className="w-full px-3 py-2 pl-9 bg-[#1a1a1f] border border-[#2a2a35] rounded-lg text-white text-sm placeholder-[#5a5a68] focus:outline-none focus:border-[#7c3aed]/50 transition-all"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {roles
                      .filter(role =>
                        permissionRoleSearch === '' ||
                        role.name.toLowerCase().includes(permissionRoleSearch.toLowerCase()) ||
                        role.department_name?.toLowerCase().includes(permissionRoleSearch.toLowerCase())
                      )
                      .map((role) => (
                      <button
                        key={role.id}
                        onClick={() => setSelectedRoleForPermissions(role)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                          selectedRoleForPermissions?.id === role.id
                            ? 'border-2'
                            : 'border border-[#2a2a35] hover:border-[#3a3a48] hover:bg-[#1a1a1f]'
                        }`}
                        style={{
                          borderColor: selectedRoleForPermissions?.id === role.id ? role.color : undefined,
                          backgroundColor: selectedRoleForPermissions?.id === role.id ? `${role.color}15` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                            style={{ backgroundColor: `${role.color}20`, color: role.color }}
                          >
                            {role.is_head_role ? '★' : '●'}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{role.name}</p>
                            {role.department_name && (
                              <p className="text-[#5a5a68] text-xs">{role.department_name}</p>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section Permissions */}
              <div className="lg:col-span-2">
                {selectedRoleForPermissions ? (
                  <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${selectedRoleForPermissions.color}20` }}
                        >
                          <span style={{ color: selectedRoleForPermissions.color }}>
                            {selectedRoleForPermissions.is_head_role ? '★' : '●'}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{selectedRoleForPermissions.name}</h3>
                          <p className="text-sm text-[#6b6b7a]">Section Access Permissions</p>
                        </div>
                      </div>
                      {permissionsLoading && (
                        <div className="w-5 h-5 border-2 border-[#7c3aed] border-t-transparent rounded-full animate-spin" />
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {AVAILABLE_SECTIONS.map((section) => {
                        const hasAccess = getRolePermission(selectedRoleForPermissions.id, section.key);
                        const hasEdit = getRoleEditPermission(selectedRoleForPermissions.id, section.key);
                        const isSuperAdmin = selectedRoleForPermissions.name === 'Super Admin';

                        return (
                          <div
                            key={section.key}
                            className={`p-4 rounded-xl border transition-all ${
                              hasAccess
                                ? 'border-[#10b981]/50 bg-[#10b981]/10'
                                : 'border-[#2a2a35] bg-[#1a1a1f]'
                            }`}
                          >
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-2xl">{section.icon}</span>
                              <div className="flex-1">
                                <p className="text-white font-medium text-sm">{section.name}</p>
                                <p className="text-[#5a5a68] text-xs">{section.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* View Access Toggle */}
                              <button
                                onClick={() => toggleSectionPermission(selectedRoleForPermissions.id, section.key, hasAccess)}
                                disabled={permissionsLoading || isSuperAdmin}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                  hasAccess
                                    ? 'bg-[#10b981] text-white'
                                    : 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                                } ${isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </button>

                              {/* Edit Access Toggle - only show for sections that support it */}
                              {section.hasEditPermission && (
                                <button
                                  onClick={() => toggleEditPermission(selectedRoleForPermissions.id, section.key, hasEdit)}
                                  disabled={permissionsLoading || isSuperAdmin || !hasAccess}
                                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                    hasEdit
                                      ? 'bg-[#f59e0b] text-white'
                                      : 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                                  } ${(isSuperAdmin || !hasAccess) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  title={!hasAccess ? 'Enable view access first' : ''}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {selectedRoleForPermissions.name === 'Super Admin' && (
                      <div className="mt-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl">
                        <p className="text-[#f59e0b] text-sm flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Super Admin has access to all sections and cannot be modified.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[#1a1a1f] flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Select a Role</h3>
                    <p className="text-[#6b6b7a] max-w-xs">
                      Choose a role from the list to manage which sections users with that role can access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Folder Permissions Tab Content - Only for Super Admin, Admin, Boss */}
        {activeTab === 'folders' && canManageFolderPermissions && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Selector */}
              <div className="lg:col-span-1">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-4">
                  <h3 className="text-sm font-semibold text-[#6b6b7a] uppercase tracking-wider mb-3">Select User</h3>
                  {/* Search Box */}
                  <div className="relative mb-3">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={folderUserSearch}
                      onChange={(e) => setFolderUserSearch(e.target.value)}
                      className="w-full px-3 py-2 pl-9 bg-[#1a1a1f] border border-[#2a2a35] rounded-lg text-white text-sm placeholder-[#5a5a68] focus:outline-none focus:border-[#3b82f6]/50 transition-all"
                    />
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="space-y-2 max-h-[450px] overflow-y-auto">
                    {users
                      .filter(user =>
                        // Hide Client and Prospect users - they have special folder handling
                        !user.roles.includes('Client') && !user.roles.includes('Prospect')
                      )
                      .filter(user =>
                        folderUserSearch === '' ||
                        user.full_name.toLowerCase().includes(folderUserSearch.toLowerCase()) ||
                        user.email.toLowerCase().includes(folderUserSearch.toLowerCase()) ||
                        user.roles.some(r => r.toLowerCase().includes(folderUserSearch.toLowerCase()))
                      )
                      .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setSelectedUserForFolders(user);
                          fetchUserFolderPermissions(user.id);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          selectedUserForFolders?.id === user.id
                            ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/50'
                            : 'hover:bg-[#1a1a1f] border border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white font-semibold overflow-hidden flex-shrink-0">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{user.full_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate">{user.full_name}</p>
                          <p className="text-[#5a5a68] text-xs truncate">{user.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Folder Permissions */}
              <div className="lg:col-span-2">
                {selectedUserForFolders ? (
                  <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center text-white font-semibold overflow-hidden">
                          {selectedUserForFolders.avatar_url ? (
                            <img src={selectedUserForFolders.avatar_url} alt={selectedUserForFolders.full_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">{selectedUserForFolders.full_name.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{selectedUserForFolders.full_name}</h3>
                          <p className="text-sm text-[#6b6b7a]">{selectedUserForFolders.roles.join(', ') || 'No roles'}</p>
                        </div>
                      </div>
                      {pendingFolderChanges.size > 0 && (
                        <button
                          onClick={saveFolderPermissions}
                          disabled={folderPermissionsLoading}
                          className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          {folderPermissionsLoading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              Saving...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Save ({pendingFolderChanges.size})
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {folderPermissionsSaved ? (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-1">Permissions Saved!</h3>
                        <p className="text-sm text-[#6b6b7a]">Folder permissions updated successfully</p>
                      </div>
                    ) : folderPermissionsLoading ? (
                      <div className="flex flex-col items-center justify-center py-12 px-6">
                        {/* Progress Icon */}
                        <div className="w-16 h-16 rounded-full bg-[#3b82f6]/20 flex items-center justify-center mb-4">
                          <svg className="w-8 h-8 animate-spin text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </div>

                        <h3 className="text-lg font-semibold text-white mb-2">Saving Permissions</h3>

                        {/* Progress bar */}
                        <div className="w-full max-w-xs mb-3">
                          <div className="h-2 bg-[#2a2a35] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] transition-all duration-300 ease-out"
                              style={{
                                width: saveProgress.total > 0
                                  ? `${(saveProgress.current / saveProgress.total) * 100}%`
                                  : '0%'
                              }}
                            />
                          </div>
                        </div>

                        {/* Progress text */}
                        <p className="text-sm text-[#6b6b7a]">
                          {saveProgress.total > 0 ? (
                            <>
                              <span className="text-white font-medium">{saveProgress.current}</span>
                              <span> of </span>
                              <span className="text-white font-medium">{saveProgress.total}</span>
                              <span> folders processed</span>
                            </>
                          ) : (
                            'Preparing...'
                          )}
                        </p>

                        {/* Percentage */}
                        {saveProgress.total > 0 && (
                          <p className="text-2xl font-bold text-[#3b82f6] mt-2">
                            {Math.round((saveProgress.current / saveProgress.total) * 100)}%
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#2a2a35] text-xs font-medium text-[#6b6b7a] uppercase tracking-wider">
                          <div className="col-span-8">Folder</div>
                          <div className="col-span-2 text-center">View</div>
                          <div className="col-span-2 text-center">Edit</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {allFolders.filter(isFolderVisible).map((folder) => {
                            const permission = getFolderPermission(folder.id, folder.path);
                            const hasChanges = pendingFolderChanges.has(folder.id);
                            const indent = folder.depth * 20;
                            const isExpanded = expandedPermissionFolders.has(folder.id);
                            const folderHasChildren = hasChildren(folder.id);

                            return (
                              <div
                                key={folder.id}
                                className={`grid grid-cols-12 gap-2 py-2.5 rounded-lg transition-colors ${
                                  hasChanges ? 'bg-[#3b82f6]/10' : 'hover:bg-[#1a1a1f]'
                                }`}
                              >
                                <div
                                  className="col-span-8 flex items-center gap-1 text-sm"
                                  style={{ paddingLeft: `${indent}px` }}
                                >
                                  {/* Expand/Collapse button */}
                                  {folderHasChildren ? (
                                    <button
                                      onClick={() => toggleFolderExpand(folder.id)}
                                      className="w-5 h-5 flex items-center justify-center text-[#6b6b7a] hover:text-white transition-colors flex-shrink-0"
                                    >
                                      <svg
                                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                    </button>
                                  ) : (
                                    <span className="w-5 flex-shrink-0" />
                                  )}
                                  <span style={{ color: folder.color }} className="flex-shrink-0">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                  </span>
                                  <span className="text-white truncate">{folder.name}</span>
                                  {folderHasChildren && (
                                    <span className="text-[#4a4a58] text-xs ml-1">
                                      ({allFolders.filter(f => f.parent_id === folder.id).length})
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                  <button
                                    onClick={() => toggleFolderPermission(folder.id, 'canView')}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                      permission.canView
                                        ? 'bg-[#22c55e] text-white'
                                        : 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                                    }`}
                                  >
                                    {permission.canView && (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                                <div className="col-span-2 flex items-center justify-center">
                                  <button
                                    onClick={() => toggleFolderPermission(folder.id, 'canEdit')}
                                    disabled={!permission.canView}
                                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                      permission.canEdit
                                        ? 'bg-[#3b82f6] text-white'
                                        : permission.canView
                                        ? 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                                        : 'bg-[#1a1a1f] text-[#3a3a48] cursor-not-allowed'
                                    }`}
                                  >
                                    {permission.canEdit && (
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Info about role-based access */}
                    <div className="mt-4 p-3 bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl">
                      <p className="text-[#3b82f6] text-sm flex items-start gap-2">
                        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Super Admin, C-Level, Boss, and Head roles have full access to all folders. Managers have access to everything except Legal. Individual permissions here only apply to Client and Prospect users.</span>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 rounded-full bg-[#1a1a1f] flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Select a User</h3>
                    <p className="text-[#6b6b7a] max-w-xs">
                      Choose a user from the list to manage which folders they can access.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Prospects Tab Content */}
        {activeTab === 'prospects' && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Prospect Form */}
              <div className="lg:col-span-1">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Prospect Account
                  </h3>
                  <p className="text-sm text-[#6b6b7a] mb-6">
                    Create a temporary prospect account with a dedicated folder. Account expires in 14 days.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Full Name</label>
                      <input
                        type="text"
                        value={prospectName}
                        onChange={(e) => setProspectName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Email</label>
                      <input
                        type="email"
                        value={prospectEmail}
                        onChange={(e) => setProspectEmail(e.target.value)}
                        placeholder="prospect@example.com"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Password</label>
                      <input
                        type="password"
                        value={prospectPassword}
                        onChange={(e) => setProspectPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#f59e0b]/50 transition-all"
                      />
                    </div>
                    <button
                      onClick={createProspectAccount}
                      disabled={creatingProspect || !prospectName.trim() || !prospectEmail.trim() || !prospectPassword.trim()}
                      className="w-full px-4 py-3 bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingProspect ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Prospect
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl">
                    <p className="text-[#f59e0b] text-xs flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>A dedicated folder will be automatically created in the Prospects directory with Contracts, Blueprints, Invoices, and Reports subfolders.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Prospect List */}
              <div className="lg:col-span-2">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#f59e0b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Active Prospects ({prospectUsers.length})
                  </h3>

                  {prospectUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-[#1a1a1f] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-[#6b6b7a]">No active prospects</p>
                      <p className="text-sm text-[#4a4a58] mt-1">Create a prospect account to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {prospectUsers.map((prospect) => {
                        const daysRemaining = getProspectDaysRemaining(prospect.created_at);
                        const isExpired = daysRemaining === 0;

                        return (
                          <div
                            key={prospect.id}
                            className={`p-4 rounded-xl border transition-all ${
                              isExpired
                                ? 'border-[#ea2127]/30 bg-[#ea2127]/5'
                                : 'border-[#2a2a35] bg-[#1a1a1f] hover:border-[#3a3a48]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#ea580c] flex items-center justify-center text-white font-semibold">
                                  {prospect.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{prospect.full_name}</p>
                                  <p className="text-sm text-[#6b6b7a]">{prospect.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  isExpired
                                    ? 'bg-[#ea2127]/20 text-[#ea2127]'
                                    : daysRemaining <= 3
                                    ? 'bg-[#f59e0b]/20 text-[#f59e0b]'
                                    : 'bg-[#22c55e]/20 text-[#22c55e]'
                                }`}>
                                  {isExpired ? 'Expired' : `${daysRemaining} days left`}
                                </div>
                                <button
                                  onClick={() => confirmDeleteProspect(prospect)}
                                  disabled={deletingProspect === prospect.id}
                                  className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete prospect"
                                >
                                  {deletingProspect === prospect.id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Clients Tab Content */}
        {activeTab === 'clients' && (
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Client Form */}
              <div className="lg:col-span-1">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Create Client Account
                  </h3>
                  <p className="text-sm text-[#6b6b7a] mb-6">
                    Create a new client account with a dedicated project folder.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Full Name / Company</label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        placeholder="ACME Corporation"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#22c55e]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Email</label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#22c55e]/50 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#8b8b9a] mb-2">Password</label>
                      <input
                        type="password"
                        value={clientPassword}
                        onChange={(e) => setClientPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#22c55e]/50 transition-all"
                      />
                    </div>
                    <button
                      onClick={createClientAccount}
                      disabled={creatingClient || !clientName.trim() || !clientEmail.trim() || !clientPassword.trim()}
                      className="w-full px-4 py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {creatingClient ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Client
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-xl">
                    <p className="text-[#22c55e] text-xs flex items-start gap-2">
                      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>A dedicated folder will be automatically created in the Clients directory with Contracts, Blueprints, Invoices, and Reports subfolders.</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Client List */}
              <div className="lg:col-span-2">
                <div className="bg-[#141418] border border-[#1f1f28] rounded-2xl p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Active Clients ({clientUsers.length})
                  </h3>

                  {clientUsers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-[#1a1a1f] flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#3a3a48]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-[#6b6b7a]">No active clients</p>
                      <p className="text-sm text-[#4a4a58] mt-1">Create a client account to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clientUsers.map((client) => {
                        const hasFolder = !!clientFolders[client.id];
                        const folderName = clientFolders[client.id]?.folder_name;

                        return (
                          <div
                            key={client.id}
                            className="p-4 rounded-xl border border-[#2a2a35] bg-[#1a1a1f] hover:border-[#3a3a48] transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center text-white font-semibold">
                                  {client.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-white font-medium">{client.full_name}</p>
                                  <p className="text-sm text-[#6b6b7a]">{client.email}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                {hasFolder ? (
                                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-[#22c55e]/20 text-[#22c55e] flex items-center gap-1.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                    {folderName}
                                  </div>
                                ) : (
                                  <div className="px-3 py-1 rounded-full text-xs font-medium bg-[#f59e0b]/20 text-[#f59e0b]">
                                    No folder
                                  </div>
                                )}
                                <button
                                  onClick={() => confirmDeleteClient(client)}
                                  disabled={deletingClient === client.id}
                                  className="p-2 text-[#6b6b7a] hover:text-[#ea2127] hover:bg-[#ea2127]/10 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete client"
                                >
                                  {deletingClient === client.id ? (
                                    <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Role Assignment Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white font-semibold overflow-hidden ring-2 ring-[#2a2a35]">
                      {selectedUser.avatar_url ? (
                        <img
                          src={selectedUser.avatar_url}
                          alt={selectedUser.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg">{selectedUser.full_name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Assign Role</h2>
                      <p className="text-[#6b6b7a] text-sm mt-0.5">
                        to <span className="text-[#7c3aed]">{selectedUser.full_name}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                      setRoleSearchQuery('');
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Role Search */}
                <div className="relative mt-4">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5a5a68]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={roleSearchQuery}
                    onChange={(e) => setRoleSearchQuery(e.target.value)}
                    placeholder="Search roles..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#5a5a68] focus:outline-none focus:border-[#7c3aed]/50 focus:ring-2 focus:ring-[#7c3aed]/20 transition-all text-sm"
                  />
                </div>

                {/* Department Filter */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={() => setSelectedDepartment('all')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedDepartment === 'all'
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                    }`}
                  >
                    All Roles
                  </button>
                  <button
                    onClick={() => setSelectedDepartment('system')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedDepartment === 'system'
                        ? 'bg-[#7c3aed] text-white'
                        : 'bg-[#1f1f28] text-[#6b6b7a] hover:text-white'
                    }`}
                  >
                    System
                  </button>
                  {departments.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => setSelectedDepartment(dept.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedDepartment === dept.id
                          ? 'text-white'
                          : 'text-[#6b6b7a] hover:text-white'
                      }`}
                      style={{
                        backgroundColor: selectedDepartment === dept.id ? dept.color : '#1f1f28',
                      }}
                    >
                      {dept.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-3 overflow-y-auto max-h-[calc(90vh-200px)]">
                {filteredRoles.length === 0 ? (
                  <div className="text-center py-8 text-[#6b6b7a]">
                    No roles in this category
                  </div>
                ) : (
                  filteredRoles.map((role) => {
                    const hasRole = selectedUser.roles.includes(role.name);
                    return (
                      <button
                        key={role.id}
                        onClick={() => !hasRole && assignRole(selectedUser.id, role.id)}
                        disabled={hasRole}
                        className={`w-full text-left px-4 py-4 rounded-xl border transition-all ${
                          hasRole
                            ? 'bg-[#1a1a1f] border-[#2a2a35] opacity-50 cursor-not-allowed'
                            : 'bg-[#1a1a1f] border-[#2a2a35] hover:border-[#3a3a48] hover:bg-[#1f1f28]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${role.color}20` }}
                            >
                              <span style={{ color: role.color }}>
                                {role.is_head_role ? '★' : '●'}
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white">{role.name}</span>
                                {role.is_head_role && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#f59e0b]/20 text-[#f59e0b]">
                                    Lead
                                  </span>
                                )}
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: `${role.color}20`,
                                    color: role.color,
                                  }}
                                >
                                  {getPermissionLevelLabel(role.permission_level)}
                                </span>
                              </div>
                              <p className="text-sm text-[#6b6b7a] mt-0.5">{role.description}</p>
                              {role.department_name && (
                                <p className="text-xs text-[#4a4a58] mt-1">
                                  Department: {role.department_name}
                                </p>
                              )}
                            </div>
                          </div>
                          {hasRole && (
                            <div className="flex items-center gap-2 text-[#10b981]">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              <span className="text-sm">Assigned</span>
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="sticky bottom-0 bg-[#141418] border-t border-[#2a2a35] px-6 py-4">
                <button
                  onClick={() => {
                    setShowRoleModal(false);
                    setSelectedUser(null);
                    setSelectedDepartment('all');
                    setRoleSearchQuery('');
                  }}
                  className="w-full px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client Folder Creation Modal */}
        {showClientFolderModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
              <div className="border-b border-[#2a2a35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#22c55e]/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Create Client Folder</h2>
                      <p className="text-sm text-[#6b6b7a]">for {selectedUser.full_name || selectedUser.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowClientFolderModal(false);
                      setClientFolderName('');
                      setSelectedUser(null);
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="px-6 py-6">
                <label className="block text-sm font-medium text-[#8b8b9a] mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={clientFolderName}
                  onChange={(e) => setClientFolderName(e.target.value)}
                  placeholder="Enter folder name..."
                  className="w-full px-4 py-3 bg-[#1a1a1f] border border-[#2a2a35] rounded-xl text-white placeholder-[#4a4a58] focus:outline-none focus:border-[#22c55e] transition-colors"
                  autoFocus
                />
                <p className="mt-2 text-xs text-[#6b6b7a]">
                  This folder will contain Documents, Projects, and Assets subfolders.
                </p>
              </div>

              <div className="border-t border-[#2a2a35] px-6 py-4 flex gap-3">
                <button
                  onClick={() => {
                    setShowClientFolderModal(false);
                    setClientFolderName('');
                    setSelectedUser(null);
                  }}
                  className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createClientFolder}
                  disabled={!clientFolderName.trim() || creatingFolder}
                  className="flex-1 px-4 py-3 bg-[#22c55e] hover:bg-[#16a34a] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {creatingFolder ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Create Folder
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Folder Permissions Modal - Only for Super Admin, Admin, Boss */}
        {showFolderPermissionsModal && selectedUserForFolders && canManageFolderPermissions && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="border-b border-[#2a2a35] px-6 py-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Folder Permissions</h2>
                      <p className="text-sm text-[#6b6b7a]">for {selectedUserForFolders.full_name || selectedUserForFolders.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowFolderPermissionsModal(false);
                      setSelectedUserForFolders(null);
                      setPendingFolderChanges(new Map());
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                {folderPermissionsSaved ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-[#22c55e]/20 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-1">Permissions Saved!</h3>
                    <p className="text-sm text-[#6b6b7a]">Folder permissions updated successfully</p>
                  </div>
                ) : folderPermissionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 px-6">
                    {/* Progress Icon */}
                    <div className="w-16 h-16 rounded-full bg-[#3b82f6]/20 flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 animate-spin text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>

                    <h3 className="text-lg font-semibold text-white mb-2">Saving Permissions</h3>

                    {/* Progress bar */}
                    <div className="w-full max-w-xs mb-3">
                      <div className="h-2 bg-[#2a2a35] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] transition-all duration-300 ease-out"
                          style={{
                            width: saveProgress.total > 0
                              ? `${(saveProgress.current / saveProgress.total) * 100}%`
                              : '0%'
                          }}
                        />
                      </div>
                    </div>

                    {/* Progress text */}
                    <p className="text-sm text-[#6b6b7a]">
                      {saveProgress.total > 0 ? (
                        <>
                          <span className="text-white font-medium">{saveProgress.current}</span>
                          <span> of </span>
                          <span className="text-white font-medium">{saveProgress.total}</span>
                          <span> folders processed</span>
                        </>
                      ) : (
                        'Preparing...'
                      )}
                    </p>

                    {/* Percentage */}
                    {saveProgress.total > 0 && (
                      <p className="text-2xl font-bold text-[#3b82f6] mt-2">
                        {Math.round((saveProgress.current / saveProgress.total) * 100)}%
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Role-based access info and custom permissions notice */}
                    {getUserFolderAccessLevel() !== 'none' && (
                      <div className={`flex items-start gap-3 p-3 rounded-xl mb-3 ${
                        hasCustomPermissions()
                          ? 'bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                          : 'bg-[#22c55e]/10 border border-[#22c55e]/30'
                      }`}>
                        <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasCustomPermissions() ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          {hasCustomPermissions() ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          )}
                        </svg>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${hasCustomPermissions() ? 'text-[#f59e0b]' : 'text-[#22c55e]'}`}>
                            {hasCustomPermissions() ? 'Custom Permissions Set' : 'Role-Based Access (Default)'}
                          </p>
                          <p className="text-xs text-[#6b6b7a] mt-0.5">
                            {hasCustomPermissions()
                              ? 'This user has custom folder permissions that override their role defaults.'
                              : getUserFolderAccessLevel() === 'full'
                                ? 'Default: Full access to all folders based on their role.'
                                : 'Default: Access to all folders except Legal/Documentation.'}
                          </p>
                        </div>
                        {hasCustomPermissions() && (
                          <button
                            onClick={resetToDefaults}
                            disabled={folderPermissionsLoading}
                            className="px-3 py-1.5 bg-[#6b6b7a]/20 hover:bg-[#6b6b7a]/30 text-[#6b6b7a] hover:text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Reset to Defaults
                          </button>
                        )}
                      </div>
                    )}
                    {/* Select All / Deselect All buttons */}
                    <div className="flex items-center gap-2 pb-3 border-b border-[#2a2a35]">
                      <button
                        onClick={selectAllFolders}
                        className="px-3 py-1.5 bg-[#22c55e]/20 hover:bg-[#22c55e]/30 text-[#22c55e] text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Select All
                      </button>
                      <button
                        onClick={deselectAllFolders}
                        className="px-3 py-1.5 bg-[#ef4444]/20 hover:bg-[#ef4444]/30 text-[#ef4444] text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Deselect All
                      </button>
                      {getUserFolderAccessLevel() !== 'none' && !hasCustomPermissions() && (
                        <span className="ml-auto text-xs text-[#6b6b7a]">Edit to override defaults</span>
                      )}
                    </div>
                    <div className="grid grid-cols-12 gap-2 pb-2 border-b border-[#2a2a35] text-xs font-medium text-[#6b6b7a] uppercase tracking-wider">
                      <div className="col-span-8">Folder</div>
                      <div className="col-span-2 text-center">View</div>
                      <div className="col-span-2 text-center">Edit</div>
                    </div>
                    {allFolders.map((folder) => {
                      const permission = getFolderPermission(folder.id, folder.path);
                      const hasChanges = pendingFolderChanges.has(folder.id);
                      const indent = folder.depth * 16;

                      return (
                        <div
                          key={folder.id}
                          className={`grid grid-cols-12 gap-2 py-2 rounded-lg transition-colors ${
                            hasChanges ? 'bg-[#3b82f6]/10' : 'hover:bg-[#1a1a1f]'
                          }`}
                        >
                          <div
                            className="col-span-8 flex items-center gap-2 text-sm"
                            style={{ paddingLeft: `${indent}px` }}
                          >
                            <span style={{ color: folder.color }}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                              </svg>
                            </span>
                            <span className="text-white truncate">{folder.name}</span>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <button
                              onClick={() => toggleFolderPermission(folder.id, 'canView')}
                              className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                permission.canView
                                  ? 'bg-[#22c55e] text-white'
                                  : 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                              }`}
                            >
                              {permission.canView && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                          <div className="col-span-2 flex items-center justify-center">
                            <button
                              onClick={() => toggleFolderPermission(folder.id, 'canEdit')}
                              disabled={!permission.canView}
                              className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                permission.canEdit
                                  ? 'bg-[#3b82f6] text-white'
                                  : permission.canView
                                  ? 'bg-[#2a2a35] text-[#6b6b7a] hover:bg-[#3a3a48]'
                                  : 'bg-[#1a1a1f] text-[#3a3a48] cursor-not-allowed'
                              }`}
                            >
                              {permission.canEdit && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {!folderPermissionsSaved && (
                <div className="border-t border-[#2a2a35] px-6 py-4 flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => {
                      setShowFolderPermissionsModal(false);
                      setSelectedUserForFolders(null);
                      setPendingFolderChanges(new Map());
                    }}
                    className="flex-1 px-4 py-2.5 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveFolderPermissions}
                    disabled={folderPermissionsLoading || pendingFolderChanges.size === 0}
                    className="flex-1 px-4 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {folderPermissionsLoading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Permissions
                        {pendingFolderChanges.size > 0 && (
                          <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded">
                            {pendingFolderChanges.size}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && deleteUserInfo && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-[#ea2127]/20 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Delete {deleteUserInfo.type === 'prospect' ? 'Prospect' : deleteUserInfo.type === 'client' ? 'Client' : 'User'}</h3>
                    <p className="text-[#6b6b7a] text-sm mt-1">This action cannot be undone</p>
                  </div>
                </div>

                <div className="bg-[#1a1a1f] border border-[#2a2a35] rounded-xl p-4 mb-6">
                  <p className="text-white">
                    Are you sure you want to delete <span className="font-semibold text-[#ea2127]">{deleteUserInfo.name}</span>?
                  </p>
                  <p className="text-[#6b6b7a] text-sm mt-2">
                    This will permanently remove their account, roles, and folder permissions.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeDeleteModal}
                    className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onMouseDown={startHold}
                    onMouseUp={endHold}
                    onMouseLeave={endHold}
                    onTouchStart={startHold}
                    onTouchEnd={endHold}
                    className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#dc2626] text-white rounded-xl font-medium transition-colors relative overflow-hidden"
                  >
                    <div
                      className="absolute inset-0 bg-black/30 transition-all duration-100"
                      style={{ width: `${100 - deleteHoldProgress}%`, right: 0, left: 'auto' }}
                    />
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      {isHolding ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Hold to Delete ({Math.ceil((100 - deleteHoldProgress) / 33)}s)
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Hold to Delete (3s)
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Popup */}
        {notification.show && (
          <div className="fixed top-6 right-6 z-50 animate-[slideInRight_0.3s_ease-out]">
            <div className={`bg-[#141418] border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden ${
              notification.type === 'success' ? 'border-[#22c55e]/30' : 'border-[#ea2127]/30'
            }`}>
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notification.type === 'success' ? 'bg-[#22c55e]/20' : 'bg-[#ea2127]/20'
                  }`}>
                    {notification.type === 'success' ? (
                      <svg className="w-5 h-5 text-[#22c55e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold ${
                      notification.type === 'success' ? 'text-[#22c55e]' : 'text-[#ea2127]'
                    }`}>
                      {notification.title}
                    </h4>
                    <p className="text-[#8b8b9a] text-sm mt-1">{notification.message}</p>
                  </div>
                  <button
                    onClick={closeNotification}
                    className="text-[#6b6b7a] hover:text-white transition-colors flex-shrink-0"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {/* Auto-close progress bar */}
              <div className={`h-1 ${notification.type === 'success' ? 'bg-[#22c55e]' : 'bg-[#ea2127]'} animate-[shrink_4s_linear_forwards]`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
