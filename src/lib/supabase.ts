import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Enhanced client configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
    storage: {
      getItem: (key) => {
        // Handle potential localStorage access errors
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
    storageKey: 'sb-' + supabaseUrl + '.auth.token', // Unique key per project
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      'X-Client-Info': 'foodrient-web',
      'Content-Type': 'application/json'
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

// Session restoration helper
export const restoreSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Session restoration failed:', error);
    return null;
  }
};

// Create a function to ensure a user profile exists
const ensureUserProfile = async (userId: string): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      console.log('Creating profile for user:', userId);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          role: 'visitor'
        });
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
    }
  } catch (error) {
    console.error('Error ensuring user profile:', error);
  }
};

// Function to check if the current user has admin privileges
export const isAdminUser = async (): Promise<boolean> => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) return false;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error getting profile:', profileError);
      return false;
    }
    
    return profile?.role === 'chief' || profile?.role === 'coordinator';
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Function to get the current user's role
export const getUserRole = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError?.code === 'PGRST116') {
      await ensureUserProfile(user.id);
      return 'visitor';
    }
    
    return profile?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Enhanced auth state clearing
export const clearAuthState = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    // Only remove Supabase-related items
    localStorage.removeItem('sb-' + supabaseUrl + '.auth.token');
    sessionStorage.removeItem('sb-' + supabaseUrl + '.auth.token');
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};

// New: Session validation helper here
export const validateCurrentSession = async (): Promise<boolean> => {
  const session = await restoreSession();
  return !!session && new Date(session.expires_at * 1000) > new Date();
};