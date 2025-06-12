import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Admin roles as per RLS policy - now using lowercase to match database enum
const ADMIN_ROLES = new Set(['chief', 'coordinator', 'manager']);

// Enhanced client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    storage: {
      getItem: (key) => {
        try {
          return localStorage.getItem(key);
        } catch (e) {
          console.warn('LocalStorage access denied', e);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          localStorage.setItem(key, value);
        } catch (e) {
          console.warn('LocalStorage write failed', e);
        }
      },
      removeItem: (key) => {
        try {
          localStorage.removeItem(key);
        } catch (e) {
          console.warn('LocalStorage removal failed', e);
        }
      }
    },
    storageKey: 'sb-' + supabaseUrl + '.auth.token',
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      'X-Client-Info': 'foodrient-web',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
  },
  db: {
    schema: 'public'
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

/**
 * Safely gets or creates a user profile with retry logic
 * @param userId The user's ID from auth
 * @returns Promise with profile data including role and email
 */
export const getOrCreateUserProfile = async (userId: string): Promise<{ role: string; email?: string }> => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      // First try to get the profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role, email')
        .eq('id', userId)
        .single();

      // If profile doesn't exist, create a default one
      if (error?.code === 'PGRST116') {
        const { data: { user } } = await supabase.auth.getUser();
        const email = user?.email || undefined;

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            role: 'visitor',
            email: email
          });

        if (createError) throw createError;
        
        return { role: 'visitor', email };
      }

      if (error) throw error;
      return profile || { role: 'visitor' };
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        console.error('Failed to get/create profile after retries:', error);
        return { role: 'visitor' };
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * retries));
    }
  }
  return { role: 'visitor' };
};

/**
 * Gets user role with fallback to visitor
 * @param userId Optional user ID (defaults to current user)
 * @returns Promise with user role string
 */
export const getUserRole = async (userId?: string): Promise<string> => {
  try {
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 'visitor';
      userId = user.id;
    }

    const profile = await getOrCreateUserProfile(userId);
    return profile?.role?.toLowerCase() || 'visitor'; // Ensure lowercase for consistency
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'visitor';
  }
};

/**
 * Checks if user has admin role
 * @param userId Optional user ID (defaults to current user)
 * @returns Promise with boolean indicating admin status
 */
export const isAdminUser = async (userId?: string): Promise<boolean> => {
  try {
    const role = await getUserRole(userId);
    return ADMIN_ROLES.has(role.toLowerCase()); // Case-insensitive check
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

/**
 * Restores session with validation
 * @returns Promise with session data or null
 */
export const restoreSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    // Ensure user has a profile
    await getOrCreateUserProfile(session.user.id);
    return session;
  } catch (error) {
    console.error('Session restoration failed:', error);
    return null;
  }
};

/**
 * Validates current session is active and user has profile
 * @returns Promise with boolean validation result
 */
export const validateCurrentSession = async (): Promise<boolean> => {
  try {
    const session = await restoreSession();
    if (!session) return false;
    
    const isExpired = new Date(session.expires_at * 1000) < new Date();
    if (isExpired) return false;
    
    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

/**
 * Clears all auth state including local storage
 */
export const clearAuthState = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem('sb-' + supabaseUrl + '.auth.token');
    localStorage.removeItem('isAdmin');
    sessionStorage.removeItem('sb-' + supabaseUrl + '.auth.token');
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

/**
 * Resends verification email
 * @param email Email address to verify
 * @returns Promise with success status
 */
export const resendVerificationEmail = async (email: string): Promise<{ success: boolean; error?: any }> => {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error resending verification email:', error);
    return { success: false, error };
  }
};

/**
 * Role-protected function wrapper
 * @param callback Function to execute if role check passes
 * @param requiredRole Optional required role
 * @returns Promise with callback result or null
 */
export const withRoleCheck = async <T>(
  callback: () => Promise<T>, 
  requiredRole?: string
): Promise<T | null> => {
  try {
    const role = await getUserRole();
    
    if (requiredRole && role.toLowerCase() !== requiredRole.toLowerCase()) {
      console.warn(`Access denied. Required role: ${requiredRole}, Current role: ${role}`);
      return null;
    }
    
    return await callback();
  } catch (error) {
    console.error('Role check failed:', error);
    return null;
  }
};

/**
 * Safe profile fetcher for client-side joins
 * @param userId User ID to fetch profile for
 * @returns Promise with profile data or null
 */
export const safeGetProfile = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
};