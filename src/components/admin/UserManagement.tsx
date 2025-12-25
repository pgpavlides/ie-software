import { useEffect, useState } from 'react';
import supabase from '../../lib/supabase';

interface User {
  id: string;
  email: string;
  full_name: string;
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

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchDepartments();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: usersData, error } = await supabase.rpc('get_all_users_with_roles');

      if (error) throw error;

      const formattedUsers = usersData?.map((user: any) => ({
        id: user.user_id,
        email: user.email || '',
        full_name: user.full_name || 'N/A',
        created_at: user.created_at,
        roles: user.role_names || [],
      })) || [];

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

  const assignRole = async (userId: string, roleId: string) => {
    try {
      const { error } = await supabase.from('user_roles').insert({
        user_id: userId,
        role_id: roleId,
      });

      if (error) throw error;

      await fetchUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
    } catch (error: any) {
      console.error('Error assigning role:', error);
      alert(error.message || 'Failed to assign role');
    }
  };

  const removeRole = async (userId: string, roleName: string) => {
    try {
      const role = roles.find((r) => r.name === roleName);
      if (!role) return;

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role_id', role.id);

      if (error) throw error;

      await fetchUsers();
    } catch (error: any) {
      console.error('Error removing role:', error);
      alert(error.message || 'Failed to remove role');
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
    const matchesSearch = searchQuery === '' ||
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.roles.some(r => r.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  // Filter roles by selected department
  const filteredRoles = selectedDepartment === 'all'
    ? roles
    : selectedDepartment === 'system'
      ? roles.filter(r => !r.department_id)
      : roles.filter(r => r.department_id === selectedDepartment);

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

        {/* Search */}
        <div className="mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]" style={{ animationDelay: '200ms' }}>
          <div className="relative max-w-md">
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
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#ec4899] flex items-center justify-center text-white font-semibold text-sm">
                            {user.full_name.charAt(0).toUpperCase()}
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

        {/* Role Assignment Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#141418] border border-[#2a2a35] rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              <div className="sticky top-0 bg-[#141418] border-b border-[#2a2a35] px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">Assign Role</h2>
                    <p className="text-[#6b6b7a] text-sm mt-1">
                      Assign roles to <span className="text-[#7c3aed]">{selectedUser.full_name}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowRoleModal(false);
                      setSelectedUser(null);
                    }}
                    className="p-2 text-[#6b6b7a] hover:text-white hover:bg-[#1f1f28] rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Department Filter */}
                <div className="flex flex-wrap gap-2 mt-4">
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
                  }}
                  className="w-full px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-white rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
