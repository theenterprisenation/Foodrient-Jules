import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { ErrorBoundary } from 'react-error-boundary';
import { useMinimalAuth } from '../../hooks/useMinimalAuth';
import { useLogMountUnmount } from '../../utils/debugMounts';
import { useSafeLoaderTimeout } from '../../hooks/useSafeLoaderTimeout';

// Dashboard Pages
import ManagerOverview from '../manager/ManagerOverview';
import ManagerVendors from '../manager/ManagerVendors';
import ManagerCommissions from '../manager/ManagerCommissions';
import ManagerPeps from '../manager/ManagerPeps';
import ManagerMessaging from '../manager/ManagerMessaging';
import ManagerSettings from '../manager/ManagerSettings';

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

const ManagerDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useMinimalAuth();
  const { safeLoading } = useSafeLoaderTimeout(authLoading, 10000);
  
  // Log component lifecycle in development
  useLogMountUnmount('ManagerDashboard');

  useEffect(() => {
    // Check if user is authenticated
    if (!user && !safeLoading && location.pathname !== '/auth') {
      navigate('/auth');
    }
  }, [user, safeLoading, navigate, location.pathname]);

  // Redirect to dashboard if at the root manager path
  if (location.pathname === '/manager') {
    return <Navigate to="/manager/dashboard" replace />;
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
          <Route path="dashboard" element={<ManagerOverview />} />
          <Route path="vendors" element={<ManagerVendors />} />
          <Route path="commissions" element={<ManagerCommissions />} />
          <Route path="peps" element={<ManagerPeps />} />
          <Route path="messages" element={<ManagerMessaging />} />
          <Route path="settings" element={<ManagerSettings />} />
          <Route path="*" element={<Navigate to="/manager/dashboard" replace />} />
        </Routes>
      </DashboardLayout>
    </ErrorBoundary>
  );
};

export default ManagerDashboard;