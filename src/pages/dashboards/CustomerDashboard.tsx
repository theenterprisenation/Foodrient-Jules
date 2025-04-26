import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';

// Dashboard Pages
const DashboardHome = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
    {/* Add dashboard content */}
  </div>
);

const Messages = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Messages</h1>
    {/* Add messages content */}
  </div>
);

const Products = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Products</h1>
    {/* Add products content */}
  </div>
);

const Orders = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Orders</h1>
    {/* Add orders content */}
  </div>
);

const Customers = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Customers</h1>
    {/* Add customers content */}
  </div>
);

const Analytics = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Analytics</h1>
    {/* Add analytics content */}
  </div>
);

const CustomerDashboard = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="dashboard" element={<DashboardHome />} />
        <Route path="messages" element={<Messages />} />
        <Route path="products" element={<Products />} />
        <Route path="orders" element={<Orders />} />
        <Route path="customers" element={<Customers />} />
        <Route path="analytics" element={<Analytics />} />
      </Routes>
    </DashboardLayout>
  );
};

export default CustomerDashboard;