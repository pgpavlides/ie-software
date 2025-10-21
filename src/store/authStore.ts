import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import supabase from '../lib/supabase';

interface UserRole {
  role_name: string;
}

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
  isAdmin: () => boolean;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  roles: [],
  loading: true,
  initialized: false,

  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        set({ user: session.user, session });
        await get().fetchUserRoles();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          set({ user: session.user, session });
          await get().fetchUserRoles();
        } else {
          set({ user: null, session: null, roles: [] });
        }
      });

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

  isAdmin: () => {
    return get().hasRole('Admin');
  },
}));
