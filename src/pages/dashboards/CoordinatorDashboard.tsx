import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';

const CoordinatorDashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Coordinator Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Managers</h2>
          <p className="text-gray-600">Oversee manager activities</p>
          <Link to="managers" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Managers →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Analytics</h2>
          <p className="text-gray-600">Regional performance metrics</p>
          <Link to="analytics" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Analytics →
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Reports</h2>
          <p className="text-gray-600">Generate coordinator reports</p>
          <Link to="reports" className="text-yellow-600 hover:text-yellow-700 mt-4 inline-block">
            View Reports →
          </Link>
        </div>
      </div>
      <Routes>
        <Route path="managers" element={<div>Manager Overview Page</div>} />
        <Route path="analytics" element={<div>Analytics Page</div>} />
        <Route path="reports" element={<div>Reports Page</div>} />
      </Routes>
    </div>
  );
};

export default CoordinatorDashboard;