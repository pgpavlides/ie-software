import { useEffect, useState } from 'react';
import { FaUserPlus, FaUserShield, FaTrash } from 'react-icons/fa';
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
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Use the custom function instead of admin API
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
      const { data, error } = await supabase.from('roles').select('*').order('name');

      if (error) throw error;

      setRoles(data || []);
    } catch (error) {
      console.error('Error fetching roles:', error);
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Engineer':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Electronics':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Project Manager':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Architect':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">User Management</h1>
        <p className="text-gray-600">Manage users and assign roles</p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading users...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.full_name}</div>
                    <div className="text-sm text-gray-500">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <span
                            key={role}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                              role
                            )}`}
                          >
                            {role}
                            <button
                              onClick={() => removeRole(user.id, role)}
                              className="ml-1 hover:text-red-600"
                              title="Remove role"
                            >
                              <FaTrash className="text-xs" />
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-400 italic">No roles assigned</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowRoleModal(true);
                      }}
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      <FaUserPlus />
                      <span>Assign Role</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Assign Role to {selectedUser.full_name}
            </h3>

            <div className="space-y-2 mb-6">
              {roles.map((role) => {
                const hasRole = selectedUser.roles.includes(role.name);
                return (
                  <button
                    key={role.id}
                    onClick={() => !hasRole && assignRole(selectedUser.id, role.id)}
                    disabled={hasRole}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      hasRole
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-white border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-sm text-gray-600">{role.description}</div>
                      </div>
                      {hasRole && <FaUserShield className="text-green-600" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => {
                setShowRoleModal(false);
                setSelectedUser(null);
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
