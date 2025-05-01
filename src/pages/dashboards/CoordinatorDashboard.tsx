import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

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

const CoordinatorDashboard = () => {
  const location = useLocation();
  
  // Redirect to dashboard if at the root coordinator path
  if (location.pathname === '/coordinator') {
    return <Navigate to="/coordinator/dashboard" replace />;
  }

  return (
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
        <Route path="analytics" element={<CoordinatorAnalytics />} />
        <Route path="settings" element={<CoordinatorSettings />} />
        <Route path="*" element={<Navigate to="/coordinator/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default CoordinatorDashboard;