import { supabase } from '../lib/supabase';

// Helper function to handle authentication errors
export const handleAuthError = (error: any = {}): string => {
  if (!error || !error.message) return 'An unexpected error occurred. Please try again.';

  // Common auth error messages
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'Email not confirmed':
      return 'Please verify your email address before signing in.';
    case 'User not found':
      return 'Account not found. Please check your email or sign up.';
    case 'Email already registered':
      return 'This email is already registered. Please sign in or use a different email.';
    case 'Password should be at least 6 characters':
      return 'Password must be at least 6 characters long.';
    case 'Rate limit exceeded':
      return 'Too many attempts. Please try again later.';
    case 'Login request timed out. Please try again.':
      return 'Login request timed out. Please try again.';
    case 'Failed to fetch':
      return 'Network error. Please check your internet connection and try again.';
    case 'NetworkError when attempting to fetch resource':
      return 'Network error. Please check your internet connection and try again.';
    case 'No internet connection. Please check your network and try again.':
      return 'No internet connection. Please check your network and try again.';
    case 'The request is taking longer than expected. Please check your connection and try again.':
      return 'The server is taking longer than expected to respond. Please try again later.';
    case 'AbortError':
      return 'The request was aborted due to a timeout. Please try again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

// Function to check if user has specific role
const hasRole = async (requiredRoles: string[]): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    return profile && requiredRoles.includes(profile.role);
  } catch (error) {
    console.error('Error checking user role:', error);
    return false;
  }
};