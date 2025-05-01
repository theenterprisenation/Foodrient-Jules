import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

// Dashboard Pages
import VendorOverview from '../vendor/VendorOverview';
import VendorProducts from '../vendor/VendorProducts';
import VendorOrders from '../vendor/VendorOrders';
import VendorPayments from '../vendor/VendorPayments';
import VendorDelivery from '../vendor/VendorDelivery';
import VendorReviews from '../vendor/VendorReviews';
import VendorPeps from '../vendor/VendorPeps';
import VendorMessaging from '../vendor/VendorMessaging';
import VendorSettings from '../vendor/VendorSettings';

const VendorDashboard = () => {
  const location = useLocation();
  
  // Redirect to dashboard if at the root vendor path
  if (location.pathname === '/vendor') {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route path="dashboard" element={<VendorOverview />} />
        <Route path="products" element={<VendorProducts />} />
        <Route path="orders" element={<VendorOrders />} />
        <Route path="payments" element={<VendorPayments />} />
        <Route path="delivery" element={<VendorDelivery />} />
        <Route path="reviews" element={<VendorReviews />} />
        <Route path="peps" element={<VendorPeps />} />
        <Route path="messages" element={<VendorMessaging />} />
        <Route path="settings" element={<VendorSettings />} />
        <Route path="*" element={<Navigate to="/vendor/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  );
};

export default VendorDashboard;