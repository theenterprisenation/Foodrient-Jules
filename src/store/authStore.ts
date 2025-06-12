import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';
import { navigate } from '../utils/navigation';
import { handleAuthError } from '../utils/auth-helpers';
import { robustSignIn, robustSignUp } from '../lib/authService';
import { NetworkMonitor } from '../utils/networkMonitor';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  role: string;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getDashboardRoute: () => string;
  redirectToDashboard: () => void;
  checkSession: () => Promise<void>;
}

// Admin roles as per RLS policy - now all lowercase to match database enum
const ADMIN_ROLES = new Set(['chief', 'coordinator', 'manager']);

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,
  role: 'visitor',
  isAdmin: false,

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { error } = await robustSignIn(email, password);
      if (error) throw error;

    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string, role: string = 'customer') => {
    try {
      set({ isLoading: true, error: null });

      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      const { data, error } = await robustSignUp(email, password, role);
      if (error) throw error;

      if (data?.user) {
        await sendEmail({
          recipient: { email },
          template_type: 'welcome',
          data: { user_id: data.user.id },
        });
      }
    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ 
        user: null,
        role: 'visitor',
        isAdmin: false 
      });
      localStorage.removeItem('isAdmin');
    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePassword: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  getDashboardRoute: () => {
    const { role } = get();
    if (!role) return '/auth';

    switch (role.toLowerCase()) {
      case 'customer': return '/customer/dashboard';
      case 'vendor': return '/vendor/dashboard';
      case 'manager': return '/manager/dashboard';
      case 'coordinator': return '/coordinator/dashboard';
      case 'chief': return '/chief/dashboard';
      default: return '/';
    }
  },

  redirectToDashboard: () => {
    const { role } = get();
    if (!role) return;
    navigate(get().getDashboardRoute());
  },

  checkSession: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        set({ 
          user: null,
          role: 'visitor',
          isAdmin: false,
          isLoading: false 
        });
        return;
      }

      // Direct Supabase query to get or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      let userRole = 'visitor';
      let isAdmin = false;

      if (profileError || !profile) {
        // Create new profile if doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: session.user.id,
            role: 'visitor',
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (!createError && newProfile) {
          userRole = newProfile.role?.toLowerCase() || 'visitor';
        }
      } else {
        userRole = profile.role?.toLowerCase() || 'visitor';
      }

      isAdmin = ADMIN_ROLES.has(userRole);

      set({
        user: { ...session.user, role: userRole },
        role: userRole,
        isAdmin,
        isLoading: false
      });

      // Cache admin status
      localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');

    } catch (error) {
      console.error('Session check error:', error);
      set({ 
        user: null,
        role: 'visitor',
        isAdmin: false,
        isLoading: false,
        error: 'Failed to check session'
      });
    }
  }
}));

// Enhanced auth state listener
const handleAuthStateChange = async (event: string, session: any) => {
  try {
    if (event === 'SIGNED_OUT' || !session) {
      useAuthStore.setState({ 
        user: null, 
        role: 'visitor',
        isAdmin: false,
        isLoading: false 
      });
      localStorage.removeItem('isAdmin');
      return;
    }

    if (session?.user) {
      useAuthStore.setState({ isLoading: true, error: null });

      try {
        // Direct Supabase query to get or create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        let userRole = 'visitor';
        let isAdmin = false;

        if (profileError || !profile) {
          // Create new profile if doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              role: 'visitor',
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!createError && newProfile) {
            userRole = newProfile.role?.toLowerCase() || 'visitor';
          }
        } else {
          userRole = profile.role?.toLowerCase() || 'visitor';
        }

        isAdmin = ADMIN_ROLES.has(userRole);

        useAuthStore.setState({
          user: { ...session.user, role: userRole },
          role: userRole,
          isAdmin,
          isLoading: false
        });

        localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');

        // Redirect only for SIGNED_IN event
        if (event === 'SIGNED_IN' && window.location.pathname === '/auth') {
          setTimeout(() => {
            useAuthStore.getState().redirectToDashboard();
          }, 100);
        }

      } catch (error) {
        console.error('Profile load error:', error);
        useAuthStore.setState({ 
          user: { ...session.user, role: 'visitor' },
          role: 'visitor',
          isAdmin: false,
          isLoading: false,
          error: 'Failed to load profile'
        });
      }
    }
  } catch (error) {
    console.error('Auth state error:', error);
    useAuthStore.setState({ 
      isLoading: false, 
      error: 'Authentication error',
      role: 'visitor',
      isAdmin: false
    });
  }
};

// Initialize listener
supabase.auth.onAuthStateChange(handleAuthStateChange);

// Initial session check
useAuthStore.getState().checkSession();