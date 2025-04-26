import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

const VendorDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Products</h2>
          <p className="text-gray-600">Manage your product listings</p>
          <Link to="products" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            Manage Products →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Orders</h2>
          <p className="text-gray-600">View and manage customer orders</p>
          <Link to="orders" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Orders →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Analytics</h2>
          <p className="text-gray-600">View your sales and performance</p>
          <Link to="analytics" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Analytics →
          </Link>
        </div>
      </div>
      <Routes>
        <Route path="products" element={<div>Products Management Page</div>} />
        <Route path="orders" element={<div>Orders Management Page</div>} />
        <Route path="analytics" element={<div>Analytics Page</div>} />
      </Routes>
    </div>
  );
};

export default VendorDashboard;