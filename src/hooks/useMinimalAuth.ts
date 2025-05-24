// src/hooks/useMinimalAuth.ts
import { useAuthStore } from '../store/authStore';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUnmountAwareSubscription } from '../utils/subscriptionRegistry';

export const useMinimalAuth = () => {
  const { user: storeUser, isLoading: storeLoading, error: storeError } = useAuthStore();
  const [localUser, setLocalUser] = useState(storeUser);
  const [localLoading, setLocalLoading] = useState(storeLoading);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // Define checkSession as a memoized callback to avoid recreating it on each render
  const checkSession = useCallback(async () => {
    if (!storeUser && !storeLoading && !sessionChecked) {
      setLocalLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          setLocalUser(data.session.user);
        } else {
          setLocalUser(null);
        }
      } catch (error) {
        console.error('Error checking session in useMinimalAuth:', error);
        setLocalUser(null);
      } finally {
        setLocalLoading(false);
        setSessionChecked(true);
      }
    } else {
      setLocalUser(storeUser);
      setLocalLoading(storeLoading);
    }
  }, [storeUser, storeLoading, sessionChecked]);
  
  // Effect to update local state when store state changes
  useEffect(() => {
    setLocalUser(storeUser);
    setLocalLoading(storeLoading);
  }, [storeUser, storeLoading]);
  
  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  // Set up auth state subscription using our custom hook
  useUnmountAwareSubscription(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setLocalUser(session.user);
        setLocalLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setLocalUser(null);
        setLocalLoading(false);
      }
    });
    
    return () => data.subscription.unsubscribe();
  });
  
  return {
    user: localUser,
    isLoading: localLoading,
    error: storeError,
    getDashboardRoute: useAuthStore.getState().getDashboardRoute,
    redirectToDashboard: useAuthStore.getState().redirectToDashboard
  };
};