import React, { useState, useEffect } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import { supabase, isAdminUser } from '../../lib/supabase';
import { checkAuthEndpointHealth } from '../../lib/serverCheck';
import { NetworkMonitor } from '../../utils/networkMonitor';
import { AlertCircle, CheckCircle, Users, Settings, BarChart, WifiOff } from 'lucide-react';

// Default timeout and retry configuration
const DEFAULT_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 5000]; // Progressive retry delays

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

  // State for network status
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    fetchUsers();
    checkAdminAccess();
    
    // Set up network status listener
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Initial check
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkAdminAccess = async () => {
    const isAdmin = await isAdminUser();
    if (!isAdmin) {
      setError('You do not have permission to access this page');
    }
  };

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Check network connectivity first
      const networkMonitor = NetworkMonitor.getInstance();
      if (!networkMonitor.isOnline()) {
        setIsOnline(false);
        throw new Error('No internet connection. Please check your network and try again.');
      }
      
      // Check server health
      const health = await checkAuthEndpointHealth();
      if (!health.healthy) {
        throw new Error(`Server is currently experiencing issues. Please try again later. (${health.error})`);
      }

      // Fetch profiles with retry mechanism
      let profiles = null;
      let profilesError = null;
      let attempt = 0;
      
      while (attempt <= MAX_RETRIES && !profiles) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, role, full_name')
            .order('created_at', { ascending: false });
          
          if (error) throw error;
          profiles = data;
          break;
        } catch (error) {
          profilesError = error;
          attempt++;
          
          if (attempt <= MAX_RETRIES) {
            console.log(`Fetch profiles attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
          }
        }
      }
      
      if (profilesError && !profiles) throw profilesError;
      
      // Fetch user emails with retry mechanism
      let users = null;
      let usersError = null;
      attempt = 0;
      
      while (attempt <= MAX_RETRIES && !users) {
        try {
          // Get the session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session');
          
          // Create an abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
          
          // Call the admin-auth function
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action: 'listUsers', params: {} }),
            signal: controller.signal,
            mode: 'cors',
            credentials: 'include'
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          
          users = await response.json();
          break;
        } catch (error) {
          usersError = error;
          attempt++;
          
          if (attempt <= MAX_RETRIES) {
            console.log(`Fetch users attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
          }
        }
      }
      
      if (usersError && !users) throw usersError;
      
      // Combine the data
      const combinedData = profiles.map((profile) => ({
        ...profile,
        email: users?.users?.find(u => u.id === profile.id)?.email || 'N/A'
      }));

      setUsers(combinedData || []);
    } catch (error: any) {
      console.error('Error fetching users:', error.message || error);
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
    
    // Check network connectivity
    const networkMonitor = NetworkMonitor.getInstance();
    if (!networkMonitor.isOnline()) {
      setError('No internet connection. Please check your network and try again.');
      return;
    }

    try {
      // Implement retry mechanism
      let result = null;
      let resultError = null;
      let attempt = 0;
      
      while (attempt <= MAX_RETRIES && !result) {
        try {
          // Get the session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error('No active session');
          
          // Create an abort controller for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);
          
          // Call the admin-auth function
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-auth`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session?.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              action: 'updateUserRole', 
              params: { userId: selectedUser, role: selectedRole } 
            }),
            signal: controller.signal
          });
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
          
          result = await response.json();
          break;
        } catch (error) {
          resultError = error;
          attempt++;
          
          if (attempt <= MAX_RETRIES) {
            console.log(`Update role attempt ${attempt} failed, retrying in ${RETRY_DELAYS[attempt-1]}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt-1]));
          }
        }
      }
      
      if (resultError && !result) throw resultError;

      // Update profile in database
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', selectedUser);
        
      if (error) throw new Error(error.message);

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
      setError(error.message || 'Failed to update user role. Please try again.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Chief Dashboard</h1>

      {/* Network Status Alert */}
      {!isOnline && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center text-red-800">
          <WifiOff className="h-5 w-5 mr-2" />
          <p>You are currently offline. Some features may not be available.</p>
        </div>
      )}

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