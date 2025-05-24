import { useAuth } from './AuthProvider';
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from './LoadingScreen';
import { supabase } from '../lib/supabase';

// Public Pages
import Home from '../pages/Home';
import Auth from '../pages/Auth';
import About from '../pages/About';
import Blog from '../pages/Blog';
import FAQ from '../pages/FAQ';
import Contact from '../pages/Contact';
import PrivacyPolicy from '../pages/PrivacyPolicy';
import Terms from '../pages/Terms';
import VendorTerms from '../pages/VendorTerms';
import PublicProducts from '../pages/PublicProducts';
import GroupBuyList from '../pages/GroupBuyList';
import LeaderBoard from '../pages/LeaderBoard';
import VendorShops from '../pages/VendorShops';
import VendorSignup from '../pages/VendorSignup';

// Role-Based Dashboards
import CustomerDashboard from '../pages/dashboards/CustomerDashboard';
import VendorDashboard from '../pages/dashboards/VendorDashboard';
import ManagerDashboard from '../pages/dashboards/ManagerDashboard';
import CoordinatorDashboard from '../pages/dashboards/CoordinatorDashboard';
import ChiefDashboard from '../pages/dashboards/ChiefDashboard';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, status } = useAuthStore();
  const location = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check for existing session on initial load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Session exists, let AuthProvider handle the user state
          setIsCheckingSession(false);
        } else {
          setIsCheckingSession(false);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setIsCheckingSession(false);
      }
    };

    checkSession();
  }, []);

  if (isLoading || isCheckingSession) {
    return <LoadingScreen />;
  }

  if (status === 'unauthenticated' || !user) {
    // Redirect to login but preserve the intended destination
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have the right role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AuthAwareRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, status } = useAuthStore();
  const location = useLocation();

  if (status === 'authenticated' || user) {
    // If logged in, redirect to appropriate dashboard based on role
    const redirectPath = getDashboardPath(user?.role);
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

const getDashboardPath = (role?: string): string => {
  switch (role) {
    case 'customer': return '/customer';
    case 'vendor': return '/vendor';
    case 'manager': return '/manager';
    case 'coordinator': return '/coordinator';
    case 'chief': return '/chief';
    default: return '/';
  }
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route 
        path="/auth" 
        element={
          <AuthAwareRoute>
            <Auth />
          </AuthAwareRoute>
        } 
      />
      <Route path="/about" element={<About />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/vendor-terms" element={<VendorTerms />} />
      <Route path="/auth/vendor" element={<VendorSignup />} />
      <Route path="/products" element={<PublicProducts />} />
      <Route path="/group-buys" element={<GroupBuyList />} />
      <Route path="/leaderboard" element={<LeaderBoard />} />
      <Route path="/vendors" element={<VendorShops />} />

      {/* Protected Dashboards */}
      <Route
        path="/customer/*"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/*"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/manager/*"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/coordinator/*"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/chief/*"
        element={
          <ProtectedRoute allowedRoles={['chief']}>
            <ChiefDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};