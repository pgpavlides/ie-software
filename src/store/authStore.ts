import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

interface UserRole {
  role_name: string;
}

// All available roles in the system
export type RoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Boss'
  | 'Efficiency Coordinator'
  | 'Head of Software'
  | 'Software'
  | 'Head of Accounting'
  | 'Accounting'
  | 'Head of Marketing'
  | 'Marketing'
  | 'Head Artist'
  | 'Artist'
  | 'Head Designer'
  | 'Designer'
  | 'Head Architect'
  | 'Architect'
  | 'Head of Construction'
  | 'Construction'
  | 'CNC'
  | 'Head of Electronics'
  | 'Electronics'
  | '3D and RND Production'
  | 'Head Project Manager'
  | 'Project Manager'
  | 'Floor Manager'
  | 'Delivery'
  | 'Head of Sales'
  | 'Sales';

// Roles that have administrative privileges
export const ADMIN_ROLES: RoleName[] = ['Super Admin', 'Admin'];

// Roles that have management privileges (can view everything)
export const MANAGEMENT_ROLES: RoleName[] = ['Super Admin', 'Admin', 'Boss', 'Efficiency Coordinator'];

// All head/lead roles
export const HEAD_ROLES: RoleName[] = [
  'Head of Software',
  'Head of Accounting',
  'Head of Marketing',
  'Head Artist',
  'Head Designer',
  'Head Architect',
  'Head of Construction',
  'Head of Electronics',
  'Head Project Manager',
  'Head of Sales',
];

interface AuthState {
  user: User | null;
  session: Session | null;
  roles: string[];
  loading: boolean;
  initialized: boolean;

  // Actions
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  fetchUserRoles: () => Promise<void>;
  hasRole: (roleName: string) => boolean;
  hasAnyRole: (roleNames: string[]) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isManagement: () => boolean;
  isDepartmentHead: () => boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => {
  let authListenerUnsubscribe: (() => void) | null = null;
  
  return {
    user: null,
    session: null,
    roles: [],
    loading: true,
    initialized: false,

    initialize: async () => {
      // Prevent multiple initializations
      if (get().initialized || authListenerUnsubscribe) {
        return;
      }

      try {
        set({ loading: true });
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          set({ user: session.user, session });
          await get().fetchUserRoles();
        }

        // Listen for auth changes (only once)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
          console.log('Auth state change:', event);
          
          // CRITICAL: Do not trigger state changes for tab switching events
          // Only respond to actual logout events  
          if (event === 'SIGNED_OUT') {
            set({ user: null, session: null, roles: [] });
          }
          // Ignore all other events (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED)
          // These events fire when tabs become visible and cause unnecessary remounts
        });

        authListenerUnsubscribe = () => subscription?.unsubscribe();
        set({ loading: false, initialized: true });
      } catch (error) {
        console.error('Error initializing auth:', error);
        set({ loading: false, initialized: true });
      }
    },

  signIn: async (email: string, password: string) => {
    set({ loading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      if (data.user) {
        set({ user: data.user, session: data.session });
        await get().fetchUserRoles();
      }

      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ loading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            display_name: fullName, // Store in both fields for consistency
          },
        },
      });

      if (error) {
        set({ loading: false });
        return { error };
      }

      set({ loading: false });
      return { error: null };
    } catch (error) {
      set({ loading: false });
      return { error };
    }
  },

  signOut: async () => {
    set({ loading: true });
    try {
      await supabase.auth.signOut();
      set({ user: null, session: null, roles: [], loading: false });
    } catch (error) {
      console.error('Error signing out:', error);
      set({ loading: false });
    }
  },

  fetchUserRoles: async () => {
    const { user } = get();
    if (!user) {
      set({ roles: [] });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_user_roles', {
        user_id: user.id,
      });

      if (error) {
        console.error('Error fetching user roles:', error);
        set({ roles: [] });
        return;
      }

      const roles = data?.map((r: UserRole) => r.role_name) || [];
      set({ roles });
    } catch (error) {
      console.error('Error fetching user roles:', error);
      set({ roles: [] });
    }
  },

    hasRole: (roleName: string) => {
      const { roles } = get();
      return roles.includes(roleName);
    },

    hasAnyRole: (roleNames: string[]) => {
      const { roles } = get();
      return roleNames.some(roleName => roles.includes(roleName));
    },

    isAdmin: () => {
      return get().hasAnyRole(['Super Admin', 'Admin']);
    },

    isSuperAdmin: () => {
      return get().hasRole('Super Admin');
    },

    isManagement: () => {
      return get().hasAnyRole(['Super Admin', 'Admin', 'Boss', 'Efficiency Coordinator']);
    },

    isDepartmentHead: () => {
      const { roles } = get();
      return roles.some(role =>
        role.startsWith('Head of') || role.startsWith('Head ')
      );
    },
  };
});
