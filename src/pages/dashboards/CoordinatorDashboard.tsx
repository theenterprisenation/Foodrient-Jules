import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ErrorBoundary } from 'react-error-boundary';
import { useMinimalAuth } from '../../hooks/useMinimalAuth';
import { useLogMountUnmount } from '../../utils/debugMounts';
import { useSafeLoaderTimeout } from '../../hooks/useSafeLoaderTimeout';

// Dashboard Pages
import CoordinatorOverview from '../coordinator/CoordinatorOverview';
import CoordinatorManagers from '../coordinator/CoordinatorManagers';
import CoordinatorVendors from '../coordinator/CoordinatorVendors';
import CoordinatorMessaging from '../coordinator/CoordinatorMessaging';
import CoordinatorAnalytics from '../coordinator/CoordinatorAnalytics';
import CoordinatorSettings from '../coordinator/CoordinatorSettings';
import CoordinatorPayments from '../coordinator/CoordinatorPayments';
import CoordinatorProducts from '../coordinator/CoordinatorProducts';
import CoordinatorDelivery from '../coordinator/CoordinatorDelivery';
import CoordinatorReviews from '../coordinator/CoordinatorReviews';
import CoordinatorPeps from '../coordinator/CoordinatorPeps';

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

const CoordinatorDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useMinimalAuth();
  const { safeLoading } = useSafeLoaderTimeout(authLoading, 10000);
  
  // Log component lifecycle in development
  useLogMountUnmount('CoordinatorDashboard');

  useEffect(() => {
    // Check if user is authenticated
    if (!user && !safeLoading && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, safeLoading, navigate, location.pathname]);

  // Redirect to dashboard if at the root coordinator path
  if (location.pathname === '/coordinator') {
    return <Navigate to="/coordinator/dashboard" replace />;
  }

  // If still loading, show nothing
  if (safeLoading) {
    return null;
  }

  // If no user and not loading, don't render the dashboard
  if (!user && !safeLoading) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <DashboardLayout>
        <Routes>
          <Route path="dashboard" element={<CoordinatorOverview />} />
          <Route path="managers" element={<CoordinatorManagers />} />
          <Route path="vendors" element={<CoordinatorVendors />} />
          <Route path="messages" element={<CoordinatorMessaging />} />
          <Route path="payments" element={<CoordinatorPayments />} />
          <Route path="products" element={<CoordinatorProducts />} />
          <Route path="delivery" element={<CoordinatorDelivery />} />
          <Route path="reviews" element={<CoordinatorReviews />} />
          <Route path="peps" element={<CoordinatorPeps />} />
          <Route path="analytics" element={<CoordinatorAnalytics />} />
          <Route path="settings" element={<CoordinatorSettings />} />
          <Route path="peps" element={<CoordinatorPeps />} />
          <Route path="*" element={<Navigate to="/coordinator/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default CoordinatorDashboard;