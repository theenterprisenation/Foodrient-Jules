import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client-side Supabase instance with anon key (for regular users)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Ensure session persistence is enabled
    autoRefreshToken: true, // Enable automatic token refresh
    detectSessionInUrl: false, // Disable session detection in URL to prevent conflicts
    flowType: 'implicit', // Use implicit flow instead of PKCE for better compatibility
    storage: localStorage, // Explicitly set storage to localStorage
    storageKey: 'supabase.auth.token', // Set a specific storage key
    debug: import.meta.env.DEV // Only enable debug in development
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

// Create a function to ensure a user profile exists
export const ensureUserProfile = async (userId: string): Promise<void> => {
  try {
    // Check if profile exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
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
    
    if (error) {
      console.error('Error getting user:', error);
      return false;
    }
    
    if (!user) return false;
    
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
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    
    if (!user) return null;
    
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Error getting profile:', profileError);
      
      // If profile doesn't exist, create one
      if (profileError.code === 'PGRST116') {
        await ensureUserProfile(user.id);
        return 'visitor'; // Default role
      }
      
      return null;
    }
    
    return profile?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Helper function to clear auth state
export const clearAuthState = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    localStorage.clear(); // Clear all localStorage data
    window.location.reload(); // Reload the page to reset the application state
  } catch (error) {
    console.error('Error clearing auth state:', error);
  }
};