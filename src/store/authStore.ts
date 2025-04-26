import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { sendEmail } from '../lib/email';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getDashboardRoute: () => string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;

      // Verify profile exists
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError && !profileError.message.includes('not found')) {
        throw profileError;
      }

      // If profile doesn't exist, refresh session to trigger creation
      if (!profile) {
        await supabase.auth.refreshSession();
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email: string, password: string, role: string = 'customer') => {
    try {
      set({ isLoading: true, error: null });
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        }
      });
      
      if (error) throw error;

      if (data?.user) {
        await sendEmail({
          recipient: { email },
          template_type: 'welcome',
          data: {
            user_id: data.user.id,
          },
        });
      }
    } catch (error: any) {
      set({ error: error.message });
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
      set({ user: null });
    } catch (error: any) {
      set({ error: error.message });
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
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updatePassword: async (password: string) => {
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  getDashboardRoute: () => {
    const { user } = get();
    if (!user) return '/auth';

    switch (user.role) {
      case 'customer':
        return '/customer/dashboard';
      case 'vendor':
        return '/vendor/dashboard';
      case 'manager':
        return '/manager/dashboard';
      case 'coordinator':
        return '/coordinator/dashboard';
      case 'chief':
        return '/chief/dashboard';
      default:
        return '/';
    }
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  useAuthStore.setState({ 
    user: session?.user || null,
    isLoading: false
  });

  if (event === 'SIGNED_IN' && session?.user) {
    // Fetch user profile and role
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          useAuthStore.setState({
            user: {
              ...session.user,
              role: data.role
            }
          });
        }
      });
  }
});