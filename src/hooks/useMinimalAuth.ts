// src/hooks/useMinimalAuth.ts
import { useAuthStore } from '../store/authStore';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useUnmountAwareSubscription } from '../utils/subscriptionRegistry';

// Admin roles as per RLS policy
const ADMIN_ROLES = new Set(['chief', 'coordinator', 'Manager']);

export const useMinimalAuth = () => {
  const { 
    user: storeUser, 
    isLoading: storeLoading, 
    error: storeError,
    role: storeRole,
    isAdmin: storeIsAdmin
  } = useAuthStore();
  
  const [localUser, setLocalUser] = useState(storeUser);
  const [localLoading, setLocalLoading] = useState(storeLoading);
  const [localRole, setLocalRole] = useState(storeRole);
  const [localIsAdmin, setLocalIsAdmin] = useState(storeIsAdmin);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // Enhanced session check with role fetching
  const checkSession = useCallback(async () => {
    if (!storeUser && !storeLoading && !sessionChecked) {
      setLocalLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          // Fetch user profile to get role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', data.session.user.id)
            .single();

          const userWithRole = {
            ...data.session.user,
            role: profile?.role || 'visitor'
          };

          const isAdmin = ADMIN_ROLES.has(userWithRole.role);
          
          setLocalUser(userWithRole);
          setLocalRole(userWithRole.role);
          setLocalIsAdmin(isAdmin);
          
          // Cache admin status
          localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
        } else {
          setLocalUser(null);
          setLocalRole('visitor');
          setLocalIsAdmin(false);
          localStorage.removeItem('isAdmin');
        }
      } catch (error) {
        console.error('Error checking session in useMinimalAuth:', error);
        setLocalUser(null);
        setLocalRole('visitor');
        setLocalIsAdmin(false);
        localStorage.removeItem('isAdmin');
      } finally {
        setLocalLoading(false);
        setSessionChecked(true);
      }
    } else {
      setLocalUser(storeUser);
      setLocalLoading(storeLoading);
      setLocalRole(storeRole);
      setLocalIsAdmin(storeIsAdmin);
    }
  }, [storeUser, storeLoading, sessionChecked, storeRole, storeIsAdmin]);
  
  // Effect to update local state when store state changes
  useEffect(() => {
    setLocalUser(storeUser);
    setLocalLoading(storeLoading);
    setLocalRole(storeRole);
    setLocalIsAdmin(storeIsAdmin);
  }, [storeUser, storeLoading, storeRole, storeIsAdmin]);
  
  // Initial session check
  useEffect(() => {
    checkSession();
  }, [checkSession]);
  
  // Enhanced auth state subscription with role handling
  useUnmountAwareSubscription(() => {
    const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        try {
          // Fetch user profile to get role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();

          const userWithRole = {
            ...session.user,
            role: profile?.role || 'visitor'
          };

          const isAdmin = ADMIN_ROLES.has(userWithRole.role);
          
          setLocalUser(userWithRole);
          setLocalRole(userWithRole.role);
          setLocalIsAdmin(isAdmin);
          localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
        } catch (error) {
          console.error('Error fetching profile:', error);
          setLocalUser(session.user);
          setLocalRole('visitor');
          setLocalIsAdmin(false);
          localStorage.setItem('isAdmin', 'false');
        }
        setLocalLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setLocalUser(null);
        setLocalRole('visitor');
        setLocalIsAdmin(false);
        setLocalLoading(false);
        localStorage.removeItem('isAdmin');
      } else if (event === 'USER_UPDATED' && session?.user) {
        // Handle profile updates
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const userWithRole = {
          ...session.user,
          role: profile?.role || 'visitor'
        };

        const isAdmin = ADMIN_ROLES.has(userWithRole.role);
        
        setLocalUser(userWithRole);
        setLocalRole(userWithRole.role);
        setLocalIsAdmin(isAdmin);
        localStorage.setItem('isAdmin', isAdmin ? 'true' : 'false');
      }
    });
    
    return () => data.subscription.unsubscribe();
  });
  
  return {
    user: localUser,
    isLoading: localLoading,
    error: storeError,
    role: localRole,
    isAdmin: localIsAdmin,
    getDashboardRoute: useAuthStore.getState().getDashboardRoute,
    redirectToDashboard: useAuthStore.getState().redirectToDashboard
  };
};