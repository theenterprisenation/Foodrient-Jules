import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AlertCircle, CheckCircle, Users, Settings, BarChart } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
}

const ChiefDashboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('customer');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch email addresses from auth.users
      const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) throw usersError;

      // Combine profile and user data
      const combinedData = profiles?.map(profile => ({
        ...profile,
        email: users.users.find(u => u.id === profile.id)?.email || 'N/A'
      }));

      setUsers(combinedData || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Please select a user and role');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', selectedUser);

      if (error) throw error;

      setSuccessMessage('Role updated successfully');
      fetchUsers(); // Refresh user list
      setSelectedUser(null);
      setSelectedRole('customer');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error('Error updating role:', error);
      setError(error.message);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Chief Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Users className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold">Staff Management</h2>
          </div>
          <p className="text-gray-600">Manage roles and permissions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <BarChart className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold">Analytics</h2>
          </div>
          <p className="text-gray-600">Platform performance metrics</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Settings className="h-6 w-6 text-yellow-500 mr-2" />
            <h2 className="text-xl font-semibold">Settings</h2>
          </div>
          <p className="text-gray-600">System configuration</p>
        </div>
      </div>

      {/* Role Management Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-bold mb-6">Role Management</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
            <AlertCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select User
            </label>
            <select
              value={selectedUser || ''}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Role
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500"
            >
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
              <option value="manager">Manager</option>
              <option value="coordinator">Coordinator</option>
              <option value="chief">Chief</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleRoleChange}
          disabled={!selectedUser || !selectedRole}
          className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update Role
        </button>

        {/* User List */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">User List</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.full_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === 'chief' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'coordinator' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'manager' ? 'bg-green-100 text-green-800' :
                        user.role === 'vendor' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Routes>
        <Route path="overview" element={<div>Platform Overview Page</div>} />
        <Route path="staff" element={<div>Staff Management Page</div>} />
        <Route path="settings" element={<div>Platform Settings Page</div>} />
      </Routes>
    </div>
  );
};

export default ChiefDashboard;