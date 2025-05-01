import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

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

const CustomerDashboard = () => {
  const location = useLocation();
  
  // Redirect to dashboard if at the root customer path
  if (location.pathname === '/customer') {
    return <Navigate to="/customer/dashboard" replace />;
  }

  return (
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
  );
};

export default CustomerDashboard;