// src/store/authStore.ts
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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  getDashboardRoute: () => string;
  redirectToDashboard: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

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
      set({ user: null });
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
    const { user } = get();
    if (!user) return '/auth';

    switch (user.role) {
      case 'customer': return '/customer/dashboard';
      case 'vendor': return '/vendor/dashboard';
      case 'manager': return '/manager/dashboard';
      case 'coordinator': return '/coordinator/dashboard';
      case 'chief': return '/chief/dashboard';
      default: return '/';
    }
  },

  redirectToDashboard: () => {
    const { user } = get();
    if (!user) return;
    navigate(get().getDashboardRoute());
  },
}));

// Auth state listener
const handleAuthStateChange = async (event: string, session: any) => {
  try {
    if (event === 'SIGNED_OUT' || !session) {
      useAuthStore.setState({ user: null, isLoading: false });
      return;
    }

    if (event === 'SIGNED_IN' && session?.user) {
      useAuthStore.setState({ isLoading: true, error: null });

      try {
        // Profile fetch with retry logic
        let profile = null;
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries && !profile && session?.user?.id) {
          try {
            const { data, error } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (!error) {
              profile = data;
              break;
            }

            retries++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 500));
          } catch (err) {
            retries++;
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 500));
          }
        }

        // Create profile if missing
        if (!profile && session?.user?.id) {
          await supabase.from('profiles').insert({ id: session.user.id, role: 'visitor' });
          profile = { role: 'visitor' };
        }

        useAuthStore.setState({
          user: { ...session.user, role: profile?.role || 'visitor' },
          isLoading: false
        });

        // Only redirect to dashboard if this is a SIGNED_IN event (not a SESSION_REFRESHED event)
        if (event === 'SIGNED_IN' && window.location.pathname === '/auth') {
          setTimeout(() => {
            useAuthStore.getState().redirectToDashboard();
          }, 100); // Small debounce to avoid race conditions
        }

      } catch (error) {
        console.error('Profile load error:', error);
        useAuthStore.setState({ 
          user: { ...session.user, role: 'visitor' },
          isLoading: false,
          error: 'Failed to load profile'
        });
      }
    }
  } catch (error) {
    console.error('Auth state error:', error);
    useAuthStore.setState({ isLoading: false, error: 'Authentication error' });
  }
};

// Initialize listener
supabase.auth.onAuthStateChange(handleAuthStateChange);