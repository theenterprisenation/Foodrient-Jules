import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

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

const ChiefDashboard = () => {
  const location = useLocation();
  
  // Redirect to overview if at the root chief path
  if (location.pathname === '/chief') {
    return <Navigate to="/chief/overview" replace />;
  }

  return (
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
  );
};

export default ChiefDashboard;