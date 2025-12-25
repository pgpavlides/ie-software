# Authentication & Authorization System

This document describes the authentication and role-based authorization system implemented in the IE Software escape room management application.

## Overview

The system uses **Supabase Authentication** with custom role-based access control (RBAC). Users can sign up, sign in, and be assigned specific roles that determine their access levels throughout the application.

## User Roles

The system supports four distinct roles:

### 1. **Admin**
- Full system access
- User management capabilities
- Can assign/remove roles from other users
- Access to all features and rooms

### 2. **Engineer**
- Technical access to all rooms and systems
- Can view and manage technical details
- Full access to room information

### 3. **Electronics**
- Access to electronics and hardware systems
- Can view and manage electronic components
- Specialized access for hardware-related tasks

### 4. **Project Manager**
- Project oversight capabilities
- Reporting and analytics access
- Can view project status and metrics

## Database Schema

### Tables

#### `roles`
```sql
- id (UUID, PRIMARY KEY)
- name (TEXT, UNIQUE)
- description (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `user_roles`
```sql
- id (UUID, PRIMARY KEY)
- user_id (UUID, FOREIGN KEY → auth.users)
- role_id (UUID, FOREIGN KEY → roles)
- created_at (TIMESTAMP)
- UNIQUE(user_id, role_id)
```

### Functions

#### `get_user_roles(user_id UUID)`
Returns all role names for a given user.

```sql
SELECT role_name FROM get_user_roles('user-uuid-here');
```

#### `user_has_role(user_id UUID, role_name TEXT)`
Checks if a user has a specific role.

```sql
SELECT user_has_role('user-uuid-here', 'Admin');
```

## Implementation

### Auth Store (Zustand)

Located at: [src/store/authStore.ts](src/store/authStore.ts)

The auth store manages:
- User session state
- User roles
- Authentication actions (sign in, sign up, sign out)
- Role checking utilities

```typescript
import { useAuthStore } from './store/authStore';

// In a component
const { user, roles, signIn, signOut, hasRole, isAdmin } = useAuthStore();

// Check if user has a specific role
if (hasRole('Engineer')) {
  // Show engineer-specific content
}

// Check if user is an admin
if (isAdmin()) {
  // Show admin panel
}
```

### Protected Routes

Located at: [src/components/auth/ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx)

```tsx
import ProtectedRoute from './components/auth/ProtectedRoute';

// Protect a route - requires authentication
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />

// Protect a route - requires specific role(s)
<Route path="/admin" element={
  <ProtectedRoute requireRole={['Admin']}>
    <AdminPanel />
  </ProtectedRoute>
} />

// Multiple roles (user needs at least one)
<Route path="/technical" element={
  <ProtectedRoute requireRole={['Admin', 'Engineer', 'Electronics']}>
    <TechnicalPanel />
  </ProtectedRoute>
} />
```

### Components

#### Login Component
Location: [src/components/auth/Login.tsx](src/components/auth/Login.tsx)
- Email/password login
- Error handling
- Redirect after successful login

#### Sign Up Component
Location: [src/components/auth/SignUp.tsx](src/components/auth/SignUp.tsx)
- User registration
- Email verification
- Password confirmation
- Full name capture

#### User Profile Component
Location: [src/components/auth/UserProfile.tsx](src/components/auth/UserProfile.tsx)
- Displays current user information
- Shows assigned roles with color-coded badges
- Sign out functionality

#### User Management (Admin Only)
Location: [src/components/admin/UserManagement.tsx](src/components/admin/UserManagement.tsx)
- List all users
- View user roles
- Assign roles to users
- Remove roles from users
- Admin-only access

## Usage Examples

### 1. Check User Authentication

```typescript
import { useAuthStore } from './store/authStore';

function MyComponent() {
  const { user, loading } = useAuthStore();

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please log in</div>;

  return <div>Welcome, {user.email}!</div>;
}
```

### 2. Role-Based UI

```typescript
import { useAuthStore } from './store/authStore';

function Dashboard() {
  const { hasRole, isAdmin } = useAuthStore();

  return (
    <div>
      <h1>Dashboard</h1>

      {isAdmin() && (
        <Link to="/admin/users">User Management</Link>
      )}

      {hasRole('Engineer') && (
        <Link to="/technical">Technical Panel</Link>
      )}

      {(hasRole('Project Manager') || isAdmin()) && (
        <Link to="/reports">Reports</Link>
      )}
    </div>
  );
}
```

### 3. Initialize Auth on App Start

```typescript
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';

function App() {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialize, initialized]);

  return <YourApp />;
}
```

## Routes

### Public Routes
- `/login` - Login page
- `/signup` - Registration page

### Protected Routes
All other routes require authentication:
- `/` - Home dashboard
- `/room/*` - Room navigation
- `/utilities` - Utilities page
- `/overtimes` - Overtime tracking
- `/components` - Components page

### Admin-Only Routes
- `/admin/users` - User management (requires Admin role)

## Setup for New Users

### 1. User Registration
1. Navigate to `/signup`
2. Enter email, password, and full name
3. Check email for verification (if enabled in Supabase)

### 2. Role Assignment (Admin Required)
1. Admin logs in and navigates to `/admin/users`
2. Find the new user in the list
3. Click "Assign Role"
4. Select the appropriate role
5. User will have access based on assigned role

### 3. First Admin Setup
To create the first admin user:

```sql
-- Run this SQL in Supabase SQL Editor
-- Replace 'user-email@example.com' with the actual user's email

INSERT INTO user_roles (user_id, role_id)
SELECT
    u.id,
    r.id
FROM auth.users u
CROSS JOIN roles r
WHERE u.email = 'user-email@example.com'
  AND r.name = 'Admin';
```

## Security Considerations

### Row Level Security (RLS)
All tables have RLS enabled with appropriate policies:

- **roles**: Everyone can read, only admins can modify
- **user_roles**: Users can read their own roles, only admins can assign/remove roles

### Password Requirements
- Minimum 6 characters
- Enforced by Supabase Auth

### Email Verification
Configure email verification in Supabase dashboard:
- Settings → Authentication → Email Auth
- Enable "Confirm email"

### Session Management
- Sessions are managed by Supabase Auth
- Automatic token refresh
- Secure HTTP-only cookies

## Troubleshooting

### "Access Denied" on Protected Routes
- Ensure user is logged in
- Check user has required role
- Verify roles are properly assigned in database

### Roles Not Showing Up
- Check `user_roles` table for user assignments
- Ensure `get_user_roles` function is working
- Try signing out and back in to refresh session

### Admin Panel Not Working
- Verify admin policies in Supabase
- Check that auth service role key has admin permissions
- Ensure user has Admin role assigned

## Future Enhancements

Potential improvements:
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Role hierarchy (e.g., Admin inherits all other roles)
- [ ] Custom permissions beyond roles
- [ ] Activity logging/audit trail
- [ ] Session timeout configuration
- [ ] OAuth providers (Google, Microsoft, etc.)
