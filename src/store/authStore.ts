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

      // Check network connectivity first
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Use the robust sign in function with retry mechanism
      const { error } = await robustSignIn(email, password);

      if (error) {
        throw error;
      }

      // We'll fetch the profile in the onAuthStateChange handler
      // to avoid potential fetch errors here
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

      // Check network connectivity first
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.');
      }

      // Use the robust sign up function with retry mechanism
      const { data, error } = await robustSignUp(email, password, role);

      if (error) {
        throw error;
      }

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
      const { error } = await supabase.auth.updateUser({
        password,
      });
      
      if (error) throw error;
    } catch (error: any) {
      set({ error: handleAuthError(error) });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  redirectToDashboard: () => {
    const { user } = get();
    if (!user) return;
    
    const route = get().getDashboardRoute();
    navigate(route);
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
const handleAuthStateChange = async (event: string, session: any) => {
  try {
    if (event === 'SIGNED_OUT' || !session) {
      useAuthStore.setState({ 
        user: null,
        isLoading: false
      });
      return;
    }
    
    if (event === 'SIGNED_IN' && session?.user) {
      // Set loading state while we fetch the profile
      useAuthStore.setState({ isLoading: true, error: null });
      
      try {
        // Fetch user profile with retry mechanism
        const maxRetries = 3;
        let retryCount = 0;
        let profile = null;
        let profileError = null;
        
        while (retryCount < maxRetries && !profile && session?.user?.id) {
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
            
            profileError = error;
            retryCount++;
            
            if (retryCount < maxRetries) {
              // Exponential backoff
              const delay = Math.pow(2, retryCount) * 500;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (err) {
            profileError = err;
            retryCount++;
            
            if (retryCount < maxRetries) {
              const delay = Math.pow(2, retryCount) * 500;
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        }
        
        // If we still don't have a profile after retries, create one
        if (!profile && session?.user?.id) {
          await supabase.from('profiles').insert({ id: session.user.id, role: 'visitor' });
          profile = { role: 'visitor' };
        }
        
        if (!profile && profileError) {
          console.error('Error fetching profile after retries:', profileError);
          // If we can't fetch the profile, we'll still set the user with basic info
          useAuthStore.setState({
            user: {
              ...session.user,
              role: 'visitor' // Default role
            },
            isLoading: false
          });
          return;
        }
        
        // Set user with profile data
        useAuthStore.setState({
          user: {
            ...session.user,
            role: profile?.role || 'visitor'
          },
          isLoading: false
        });
        
        // Only redirect to dashboard if this is a SIGNED_IN event (not a SESSION_REFRESHED event)
        // and we're on the auth page to prevent infinite redirects
        if (event === 'SIGNED_IN' && window.location.pathname === '/auth') {
          const { redirectToDashboard } = useAuthStore.getState();
          redirectToDashboard();
        }
      } catch (error) {
        console.error('Error in auth state change handler:', error);
        useAuthStore.setState({ 
          user: session?.user || null,
          isLoading: false,
          error: 'Failed to load user profile'
        });
      }
    }
  } catch (error) {
    console.error('Unexpected error in auth state change:', error);
    useAuthStore.setState({ 
      isLoading: false,
      error: 'An unexpected authentication error occurred'
    });
  }
};

// Set up the auth state change listener
const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
