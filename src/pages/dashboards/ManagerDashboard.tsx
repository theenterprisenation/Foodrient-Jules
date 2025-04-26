import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

const ManagerDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Manager Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Vendors</h2>
          <p className="text-gray-600">Manage vendor relationships</p>
          <Link to="vendors" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            Manage Vendors →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Performance</h2>
          <p className="text-gray-600">Track vendor performance</p>
          <Link to="performance" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Performance →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Reports</h2>
          <p className="text-gray-600">Generate and view reports</p>
          <Link to="reports" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Reports →
          </Link>
        </div>
      </div>
      <Routes>
        <Route path="vendors" element={<div>Vendor Management Page</div>} />
        <Route path="performance" element={<div>Performance Tracking Page</div>} />
        <Route path="reports" element={<div>Reports Page</div>} />
      </Routes>
    </div>
  );
};

export default ManagerDashboard;