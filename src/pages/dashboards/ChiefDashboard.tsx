import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ErrorBoundary } from 'react-error-boundary';
import { useMinimalAuth } from '../../hooks/useMinimalAuth';
import { useLogMountUnmount } from '../../utils/debugMounts';
import { useSafeLoaderTimeout } from '../../hooks/useSafeLoaderTimeout';

// Dashboard Pages
import ChiefOverview from '../chief/ChiefOverview';
import ChiefManagers from '../chief/ChiefManagers';
import ChiefBlog from '../chief/ChiefBlog';
import ChiefAdverts from '../chief/ChiefAdverts';
import ChiefVendorAssignment from '../chief/ChiefVendorAssignment';
import ChiefVendorManagement from '../chief/ChiefVendorManagement';
import ChiefPeps from '../chief/ChiefPeps';
import ChiefMessaging from '../chief/ChiefMessaging';
import ChiefAnalytics from '../chief/ChiefAnalytics';
import ChiefSettings from '../chief/ChiefSettings';
import ChiefPayments from '../chief/ChiefPayments';
import ChiefProducts from '../chief/ChiefProducts';
import ChiefDelivery from '../chief/ChiefDelivery';
import ChiefReviews from '../chief/ChiefReviews';

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

const ChiefDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useMinimalAuth();
  const { safeLoading } = useSafeLoaderTimeout(authLoading, 10000);
  
  // Log component lifecycle in development
  useLogMountUnmount('ChiefDashboard');

  useEffect(() => {
    // Check if user is authenticated
    if (!user && !safeLoading && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, safeLoading, navigate, location.pathname]);

  // Redirect to overview if at the root chief path
  if (location.pathname === '/chief') {
    return <Navigate to="/chief/overview" replace />;
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
          <Route path="overview" element={<ChiefOverview />} />
          <Route path="managers" element={<ChiefManagers />} />
          <Route path="blog" element={<ChiefBlog />} />
          <Route path="adverts" element={<ChiefAdverts />} />
          <Route path="vendor-assignment" element={<ChiefVendorAssignment />} />
          <Route path="vendor-management" element={<ChiefVendorManagement />} />
          <Route path="peps" element={<ChiefPeps />} />
          <Route path="messaging" element={<ChiefMessaging />} />
          <Route path="payments" element={<ChiefPayments />} />
          <Route path="products" element={<ChiefProducts />} />
          <Route path="delivery" element={<ChiefDelivery />} />
          <Route path="reviews" element={<ChiefReviews />} />
          <Route path="analytics" element={<ChiefAnalytics />} />
          <Route path="settings" element={<ChiefSettings />} />
          <Route path="*" element={<Navigate to="/chief/overview" replace />} />
        </Routes>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default ChiefDashboard;