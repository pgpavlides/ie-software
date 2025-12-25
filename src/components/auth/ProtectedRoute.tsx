import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useViewAsStore } from '../../store/viewAsStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string[];
  requireSuperAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireRole, requireSuperAdmin = false }: ProtectedRouteProps) {
  const { user, loading, initialized, initialize, roles: actualRoles } = useAuthStore();
  const { getEffectiveRoles, isViewingAs } = useViewAsStore();
  const location = useLocation();

  const effectiveRoles = getEffectiveRoles();
  const viewingAs = isViewingAs();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  if (loading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f12]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ea2127] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#6b6b7a]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin always has access (they're just testing with ViewAs)
  // If viewing as another role, check that role's permissions
  const isSuperAdmin = actualRoles.includes('Super Admin');

  // If user is Super Admin and NOT using ViewAs mode, always allow access
  if (isSuperAdmin && !viewingAs) {
    return <>{children}</>;
  }

  // Check for Super Admin requirement
  if (requireSuperAdmin && !effectiveRoles.includes('Super Admin')) {
    return <AccessDenied requiredRole="Super Admin" userRoles={effectiveRoles} isViewingAs={viewingAs} />;
  }

  // Check if user has required role
  if (requireRole && requireRole.length > 0) {
    const hasRequiredRole = requireRole.some(role => effectiveRoles.includes(role));

    if (!hasRequiredRole) {
      return <AccessDenied requiredRole={requireRole.join(' or ')} userRoles={effectiveRoles} isViewingAs={viewingAs} />;
    }
  }

  return <>{children}</>;
}

// Access Denied component with dark theme
function AccessDenied({ requiredRole, userRoles, isViewingAs = false }: { requiredRole: string; userRoles: string[]; isViewingAs?: boolean }) {
  return (
    <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#ea2127] rounded-full blur-[180px] opacity-[0.08]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#ea2127] rounded-full blur-[180px] opacity-[0.05]" />

      <div className="relative z-10 max-w-md w-full mx-4">
        {/* Card glow effect */}
        <div className="absolute -inset-px bg-gradient-to-b from-[#ea2127]/20 via-transparent to-transparent rounded-3xl blur-sm" />

        <div className="relative bg-[#141418]/90 backdrop-blur-xl border border-[#1f1f28] rounded-3xl p-8 shadow-2xl text-center">
          {/* ViewAs Mode Indicator */}
          {isViewingAs && (
            <div className="mb-4 px-4 py-2 bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl">
              <div className="flex items-center justify-center gap-2 text-[#f59e0b]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span className="text-sm font-medium">View As Mode Active</span>
              </div>
            </div>
          )}

          {/* Icon */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-[#ea2127] rounded-2xl blur-2xl opacity-20" />
            <div className="relative w-20 h-20 mx-auto bg-gradient-to-br from-[#1a1a1f] to-[#0f0f12] rounded-2xl border border-[#2a2a35] flex items-center justify-center shadow-xl">
              <svg className="w-10 h-10 text-[#ea2127]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-[#6b6b7a] mb-6">
            {isViewingAs
              ? "This role doesn't have permission to access this section."
              : "You don't have permission to access this section."}
          </p>

          {/* Required Role */}
          <div className="bg-[#1a1a1f] rounded-xl p-4 mb-6">
            <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-2">Required Access</p>
            <p className="text-[#ea2127] font-semibold">{requiredRole}</p>
          </div>

          {/* Current Roles */}
          {userRoles.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-[#4a4a58] uppercase tracking-wider mb-2">Your Current Roles</p>
              <div className="flex flex-wrap justify-center gap-2">
                {userRoles.map((role) => (
                  <span
                    key={role}
                    className="px-3 py-1 bg-[#1f1f28] text-[#8b8b9a] rounded-lg text-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            </div>
          )}

          {userRoles.length === 0 && (
            <div className="mb-6 p-4 bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-xl">
              <p className="text-[#f59e0b] text-sm">
                No roles assigned. Please contact your administrator.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => window.history.back()}
              className="flex-1 px-4 py-3 bg-[#1f1f28] hover:bg-[#2a2a38] text-[#a0a0b0] hover:text-white rounded-xl transition-colors"
            >
              Go Back
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 px-4 py-3 bg-[#ea2127] hover:bg-[#d11920] text-white rounded-xl transition-colors"
            >
              Home
            </button>
          </div>

          {/* Footer */}
          <p className="mt-6 text-xs text-[#4a4a58]">
            Contact your system administrator if you believe this is an error.
          </p>
        </div>
      </div>
    </div>
  );
}
