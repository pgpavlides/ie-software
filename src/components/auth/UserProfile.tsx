import { useAuthStore } from '../../store/authStore';
import { FaUser, FaSignOutAlt, FaUserTag } from 'react-icons/fa';

export default function UserProfile() {
  const { user, roles, signOut } = useAuthStore();

  if (!user) return null;

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
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 rounded-full p-3">
            <FaUser className="text-blue-600 text-xl" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {user.user_metadata?.full_name || 'User'}
            </h3>
            <p className="text-sm text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
          <FaUserTag />
          <span className="font-medium">Roles:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {roles.length > 0 ? (
            roles.map((role) => (
              <span
                key={role}
                className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(role)}`}
              >
                {role}
              </span>
            ))
          ) : (
            <span className="text-sm text-gray-500 italic">No roles assigned</span>
          )}
        </div>
      </div>

      <button
        onClick={signOut}
        className="w-full flex items-center justify-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
      >
        <FaSignOutAlt />
        <span>Sign Out</span>
      </button>
    </div>
  );
}
