import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

// Dashboard Pages
import ManagerOverview from '../manager/ManagerOverview';
import ManagerVendors from '../manager/ManagerVendors';
import ManagerCommissions from '../manager/ManagerCommissions';
import ManagerPeps from '../manager/ManagerPeps';
import ManagerMessaging from '../manager/ManagerMessaging';
import ManagerSettings from '../manager/ManagerSettings';

const ManagerDashboard = () => {
  const location = useLocation();
  
  // Redirect to dashboard if at the root manager path
  if (location.pathname === '/manager') {
    return <Navigate to="/manager/dashboard" replace />;
  }

  return (
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
  );
};

export default ManagerDashboard;