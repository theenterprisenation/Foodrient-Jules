import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from './LoadingScreen';

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
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    // Redirect to login but preserve the intended destination
    return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // User is logged in but doesn't have the right role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/auth" element={<Auth />} />
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

      {/* Customer Dashboard */}
      <Route
        path="/customer/*"
        element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Vendor Dashboard */}
      <Route
        path="/vendor/*"
        element={
          <ProtectedRoute allowedRoles={['vendor']}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Manager Dashboard */}
      <Route
        path="/manager/*"
        element={
          <ProtectedRoute allowedRoles={['manager']}>
            <ManagerDashboard />
          </ProtectedRoute>
        }
      />

      {/* Coordinator Dashboard */}
      <Route
        path="/coordinator/*"
        element={
          <ProtectedRoute allowedRoles={['coordinator']}>
            <CoordinatorDashboard />
          </ProtectedRoute>
        }
      />

      {/* Chief Dashboard */}
      <Route
        path="/chief/*"
        element={
          <ProtectedRoute allowedRoles={['chief']}>
            <ChiefDashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};