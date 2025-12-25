import { create } from 'zustand';
import supabase from '../lib/supabase';
import { useAuthStore } from './authStore';

interface Role {
  id: string;
  name: string;
  description: string;
  permission_level: number;
  is_head_role: boolean;
  color: string;
  department_id: string | null;
  department_name: string | null;
}

interface ViewAsState {
  // The role being viewed as (null means viewing as self)
  viewAsRole: Role | null;
  // All available roles for the dropdown
  availableRoles: Role[];
  // Loading state
  loading: boolean;
  // Initialization state
  initialized: boolean;

  // Actions
  setViewAsRole: (role: Role | null) => void;
  clearViewAs: () => void;
  fetchRoles: () => Promise<void>;
  initialize: () => Promise<void>;

  // Computed-like getters (as functions since Zustand doesn't have computed)
  isViewingAs: () => boolean;
  canUseViewAs: () => boolean;
  getEffectiveRoles: () => string[];
  hasEffectiveRole: (roleName: string) => boolean;
}

export const useViewAsStore = create<ViewAsState>((set, get) => ({
  viewAsRole: null,
  availableRoles: [],
  loading: false,
  initialized: false,

  setViewAsRole: (role) => {
    if (!get().canUseViewAs()) return;
    set({ viewAsRole: role });
  },

  clearViewAs: () => {
    set({ viewAsRole: null });
  },

  fetchRoles: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from('roles')
        .select(`
          id,
          name,
          description,
          permission_level,
          is_head_role,
          color,
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

      set({ availableRoles: formattedRoles });
    } catch (error) {
      console.error('Error fetching roles:', error);
    } finally {
      set({ loading: false });
    }
  },

  initialize: async () => {
    if (get().initialized) return;

    // Only fetch roles if user is Super Admin
    if (get().canUseViewAs()) {
      await get().fetchRoles();
    }
    set({ initialized: true });
  },

  // Computed-like functions
  isViewingAs: () => get().viewAsRole !== null,

  canUseViewAs: () => {
    const authStore = useAuthStore.getState();
    return authStore.hasRole('Super Admin');
  },

  getEffectiveRoles: () => {
    const { viewAsRole } = get();
    const authStore = useAuthStore.getState();

    // If viewing as a specific role, return only that role
    if (viewAsRole) {
      return [viewAsRole.name];
    }
    // Otherwise return actual user roles
    return authStore.roles;
  },

  hasEffectiveRole: (roleName: string) => {
    return get().getEffectiveRoles().includes(roleName);
  },
}));
