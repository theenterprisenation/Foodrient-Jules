import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ErrorBoundary } from 'react-error-boundary';
import { useMinimalAuth } from '../../hooks/useMinimalAuth';
import { useLogMountUnmount } from '../../utils/debugMounts';
import { useSafeLoaderTimeout } from '../../hooks/useSafeLoaderTimeout';
import { Loader2 } from 'lucide-react';

// Dashboard Pages
import CustomerOverview from '../customer/CustomerOverview';
import CustomerOrders from '../customer/CustomerOrders';
import CustomerAddresses from '../customer/CustomerAddresses';
import CustomerFavorites from '../customer/CustomerFavorites';
import CustomerReviews from '../customer/CustomerReviews';
import CustomerMessages from '../customer/CustomerMessages';
import CustomerReferrals from '../customer/CustomerReferrals';
import CustomerPeps from '../customer/CustomerPeps';
import CustomerSettings from '../customer/CustomerSettings';

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full">
      <h2 className="text-xl font-semibold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
      >
        Try again
      </button>
    </div>
  </div>
);

const CustomerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useMinimalAuth();
  const { safeLoading } = useSafeLoaderTimeout(authLoading, 10000);
  
  // Log component lifecycle in development
  useLogMountUnmount('CustomerDashboard');

  useEffect(() => {
    // Check if user is authenticated
    if (!user && !safeLoading && !location.pathname.startsWith('/auth')) {
      navigate('/auth', { replace: true });
    }
  }, [user, safeLoading, navigate, location.pathname]);

  // Redirect to dashboard if at the root customer path
  if (location.pathname === '/customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  // Show loading state while auth status is being determined
  if (safeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-yellow-500" />
      </div>
    );
  }

  // If no user and not loading, redirect to auth
  if (!user && !safeLoading) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardLayout>
        <Routes>
          <Route path="dashboard" element={<CustomerOverview />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="addresses" element={<CustomerAddresses />} />
          <Route path="favorites" element={<CustomerFavorites />} />
          <Route path="reviews" element={<CustomerReviews />} />
          <Route path="messages" element={<CustomerMessages />} />
          <Route path="referrals" element={<CustomerReferrals />} />
          <Route path="peps" element={<CustomerPeps />} />
          <Route path="settings" element={<CustomerSettings />} />
          <Route path="*" element={<Navigate to="/customer/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default CustomerDashboard;